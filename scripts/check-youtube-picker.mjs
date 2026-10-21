/**
 * Uji endpoint /api/ai/youtube-search (modal "Cari video").
 *
 * Jalankan: node scripts/check-youtube-picker.mjs
 * (butuh VITE_YOUTUBE_API_KEY di .env.local; dilewati bila tidak ada)
 */
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const key = (env.match(/^VITE_YOUTUBE_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!key) {
  console.log('SKIP: VITE_YOUTUBE_API_KEY tidak ada di .env.local');
  process.exit(0);
}
process.env.VITE_YOUTUBE_API_KEY = key;
process.env.NODE_ENV = 'test';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

const { default: handler } = await import('../api/[...path].js');

async function call(query) {
  const req = {
    method: 'GET',
    url: `/api/ai/youtube-search${query}`,
    originalUrl: `/api/ai/youtube-search${query}`,
    headers: {},
    query: Object.fromEntries(new URLSearchParams(query.replace(/^\?/, ''))),
    on() {},
  };
  const res = {
    headersSent: false, statusCode: 200, setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; this.headersSent = true; return this; },
  };
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload || {} };
}

// 1. Pencarian normal mengembalikan beberapa video.
{
  const { status, payload } = await call('?q=Imagine%20John%20Lennon');
  assert(status === 200, `status 200 (dapat ${status})`);
  assert(Array.isArray(payload.videos) && payload.videos.length > 1, `beberapa hasil (${payload.videos?.length})`);
  const first = payload.videos?.[0] || {};
  assert(/^[\w-]{11}$/.test(String(first.videoId || '')), 'videoId valid');
  assert(!!first.title && !!first.channelTitle, 'judul & channel ada');
  assert(!!first.thumbnail, 'thumbnail ada');
}

// 2. Query kosong ditolak.
{
  const { status } = await call('?q=');
  assert(status === 400, 'query kosong → 400');
}

// 3. max dibatasi (maksimal 8).
{
  const { payload } = await call('?q=Queen&max=50');
  assert(payload.videos.length <= 8, `max dibatasi 8 (${payload.videos.length})`);
}

// 4. Hasil kedua dari cache.
{
  const { payload } = await call('?q=Imagine%20John%20Lennon');
  assert(payload.cached === true, 'pencarian berulang memakai cache');
}

console.log(process.exitCode ? '\nYOUTUBE PICKER CHECK FAILED' : '\nYOUTUBE PICKER CHECK OK');
setTimeout(() => process.exit(process.exitCode || 0), 250);
