import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isConfigured = Boolean(url && key);
export const supabase = isConfigured
  ? createClient(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export function database() {
  if (!supabase)
    throw new Error(
      "Add your Supabase URL and public publishable key to .env.local, then restart the app.",
    );
  return supabase;
}
export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await database().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
