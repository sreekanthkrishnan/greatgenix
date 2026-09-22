import { env, serviceClient } from "../_shared/http.ts";
import { validSignature } from "../_shared/signature.ts";
Deno.serve(async (request) => {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  try {
    const raw = await request.text();
    if (
      !(await validSignature(
        raw,
        request.headers.get("mux-signature") || "",
        env("MUX_WEBHOOK_SECRET"),
      ))
    )
      return new Response("Invalid signature", { status: 401 });
    const event = JSON.parse(raw);
    if (
      typeof event.id !== "string" ||
      typeof event.type !== "string" ||
      !event.data
    )
      return new Response("Invalid event", { status: 400 });
    const { error } = await serviceClient().rpc("media_webhook_apply", {
      p_event: event.id,
      p_type: event.type,
      p_data: event.data,
    });
    if (error) return new Response("Retry delivery", { status: 503 });
    return new Response("ok");
  } catch {
    return new Response("Webhook unavailable", { status: 503 });
  }
});
