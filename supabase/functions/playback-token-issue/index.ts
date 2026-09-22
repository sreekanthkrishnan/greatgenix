import { importPKCS8, SignJWT } from "npm:jose@6";
import { access, env, handler } from "../_shared/http.ts";
handler(async (request) => {
  const { lessonId } = await request.json();
  const { data } = await access(request, lessonId, "playback");
  if (!data.playbackId) throw new Error("Video is not ready for playback");
  const expires = Math.floor(Date.now() / 1000) + 300;
  const pem = atob(env("MUX_SIGNING_PRIVATE_KEY"));
  const key = await importPKCS8(pem, "RS256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: env("MUX_SIGNING_KEY_ID") })
    .setSubject(data.playbackId)
    .setAudience("v")
    .setExpirationTime(expires)
    .sign(key);
  return {
    url: `https://stream.mux.com/${data.playbackId}.m3u8?token=${token}`,
    expiresAt: new Date(expires * 1000).toISOString(),
  };
});
