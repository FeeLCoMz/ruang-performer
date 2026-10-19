/**
 * Crypto helpers that work on Node (Vercel, local Express, Jest) and on the
 * Cloudflare Workers runtime.
 *
 * Node exposes `crypto.randomUUID` / `crypto.getRandomValues` as globals.
 * Workers do not, so we fall back to Web Crypto (`globalThis.crypto`) which is
 * available on both runtimes. The fallback is only used for the random id
 * helpers; hashing/HMAC stay in the `node:crypto` modules that the Worker
 * runtime polyfills through `nodejs_compat`.
 */

function webCrypto() {
  const seen = globalThis.crypto;
  if (seen && typeof seen.getRandomValues === 'function') return seen;
  return null;
}

function randomBytesFallback(size) {
  const seen = webCrypto();
  if (seen) {
    const bytes = new Uint8Array(size);
    seen.getRandomValues(bytes);
    return bytes;
  }
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

/** RFC 4122 v4 uuid without relying on `node:crypto`. */
export function uuid() {
  try {
    const native = webCrypto();
    if (native && typeof native.randomUUID === 'function') return native.randomUUID();
  } catch {
    // fall through to the manual implementation
  }
  const bytes = randomBytesFallback(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Hex string of `size` random bytes. */
export function randomHex(size = 32) {
  return Array.from(randomBytesFallback(size), (b) => b.toString(16).padStart(2, '0')).join('');
}
