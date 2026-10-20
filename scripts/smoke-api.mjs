/**
 * Smoke test struktur API (1 function: api/[...path].js).
 *
 *   node scripts/smoke-api.mjs
 *
 * Memeriksa:
 *  - semua handler bisa di-import (tidak ada import path yang rusak),
 *  - endpoint publik (login/register) TIDAK diblokir verifyToken,
 *  - endpoint lain menolak request tanpa token.
 * Tidak butuh kredensial: login dengan email fiktif boleh gagal koneksi DB,
 * yang penting bukan lagi "No authorization token provided".
 */
import assert from 'assert';

// Mode produksi supaya gate token aktif seperti di Vercel.
process.env.NODE_ENV = 'production';

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
  '../server/handlers/users.js',
  '../server/handlers/user-id.js',
  '../server/handlers/user-reset-password.js',
  '../server/handlers/tools.js',
];

for (const spec of handlers) {
  // eslint-disable-next-line no-await-in-loop
  const mod = await import(spec);
  assert.equal(typeof mod.default, 'function', `${spec} tidak punya default handler`);
}
console.log(`ok: ${handlers.length} handler ter-import`);

const { default: handler } = await import('../api/[...path].js');

async function probe(method, url, body) {
  const req = { method, url, originalUrl: url, headers: {}, query: {}, body };
  const res = {
    headersSent: false,
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  await handler(req, res);
  return { status: res.code, payload: res.payload };
}

// Endpoint publik: harus sampai ke handler, BUKAN diblokir token.
for (const [method, url, body] of [
  ['POST', '/api/auth/login', { email: 'nobody@example.com', password: 'x' }],
  ['POST', '/api/auth/register', {}],
]) {
  // eslint-disable-next-line no-await-in-loop
  const { status, payload } = await probe(method, url, body);
  assert.notEqual(
    payload?.error,
    'No authorization token provided',
    `${method} ${url} masih diblokir verifyToken`,
  );
  assert.ok([400, 401, 500, 503].includes(status), `${method} ${url} status tak terduga: ${status}`);
  console.log(`ok: ${method} ${url} → ${status} (publik, tidak diblokir token)`);
}

// Endpoint terproteksi: wajib 401 tanpa token.
for (const [method, url, body] of [
  ['GET', '/api/songs', undefined],
  ['POST', '/api/songs/bulk', { songs: [] }],
  ['GET', '/api/auth/me', undefined],
  ['GET', '/api/bands', undefined],
  ['GET', '/api/users', undefined],
]) {
  // eslint-disable-next-line no-await-in-loop
  const { status, payload } = await probe(method, url, body);
  assert.equal(status, 401, `${method} ${url} harus 401, dapat ${status}`);
  assert.equal(payload?.error, 'No authorization token provided');
  console.log(`ok: ${method} ${url} → 401 (auth gate)`);
}

console.log('SMOKE OK');
// Koneksi DB yang gagal bisa menahan event loop; keluar eksplisit.
process.exit(0);
