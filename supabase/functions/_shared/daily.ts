import { env, provider } from "./http.ts";
export const daily = (path: string, body?: unknown) =>
  provider(`https://api.daily.co/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${env("DAILY_API_KEY")}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
export async function ensureRoom(id: string, exp: number) {
  const name = `class-${id}`;
  const url = `https://api.daily.co/v1/rooms/${name}`;
  const found = await fetch(url, {
    headers: { Authorization: `Bearer ${env("DAILY_API_KEY")}` },
  });
  if (found.ok) return found.json();
  if (found.status !== 404)
    throw new Error("Live provider is temporarily unavailable");
  try {
    return await daily("rooms", {
      name,
      privacy: "private",
      properties: {
        exp,
        enable_prejoin_ui: true,
        enable_knocking: false,
        eject_at_room_exp: true,
      },
    });
  } catch {
    const room = await fetch(url, {
      headers: { Authorization: `Bearer ${env("DAILY_API_KEY")}` },
    });
    if (!room.ok)
      throw new Error("Unable to create the live classroom. Please retry.");
    return room.json();
  }
}
