import { expect, test } from "vitest";
import { foreground } from "./branding";
import { validSignature } from "../../../supabase/functions/_shared/signature";
test("brand foreground chooses readable text", () => {
  expect(foreground("#ffffff")).toBe("#152019");
  expect(foreground("#000000")).toBe("#ffffff");
});
test("webhook rejects tampering and replay outside five-minute window", async () => {
  const now = Date.now();
  const t = String(Math.floor(now / 1000));
  const body = '{"id":"event"}';
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Array.from(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${t}.${body}`),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  expect(
    await validSignature(body, `t=${t},v1=${signature}`, "secret", now),
  ).toBe(true);
  expect(
    await validSignature(body + " ", `t=${t},v1=${signature}`, "secret", now),
  ).toBe(false);
  expect(
    await validSignature(
      body,
      `t=${t},v1=${signature}`,
      "secret",
      now + 301000,
    ),
  ).toBe(false);
});
