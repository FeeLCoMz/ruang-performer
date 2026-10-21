/**
 * Uji fallback pencarian YouTube: bila query spesifik tidak menghasilkan
 * video, coba query yang lebih longgar sebelum menyerah.
 *
 * Jalankan: node scripts/check-ai-youtube-fallback.mjs
 */
process.env.NODE_ENV = 'test';
process.env.VITE_YOUTUBE_API_KEY = 'test-key';
delete process.env.GEMINI_API_KEY;

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

const queried = [];
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  const q = url.searchParams.get('q');
  queried.push(q);
  // Query pertama ("Judul Dasar Artis Nama") sengaja tanpa hasil;
  // hanya "Judul Dasar" persis yang punya video.
  const items = q === 'Judul Dasar' ? [{ id: { videoId: 'VID12345678' } }] : [];
  return { ok: true, status: 200, json: async () => ({ items }) };
};

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

// 1. Query lengkap gagal → fallback ke judul saja berhasil.
{
  queried.length = 0;
  const result = await search({ title: 'Judul Dasar', artist: 'Artis Nama' });
  assert(result.youtubeId === 'VID12345678', 'fallback menemukan video');
  assert(queried.length >= 2, `mencoba lebih dari satu query (${queried.length})`);
  assert(queried[0] === 'Judul Dasar Artis Nama', 'query pertama paling spesifik');
  assert(queried.includes('Judul Dasar'), 'query kedua = judul saja');
  assert(result.debug.youtubeQuery === 'Judul Dasar', 'query yang berhasil dicatat');
}

// 2. Semua gagal → youtubeId null + daftar query dicatat untuk UI.
{
  queried.length = 0;
  const result = await search({ title: 'Tidak Ada Sama Sekali', artist: 'X' });
  assert(result.youtubeId === null, 'semua gagal → null');
  assert(result.debug.youtubeResults === 0, 'youtubeResults = 0');
  assert(
    Array.isArray(result.debug.youtubeQueriesTried) && result.debug.youtubeQueriesTried.length >= 2,
    'query yang dicoba dilaporkan',
  );
}

// 3. Kurung dibuang pada percobaan terakhir.
{
  queried.length = 0;
  await search({ title: 'Lagu (Official Video)', artist: 'Artis' });
  assert(
    queried.includes('Lagu'),
    `isi kurung dibuang (dicoba: ${queried.join(' | ')})`,
  );
}

console.log(process.exitCode ? '\nYOUTUBE FALLBACK CHECK FAILED' : '\nYOUTUBE FALLBACK CHECK OK');
setTimeout(() => process.exit(process.exitCode || 0), 200);
