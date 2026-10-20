/**
 * Regresi routing AI: api/ai.js memilih handler dari req.url dengan prefix
 * TANPA '/api/ai' (Express memotongnya saat mount). Catch-all Vercel meneruskan
 * URL utuh, sehingga dulu SEMUA request /api/ai/* jatuh ke handler chat dan
 * menjawab "prompt atau context diperlukan".
 *
 * Jalankan: node scripts/check-ai-routing.mjs
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

async function call({ url, method = 'POST', body = {} }) {
  const req = {
    method,
    url,
    originalUrl: url,
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
    end() { this.headersSent = true; return this; },
  };
  await handler(req, res);
  return { status: res.statusCode, payload: res.payload };
}

const isChatFallback = (result) => {
  const msg = String(result.payload?.error || result.payload?.message || '');
  return /prompt atau context/i.test(msg);
};

// 1. song-search dengan title → harus mencapai handler song-search.
{
  const result = await call({
    url: '/api/ai/song-search',
    body: { title: 'Imagine', artist: 'John Lennon' },
  });
  assert(!isChatFallback(result), 'song-search tidak jatuh ke handler chat');
  assert(result.status !== 400 || !/Title required/.test(result.payload?.error || ''), 'title terbaca oleh handler');
}

// 2. URL utuh + query string tetap membawa sub-path.
{
  const result = await call({
    url: '/api/ai/song-search?debug=1',
    body: { title: 'Imagine' },
  });
  assert(!isChatFallback(result), 'query string tidak merusak sub-path');
}

// 3. recommend-setlist tetap diarahkan dengan benar.
{
  const result = await call({
    url: '/api/ai/recommend-setlist',
    body: { genre: 'pop', numSongs: 2 },
  });
  assert(!isChatFallback(result), 'recommend-setlist tidak jatuh ke chat');
}

// 4. Path chat eksplisit memang masuk ke handler chat (bukan song-search).
//    Tanpa GEMINI_API_KEY handler berhenti dengan pesan 500 yang khas chat;
//    yang penting BUKAN dianggap sebagai song-search/recommend.
{
  const result = await call({ url: '/api/ai/chat', body: {} });
  const message = String(result.payload?.error || '');
  const looksLikeChat = /GEMINI_API_KEY|prompt atau context/i.test(message) || result.status === 405;
  assert(looksLikeChat, 'chat path masuk ke handler chat');
  assert(!/Title required/.test(message), 'chat path bukan handler song-search');
}

// 5. Endpoint usage tetap tertangani handler kuota.
{
  const result = await call({ url: '/api/ai/usage', method: 'GET' });
  assert(!isChatFallback(result), 'usage bukan handler chat');
}

console.log(process.exitCode ? '\nAI ROUTING CHECK FAILED' : '\nAI ROUTING CHECK OK');
process.exit(process.exitCode || 0);
