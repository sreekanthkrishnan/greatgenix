export async function validSignature(
  raw: string,
  header: string,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const parts = header.split(",").map((s) => s.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const candidates = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  for (const hex of candidates) {
    if (!/^[a-f0-9]{64}$/i.test(hex)) continue;
    const signature = new Uint8Array(
      hex.match(/../g)!.map((v) => parseInt(v, 16)),
    );
    if (
      await crypto.subtle.verify(
        "HMAC",
        key,
        signature,
        new TextEncoder().encode(`${timestamp}.${raw}`),
      )
    )
      return true;
  }
  return false;
}
