# Deployment: Vercel & Cloudflare

Aplikasi ini dirancang untuk berjalan di **dua platform sekaligus** tanpa menduplikasi logika bisnis.

```
                     ┌───────────────────────────┐
                     │  api/_core/router.js       │  ← tabel route tunggal
                     │  api/_core/ctx.js          │  ← jembatan (req,res) ↔ Web Request
                     │  api/_core/env.js          │  ← env per-request (Node/CF)
                     │  api/**/*.js (handlers)    │  ← logika bisnis (tidak berubah)
                     └────────────┬──────────────┘
                                  │
            ┌─────────────────────┴──────────────────────┐
            │                                            │
   api/index.js (Express)                    cloudflare/worker.js
   → Vercel / lokal                          → Workers + static assets
                                             cloudflare/pages-[[path]].js
                                             → Pages Functions (alternatif)
```

Prinsipnya: **handler tetap berformat Vercel** `(req, res)`, dan setiap platform cukup menyediakan adapter.

## 1. Vercel (kondisi saat ini)

Tidak ada perubahan pada alur deploy: `vercel.json` + folder `api/` + `dist/`.

| Variabel (Project → Settings → Environment Variables) | Keterangan |
| --- | --- |
| `TURSO_DATABASE_URL` | URL libSQL/Turso |
| `TURSO_AUTH_TOKEN` | Secret token Turso |
| `JWT_SECRET` | **wajib** diganti di produksi |
| `GEMINI_API_KEY` | fitur AI |
| `VITE_YOUTUBE_API_KEY` | pencarian YouTube (boleh juga `YOUTUBE_API_KEY`) |
| `APP_URL` | URL publik (link reset password) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | email reset password |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` | email undangan band (alias lama, tetap didukung) |

> Variabel sisi klien harus berawalan `VITE_` agar ter-inject saat `vite build`.

Perubahan perilaku kecil yang perlu diketahui: seluruh route kini didaftarkan dari
`api/_core/router.js`, jadi daftar `routes` di `vercel.json` tetap berlaku sebagai rewriting.
Handler menerima `req.query`, `req.params`, `req.path` dan `req.url` yang sama seperti sebelumnya.

## 2. Cloudflare Workers

### 2.1 Prasyarat

- Node.js 18+ dan akun Cloudflare
- `npm install` (sudah menyertakan `wrangler` + `esbuild` sebagai devDependency)

### 2.2 Build & jalankan lokal

```powershell
npm run dev:cloudflare
```

Perintah ini menjalankan `vite build`, membundel API Worker
(`scripts/build-cloudflare.mjs` → `cloudflare/.build/worker.js`), lalu `wrangler dev`.

Rahasia lokal ditaruh di `.dev.vars` (sudah di-`.gitignore`):

```ini
JWT_SECRET=dev-secret
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
GEMINI_API_KEY=...
APP_URL=http://localhost:8787
```

### 2.3 Deploy

```powershell
npx wrangler login
npx wrangler secret put JWT_SECRET
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put GEMINI_API_KEY
npm run deploy:cloudflare
```

`TURSO_DATABASE_URL`, `VITE_YOUTUBE_API_KEY`, `APP_URL`, SMTP, dll. juga bisa
disimpan sebagai **secret** (disarankan) atau plaintext di
*Dashboard → Workers → Settings → Variables and Secrets*.

### 2.4 Yang perlu diketahui

| Topik | Status di Workers |
| --- | --- |
| Runtime | `compatibility_flags = ["nodejs_compat"]` (bcryptjs, jsonwebtoken, node:crypto) |
| Database | `@libsql/client/web` (di-alias otomatis oleh build script) |
| Rate limiter | In-memory per isolate (bukan global) — sama seperti di Vercel serverless |
| SMTP (nodemailer) | **Tidak tersedia** (butuh TCP). Gunakan `MAIL_PROVIDER=resend` + `RESEND_API_KEY`, atau `postmark` + `POSTMARK_SERVER_TOKEN` |
| AI (Gemini) | Didukung (`fetch` + dynamic import `@google/generative-ai`) |
| Transkripsi audio | Didukung (multipart dibaca via `Request.formData()`) |
| Static assets | `dist/` disajikan lewat `[assets]`, SPA fallback `index.html` |
| Ukuran bundle | ± 627 KiB (gzip ± 122 KiB) — masuk batas plan gratis |

## 3. Cloudflare Pages (alternatif)

Jika ingin memakai Pages alih-alih Worker + assets:

1. Build command: `npm run build`
2. Build output: `dist`
3. Salin `cloudflare/pages-[[path]].js` menjadi `functions/[[path]].js`
   (sesuaikan path import `../api/...` → `../../api/...` jika diletakkan di root `functions/`).
4. Aktifkan **Node.js compatibility flag** pada Settings → Functions → Compatibility flags.
5. Set environment variables/secret di *Settings → Environment variables*.

## 4. Menjaga kompatibilitas dua platform

Saat menambah endpoint baru:

1. Tambahkan entri di `api/_core/router.js` (`pattern`, `handler`, `auth`).
   Itu otomatis berlaku di Express/Vercel **dan** Worker.
2. Di handler:
   - baca env dengan `getReqEnv(req, 'NAMA')` — **jangan** `process.env.NAMA`;
   - baca body dengan `readJson(req)` dari `api/_core/body.js`;
   - buat id dengan `uuid()` dari `api/_core/crypto.js`;
   - gunakan `fetch` untuk HTTP keluar (bukan `http`/`https` Node).
3. Jalankan verifikasi:

```powershell
npm run lint
npm run test:api
npm run test:unit
npm run test:cloudflare
npm run build:cloudflare
```

`npm run test:cloudflare` menguji adapter tanpa kredensial: routing, 404 JSON,
pembacaan body/env per-request, dan `verifyToken`.
