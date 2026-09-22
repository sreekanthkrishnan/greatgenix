import {
  access,
  env,
  handler,
  provider,
  serviceClient,
} from "../_shared/http.ts";
handler(async (request) => {
  const { lessonId } = await request.json();
  const { data } = await access(request, lessonId, "upload");
  const auth = {
    Authorization: `Basic ${btoa(`${env("MUX_TOKEN_ID")}:${env("MUX_TOKEN_SECRET")}`)}`,
    "Content-Type": "application/json",
  };
  if (data.uploadId && data.uploadUrl) {
    const existing = await provider(
      `https://api.mux.com/video/v1/uploads/${data.uploadId}`,
      { headers: auth },
    );
    if (existing.data.status === "waiting")
      return { uploadUrl: data.uploadUrl };
    if (existing.data.status === "asset_created")
      throw new Error("This video is processing. Wait for it to finish.");
  }
  const origins = env("APP_ORIGINS").split(",");
  const origin = request.headers.get("origin");
  if (!origin || !origins.includes(origin))
    throw new Error("Upload origin is not allowed");
  const result = await provider("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: {
      ...auth,
      "Idempotency-Key": `lesson-${lessonId}-${data.uploadId || "initial"}`,
    },
    body: JSON.stringify({
      cors_origin: origin,
      timeout: 3600,
      new_asset_settings: {
        playback_policies: ["signed"],
        video_quality: "basic",
        passthrough: lessonId,
      },
    }),
  });
  const { error } = await serviceClient().rpc("media_upload_saved", {
    p_lesson: lessonId,
    p_upload: result.data.id,
    p_url: result.data.url,
  });
  if (error)
    throw new Error("Upload authorization could not be saved. Please retry.");
  return { uploadUrl: result.data.url };
});
