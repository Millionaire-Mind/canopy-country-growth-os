// Uses the Web Crypto API (global `crypto`) rather than Node's `crypto` module so this
// works in both the Node.js and Edge runtimes (Next.js middleware/proxy runs on Edge).

const COOKIE_NAME = "ccgos_session";
const SESSION_VALUE = "authenticated";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.");
  return s;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string) {
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(signature);
}

export async function createSessionCookieValue() {
  const sig = await sign(SESSION_VALUE);
  return `${SESSION_VALUE}.${sig}`;
}

export async function isValidSessionCookieValue(cookieValue: string | undefined | null) {
  if (!cookieValue) return false;
  const [value, sig] = cookieValue.split(".");
  if (!value || !sig || value !== SESSION_VALUE) return false;
  const expected = await sign(value);
  return timingSafeEqualHex(sig, expected);
}

async function digestHex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
}

export async function checkPassword(candidate: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD is not set. Copy .env.example to .env.");
  // Compare digests rather than raw strings so this isn't a plain === on secret material.
  const [a, b] = await Promise.all([digestHex(candidate), digestHex(expected)]);
  return timingSafeEqualHex(a, b);
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
