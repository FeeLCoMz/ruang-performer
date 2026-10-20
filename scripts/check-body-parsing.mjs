/**
 * Regresi: body request di Vercel bisa berupa STRING JSON, bukan objek.
 * Sebelum perbaikan, /api/ai/song-search menjawab 400 "Title required".
 *
 * Jalankan: node scripts/check-body-parsing.mjs
 */
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

async function call({ url, method = 'POST', body, headers = {} }) {
  const req = {
    method,
    url,
    originalUrl: url,
    headers,
    query: {},
    body,
    // Stream fallback: tidak dipakai bila body sudah ada.
    on() {},
  };
  const res = {
    headersSent: false,
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; this.headersSent = true; return this; },
    end() { this.headersSent = true; return this; },
  };
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload, reqBody: req.body };
}

// 1. Body string JSON (perilaku Vercel) → harus di-parse menjadi objek.
{
  const result = await call({
    url: '/api/ai/recommend-setlist',
    body: JSON.stringify({ genre: 'pop', mood: 'happy', numSongs: 3 }),
  });
  assert(typeof result.reqBody === 'object' && result.reqBody !== null, 'body string di-parse jadi objek');
  assert(result.reqBody.genre === 'pop', 'field genre terbaca');
  assert(result.status !== 400, `tidak 400 (dapat ${result.status})`);
}

// 2. Body objek (perilaku Express) → dibiarkan.
{
  const result = await call({
    url: '/api/ai/recommend-setlist',
    body: { genre: 'rock', mood: 'energetic' },
  });
  assert(result.reqBody.genre === 'rock', 'body objek tetap utuh');
  assert(result.status !== 400, `tidak 400 (dapat ${result.status})`);
}

// 3. Body string tidak valid → 400 yang jelas (bukan crash).
{
  const result = await call({
    url: '/api/ai/recommend-setlist',
    body: '{bukan json',
  });
  assert(result.status === 400, 'JSON rusak → 400');
}

// 4. Body kosong → dianggap {}.
{
  const result = await call({
    url: '/api/ai/recommend-setlist',
    body: '',
  });
  assert(typeof result.reqBody === 'object', 'body kosong → objek kosong');
}

// 5. song-search dengan title dari body string mencapai handler.
{
  const result = await call({
    url: '/api/ai/song-search',
    body: JSON.stringify({ title: 'Imagine', artist: 'John Lennon' }),
  });
  // Bisa 200/500 (tanpa API key), tetapi bukan 400 "Title required".
  assert(result.status !== 400, `song-search tidak 400 (dapat ${result.status})`);
}

console.log(process.exitCode ? '\nBODY PARSING CHECK FAILED' : '\nBODY PARSING CHECK OK');
process.exit(process.exitCode || 0);
