# Ruang Performer

Aplikasi manajemen band: repertoire lagu (lirik + kord), setlist, latihan, gigs/pertunjukan, dan kerja kolaboratif multi-anggota dengan kontrol akses berbasis peran.

**Versi:** 2.0.10 Â· **Lisensi:** MIT Â· **Target deploy:** Vercel (serverless functions) + Turso/libSQL

---

## Daftar Isi

- [Ringkasan](#ringkasan)
- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Arsitektur](#arsitektur)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Setup Database](#setup-database)
- [Skrip npm](#skrip-npm)
- [Struktur Proyek](#struktur-proyek)
- [Dokumentasi Lainnya](#dokumentasi-lainnya)
- [Deploy](#deploy)
- [Testing & Kualitas Kode](#testing--kualitas-kode)

---

## Ringkasan

Ruang Performer adalah aplikasi web untuk mengelola seluruh Lifecycle sebuah band: dari menyimpan repertoire lagu lengkap dengan lirik berkord, menyusun setlist untuk gigs, mencatat sesi latihan, hingga menjadwalkan pertunjukan.

Dirancang untuk usage nyata di panggung â€” ada **Performance Mode** yang menyederhanakan UI, **Lyrics Mode** untuk vokalis, dan dukungan **offline** sehingga setlist tetap bisa dibuka tanpa koneksi.

## Fitur Utama

| Area | Fitur |
| --- | --- |
| **Autentikasi** | Register, login (JWT), ubah sandi, lupa/reset sandi, hapus akun |
| **Lagu** | CRUD lagu, lirik berkord, kord kustom, time marker, multi-versi lagu, analisis kord, sheet music (MusicXML) |
| **Setlist** | CRUD setlist, urutan drag & drop, metadata per lagu, poster setlist, auto-builder & smart assistant |
| **Band** | CRUD band, anggota, peran (owner/admin/member), preferensi key per lagu |
| **Gigs** | CRUD gigs/pertunjukan, venue, tanggal, fee, setlist terkait, kalender, kalender unduh (.ics) |
| **Latihan** | Sesi latihan, statistik latihan per lagu |
| **Mastery** | Tandai lagu yang sudah dikuasai per pengguna |
| **Media** | YouTube player tersinkron dengan time marker,Floater player, trending YouTube |
| **AI** | Autofill chord/lirik via Gemini, transkripsi audio, pencarian lagu AI |
| **MIDI** | Kontrol program MIDI via Web MIDI API, virtual piano |
| **Alat** | Konversi chord (transpose), metronom & tap tempo, export PDF/PNG, backup/restore & import/export data |
| **Sistem** | Audit log, user management (owner), dark/light theme, offline cache, analytics, web vitals |

## Teknologi

**Frontend**
- React 18 + React Router 7 (SPA, client-side routing)
- Vite 5 (build, dev server, code splitting via `React.lazy` + `manualChunks`)
- Slate / Slate React â€” editor lirik rich-text
- @dnd-kit & @hello-pangea/dnd â€” drag & drop
- OpenSheetMusicDisplay â€” render sheet music MusicXML
- jsPDF, html2canvas, html-to-image â€” export poster/PDF
- qrcode.react â€” QR code pada poster
- fabric â€” kanvas editing

**Backend**
- Express 4 (server lokal) + format handler Vercel Serverless Functions
- JWT (jsonwebtoken) + bcryptjs â€” autentikasi
- @libsql/client â€” Turso (libSQL, SQLite remote)
- nodemailer â€” email reset sandi
- Rate limiter token-bucket (`api/middleware/rateLimiter.js`)
- Google Generative AI (@google/generative-ai)

**Tooling**
- ESLint + Prettier
- Vitest + jsdom (unit & component tests), Jest + supertest (API tests)

## Arsitektur

Ruang Performer memakai arsitektur **monorepo ringan** dengan dua bagian yang deploy terpisah secara logis:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Frontend (Vite/React)  â”‚  HTTPS â”‚  Backend (Express/Vercel Fn) â”‚
â”‚  src/                   â”‚ â”€â”€â”€â”€â”€â–º â”‚  api/                        â”‚
â”‚  â†’ /api/* (proxy dev)   â”‚  JWT   â”‚  â†’ Turso (libSQL)            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Routing**
- **Produksi (Vercel):** route didefinisikan lewat regex rewrite di `vercel.json` â†’ tiap file handler (`api/**/*.js`) menjadi serverless function.
- **Lokal:** `api/index.js` dijalankan sebagai Express app (port 3000); `vite.config.js` me-proxy `/api` ke `127.0.0.1:3000`.

**Alur data frontend**
1. Aksi user pada komponen React
2. Pemanggilan API terpusat lewat `src/apiClient.js` (wrapper `fetch` yang menyisipkan `Authorization: Bearer <token>`)
3. State auth dikelola `src/contexts/AuthContext.jsx` (token & user disimpan di `localStorage`)
4. Otorisasi UI memakai `src/hooks/usePermission.js` + `src/utils/permissionUtils.js`

**Detail lengkap:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Menjalankan Secara Lokal

**Prasyarat:** Node.js 18+, akun Turso (gratis).

```bash
# 1. Install dependensi
npm install

# 2. Siapkan environment
copy .env.example .env    # PowerShell
# lalu isi kredensial Turso + JWT_SECRET (lihat bagian Konfigurasi Environment)

# 3. Inisialisasi database (jalankan isi db/schema.sql di Turso Dashboard / libsql client)

# 4. Jalankan API + frontend bersamaan
npm run dev:full
```

Alternatif jalankan terpisah di dua terminal:

```bash
npm run dev:api   # API  â†’ http://localhost:3000
npm run dev       # Web  â†’ http://localhost:5173
```

> **Penting:** setiap kali Anda mengubah file di dalam `api/`, restart `npm run dev:api` agar handler terbaru terbaca. Dan pastikan setiap handler baru terdaftar di `api/index.js`.

## Konfigurasi Environment

`api/_turso.js` dan `runMigration.js` membaca beberapa nama variabel (urutan prioritas):

| Variabel | Keterangan |
| --- | --- |
| `rz_TURSO_DATABASE_URL` / `RZ_TURSO_DATABASE_URL` / `TURSO_DATABASE_URL` | URL database Turso |
| `rz_TURSO_AUTH_TOKEN` / `RZ_TURSO_AUTH_TOKEN` / `TURSO_AUTH_TOKEN` | Auth token Turso |
| `JWT_SECRET` | Kunci penandatangan JWT (wajib diganti di produksi) |
| `GEMINI_API_KEY` | API key Google Gemini (fitur AI) |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | Konfigurasi SMTP (reset sandi) |
| `PORT` | Port API lokal (default `3000`) |
| `NODE_ENV` | `development` / `production` / `test` |

Template: `.env.example`. Untuk lingkungan lokal, `api/index.js` memuat `.env.local` lalu `.env`.

> Jangan pernah commit `.env.local` â€” sudah masuk `.gitignore`.

## Setup Database

Seluruh skema database berada dalam satu file mandiri di [`db/schema.sql`](db/schema.sql). Untuk menyiapkan database baru, cukup jalankan satu perintah:

```bash
node runMigration.js schema.sql
```

`runMigration.js` memecah file SQL per `;`, membuang komentar `--`, mengeksekusi statement secara berurutan, mengabaikan error nonfatal (`already exists`, `no such column`), lalu menampilkan struktur seluruh tabel. Karena semua statement memakai `IF NOT EXISTS`, perintah di atas aman dijalankan berulang.

> **Upgrade DB produksi yang sudah berjalan:** `schema.sql` hanya untuk database baru â€” karena `CREATE TABLE IF NOT EXISTS`, menjalankannya pada DB yang sudah ada tidak mengubah tabel lama. Perubahan schema ke depan: tambahkan statement ke `db/schema.sql` lalu jalankan file itu ke produksi (perubahan aditif aman di-skip otomatis); untuk perubahan destruktif buat file migrasi terpisah + backup dulu. Prosedur lengkap: [`docs/DATABASE.md`](docs/DATABASE.md).

> **Peringatan:** sebelum menjalankan skrip yang dapat menghapus kolom/tabel/data, selalu minta konfirmasi eksplisit pengguna terlebih dahulu.

## Skrip npm

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Dev server Vite (port 5173, auto-open) |
| `npm run dev:api` | API Express lokal (port 3000) |
| `npm run dev:full` | Jalankan API + web bersamaan (`concurrently`) |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Preview hasil build |
| `npm run test:unit` | Jalankan unit/component test (Vitest) |
| `npm run test:unit:watch` | Mode watch |
| `npm run lint` | ESLint pada `src/` |
| `npm run format` | Prettier pada `src/` |
| `npm run generate-icons` | Generate icon PWA |
| `node runMigration.js <file>` | Jalankan SQL skema/migrasi DB |

## Struktur Proyek

```
.
â”œâ”€â”€ api/                  # Backend (Express + handler serverless)
â”‚   â”œâ”€â”€ index.js          # Express app + registrasi route lokal
â”‚   â”œâ”€â”€ _auth.js          # verifyToken (JWT)
â”‚   â”œâ”€â”€ _turso.js         # Klien Turso (env-aware)
â”‚   â”œâ”€â”€ middleware/       # rateLimiter
â”‚   â”œâ”€â”€ auth/             # register, login, me, change-password, forgot/reset
â”‚   â”œâ”€â”€ songs/            # index.js, [id].js
â”‚   â”œâ”€â”€ setlists/         # index.js
â”‚   â”œâ”€â”€ bands/            # index.js, [id].js, members.js
â”‚   â”œâ”€â”€ events/           # gigs & sesi latihan
â”‚   â”œâ”€â”€ users/            # user management (owner)
â”‚   â”œâ”€â”€ tools/            # export/import, backup, restore
â”‚   â”œâ”€â”€ ai.js             # Integrasi Gemini
â”‚   â””â”€â”€ __tests__/        # Jest + supertest
â”œâ”€â”€ db/                   # schema.sql (skema tunggal & lengkap)
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ main.jsx          # Entry React
â”‚   â”œâ”€â”€ App.jsx           # Router + state global
â”‚   â”œâ”€â”€ apiClient.js      # Wrapper fetch terpusat
â”‚   â”œâ”€â”€ contexts/         # AuthContext
â”‚   â”œâ”€â”€ hooks/            # usePermission, useMetronome, useChordStats, ...
â”‚   â”œâ”€â”€ components/       # UI reusable
â”‚   â”œâ”€â”€ pages/            # <Feature>Page.jsx
â”‚   â”œâ”€â”€ utils/            # chordUtils, permissionUtils, exportUtil, ...
â”‚   â”œâ”€â”€ styles/           # CSS per domain/fitur (theme, layout, stage-mode, ...)
â”‚   â””â”€â”€ __tests__/        # Vitest
â”œâ”€â”€ public/               # aset statis
â”œâ”€â”€ vercel.json           # Routing serverless
â””â”€â”€ vite.config.js        # Dev server + proxy + manualChunks
```

## Dokumentasi Lainnya

| Dokumen | Isi |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arsitektur detail, alur request, pola handler, state management |
| [`docs/API.md`](docs/API.md) | Referensi endpoint REST |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Skema tabel, relasi, migrasi |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Panduan fitur per halaman |
| [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md) | Sistem peran & otorisasi |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Standar kode, styling, testing, deployment |

## Deploy

1. Push ke branch utama repository yang terhubung ke Vercel
2. Tambahkan environment variables di dashboard Vercel (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, dll.)
3. `vercel.json` menangani routing; semua request non-API di-fallback ke `index.html` (SPA)

## Testing & Kualitas Kode

```bash
npm run test:unit   # Vitest: utils, hooks, komponen, halaman
npm run lint        # ESLint
npm run build       # sanity check build produksi
```

Test API memakai Jest + supertest dengan bypass autentikasi otomatis saat `NODE_ENV=test` dan klien Turso dimock oleh `api/_turso.js`.
