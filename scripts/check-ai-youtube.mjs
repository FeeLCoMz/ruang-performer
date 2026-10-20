/**
 * Uji searchYoutube lewat handler sungguhan (/api/ai/song-search) dengan
 * kunci dari .env.local. Memastikan youtubeId terisi dan debug kosong saat
 * semuanya normal.
 *
 * Jalankan: node scripts/check-ai-youtube.mjs
 */
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const youtubeKey = (env.match(/^VITE_YOUTUBE_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!youtubeKey) {
  console.error('SKIP: VITE_YOUTUBE_API_KEY tidak ada di .env.local');
  process.exit(0);
}
process.env.VITE_YOUTUBE_API_KEY = youtubeKey;
delete process.env.YOUTUBE_API_KEY;
process.env.NODE_ENV = 'test'; // lewati verifikasi JWT di catch-all

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

const { default: handler } = await import('../api/[...path].js');

async function songSearch(body) {
  const req = {
    method: 'POST',
    url: '/api/ai/song-search',
    originalUrl: '/api/ai/song-search',
    headers: {},
    query: {},
    body,
    on() {},
  };
  const res = {
    headersSent: false,
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; this.headersSent = true; return this; },
  };
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload || {} };
}

// 1. Pencarian normal → youtubeId terisi.
{
  const { payload } = await songSearch({ title: 'Imagine', artist: 'John Lennon' });
  assert(/^[\w-]{11}$/.test(String(payload.youtubeId || '')), `youtubeId valid (${payload.youtubeId})`);
  assert(!payload.debug?.youtubeKeyMissing, 'kunci YouTube terbaca');
  assert(!payload.debug?.youtubeError, 'tidak ada error YouTube');
}

// 2. Artist kosong → query tetap rapi (tidak ada spasi ganda).
{
  const { payload } = await songSearch({ title: 'Bohemian Rhapsody' });
  assert(!payload.debug?.youtubeError, 'artist kosong tidak memicu error');
  assert(!!payload.youtubeId, 'artist kosong tetap menemukan video');
}

// 3. Cache: pemanggilan kedua mengembalikan hasil sama + cached=true.
{
  const { payload } = await songSearch({ title: 'Imagine', artist: 'John Lennon' });
  assert(payload.cached === true, 'hasil kedua berasal dari cache');
  assert(/^[\w-]{11}$/.test(String(payload.youtubeId || '')), 'youtubeId tetap ada di cache');
}

console.log(process.exitCode ? '\nAI YOUTUBE CHECK FAILED' : '\nAI YOUTUBE CHECK OK');
process.exit(process.exitCode || 0);
