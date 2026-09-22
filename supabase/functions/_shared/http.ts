import { createClient } from "npm:@supabase/supabase-js@2";
export function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server configuration missing: ${name}`);
  return value;
}
function headers(request: Request) {
  const allowed = (
    Deno.env.get("APP_ORIGINS") || "http://localhost:5173,http://127.0.0.1:5173"
  ).split(",");
  const origin = request.headers.get("origin") || "";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : allowed[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
export function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: headers(request),
  });
}
export function handler(fn: (request: Request) => Promise<unknown>) {
  Deno.serve(async (request) => {
    if (request.method === "OPTIONS")
      return new Response("ok", { headers: headers(request) });
    if (request.method !== "POST")
      return json(request, { error: "Method not allowed" }, 405);
    try {
      return json(request, await fn(request));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      return json(
        request,
        { error: message },
        message.startsWith("Sign in") ? 401 : 400,
      );
    }
  });
}
export async function userClient(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new Error("Sign in required");
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Sign in required");
  return { client, user: data.user };
}
export const serviceClient = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
export async function provider(url: string, init: RequestInit) {
  const result = await fetch(url, init);
  if (!result.ok)
    throw new Error(
      `Video provider request failed (${result.status}). Please try again.`,
    );
  return result.json();
}
export async function access(request: Request, id: string, operation: string) {
  const { client, user } = await userClient(request);
  const { data, error } = await client.rpc("media_access", {
    p_id: id,
    p_operation: operation,
  });
  if (error) throw new Error(error.message);
  return { data, client, user };
}
