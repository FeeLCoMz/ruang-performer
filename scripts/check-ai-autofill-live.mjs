/**
 * Reproduksi alur AI Autofill pada database SUNGGUHAN (Turso dari .env.local),
 * memastikan youtubeId terisi dan debug bersih.
 *
 * TIDAK memakai NODE_ENV=test, supaya kredensial DB asli dipakai dan
 * getTursoClient tidak mengembalikan mock.
 *
 * Jalankan: node scripts/check-ai-autofill-live.mjs
 */
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
process.env.NODE_ENV = 'production'; // bukan 'test' → client Turso asli, JWT diverifikasi
delete process.env.VITE_YOUTUBE_API_KEY_TYPO;

const jwt = (await import('jsonwebtoken')).default;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const token = jwt.sign({ userId: 'diagnostic-user', role: 'admin' }, JWT_SECRET, { expiresIn: '5m' });

const { default: handler } = await import('../api/[...path].js');

const req = {
  method: 'POST',
  url: '/api/ai/song-search',
  originalUrl: '/api/ai/song-search',
  headers: { authorization: `Bearer ${token}`, 'user-agent': 'diagnostic' },
  query: {},
  body: { title: 'Imagine', artist: 'John Lennon' },
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

const p = res.payload || {};
console.log('status       :', res.statusCode);
console.log('youtubeId    :', p.youtubeId ?? null);
console.log('artist       :', p.artist ?? null);
console.log('key          :', p.key ?? null);
console.log('tempo        :', p.tempo ?? null);
console.log('debug        :', JSON.stringify(p.debug || {}));
console.log('error        :', p.error || null);

const ok = res.statusCode === 200 && /^[\w-]{11}$/.test(String(p.youtubeId || ''));
console.log(ok ? '\nLIVE AUTOFILL OK' : '\nLIVE AUTOFILL FAILED');
process.exit(ok ? 0 : 1);
