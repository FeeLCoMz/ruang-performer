/**
 * Smoke test untuk struktur API baru (1 function: api/[...path].js).
 *
 *   node scripts/smoke-api.mjs
 *
 * Memastikan:
 *  - semua handler bisa di-import (tidak ada import path yang rusak),
 *  - catch-all menolak request tanpa token sebelum menyentuh database,
 *  - routing mengenali prefix API yang dipakai frontend.
 * Tidak butuh kredensial atau koneksi database.
 */
import assert from 'assert';

const handlers = [
  '../server/handlers/songs.js',
  '../server/handlers/song-id.js',
  '../server/handlers/setlists.js',
  '../server/handlers/bands.js',
  '../server/handlers/band-id.js',
  '../server/handlers/band-members.js',
  '../server/handlers/events.js',
  '../server/handlers/auth-me.js',
  '../server/handlers/auth-login.js',
  '../server/handlers/auth-register.js',
  '../server/handlers/auth-change-password.js',
  '../server/handlers/auth-reset-password.js',
  '../server/handlers/auth-forgot-password.js',
  '../server/handlers/auth-delete-account.js',
  '../server/handlers/auth-audit-logs.js',
];

for (const spec of handlers) {
  // eslint-disable-next-line no-await-in-loop
  const mod = await import(spec);
  assert.equal(typeof mod.default, 'function', `${spec} tidak punya default handler`);
}
console.log(`ok: ${handlers.length} handler ter-import`);

const { default: catchAll } = await import('../api/[...path].js');

async function probe(method, url, token) {
  const req = {
    method,
    url,
    originalUrl: url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    query: {},
  };
  const result = { status: null, payload: null };
  const res = {
    headersSent: false,
    setHeader() {},
    status(code) {
      result.status = code;
      return this;
    },
    json(payload) {
      result.payload = payload;
      return this;
    },
  };
  try {
    await catchAll(req, res);
  } catch (error) {
    result.payload = { crashed: error.message };
  }
  return result;
}

for (const [method, url] of [
  ['GET', '/api/songs'],
  ['POST', '/api/songs/bulk'],
  ['GET', '/api/auth/me'],
  ['GET', '/api/bands'],
  ['GET', '/api/setlists'],
  ['GET', '/api/events/gig'],
]) {
  // eslint-disable-next-line no-await-in-loop
  const result = await probe(method, url);
  assert.equal(result.status, 401, `${method} ${url} harus 401 tanpa token, dapat ${result.status}`);
  console.log(`ok: ${method} ${url} → 401 (auth gate)`);
}

// Token rusak juga harus 401, bukan crash.
const bogus = await probe('GET', '/api/unknown', 'invalid');
assert.equal(bogus.status, 401);
console.log('ok: GET /api/unknown → 401 (token invalid)');

console.log('SMOKE OK');
