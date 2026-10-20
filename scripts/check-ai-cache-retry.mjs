/**
 * Uji skenario: pencarian pertama terjadi saat kunci YouTube belum ada
 * (mis. env belum aktif saat cold start). Hasil gagal itu tidak boleh
 * di-cache permanen — pencarian berikutnya harus mencoba YouTube lagi.
 *
 * Jalankan: node scripts/check-ai-cache-retry.mjs
 */
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const youtubeKey = (env.match(/^VITE_YOUTUBE_API_KEY=(.*)$/m) || [])[1]?.trim();
process.env.NODE_ENV = 'test';
delete process.env.VITE_YOUTUBE_API_KEY;
delete process.env.YOUTUBE_API_KEY;

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

// Gemini dimatikan supaya alur "gemini gagal" tercapai tanpa memanggil API berbayar.
delete process.env.GEMINI_API_KEY;

const { default: handler } = await import('../api/[...path].js');

async function search(body) {
  const req = {
    method: 'POST', url: '/api/ai/song-search', originalUrl: '/api/ai/song-search',
    headers: {}, query: {}, body, on() {},
  };
  const res = {
    headersSent: false, statusCode: 200, setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; this.headersSent = true; return this; },
  };
  await handler(req, res);
  return res.payload || {};
}

// 1. Tanpa kunci YouTube → youtubeId null, alasan tercatat.
const first = await search({ title: 'Bohemian Rhapsody', artist: 'Queen' });
assert(first.youtubeId === null, 'tanpa kunci: youtubeId null');
assert(first.debug?.youtubeKeyMissing === true, 'tanpa kunci: youtubeKeyMissing tercatat');

// 2. Kunci dipasang (simulasi env terpasang) → hasil harus dicoba ulang.
process.env.VITE_YOUTUBE_API_KEY = youtubeKey;
const second = await search({ title: 'Bohemian Rhapsody', artist: 'Queen' });
assert(second.cached !== true, 'hasil gagal TIDAK diambil dari cache');
assert(!second.debug?.youtubeKeyMissing, 'percobaan kedua benar-benar memanggil YouTube');
assert(
  /^[\w-]{11}$/.test(String(second.youtubeId || '')),
  `youtubeId terisi setelah kunci ada (${second.youtubeId})`,
);

console.log(process.exitCode ? '\nCACHE RETRY CHECK FAILED' : '\nCACHE RETRY CHECK OK');

// Jeda singkat agar koneksi HTTP/TCP tertutup sebelum keluar; process.exit
// langsung saat fetch baru selesai memicu assertion libuv di Windows.
setTimeout(() => process.exit(process.exitCode || 0), 300);
