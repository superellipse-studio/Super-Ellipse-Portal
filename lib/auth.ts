const COOKIE_NAME = "portal_session";

async function sign(value: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeSessionCookieValue(): Promise<string> {
  const payload = "authenticated";
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function isValidSessionCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;
  const expected = await sign(payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
