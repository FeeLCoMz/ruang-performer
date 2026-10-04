# Ruang Performer

Aplikasi manajemen band: repertoire lagu (lirik + kord), setlist, latihan, gigs/pertunjukan, dan kerja kolaboratif multi-anggota dengan kontrol akses berbasis peran.

**Versi:** 2.0.10 · **Lisensi:** MIT · **Target deploy:** Vercel (serverless functions) + Turso/libSQL

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

Dirancang untuk usage nyata di panggung — ada **Performance Mode** yang menyederhanakan UI, **Lyrics Mode** untuk vokalis, dan dukungan **offline** sehingga setlist tetap bisa dibuka tanpa koneksi.

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
- Slate / Slate React — editor lirik rich-text
- @dnd-kit & @hello-pangea/dnd — drag & drop
- OpenSheetMusicDisplay — render sheet music MusicXML
- jsPDF, html2canvas, html-to-image — export poster/PDF
- qrcode.react — QR code pada poster
- fabric — kanvas editing

**Backend**
- Express 4 (server lokal) + format handler Vercel Serverless Functions
- JWT (jsonwebtoken) + bcryptjs — autentikasi
- @libsql/client — Turso (libSQL, SQLite remote)
- nodemailer — email reset sandi
- Rate limiter token-bucket (`api/middleware/rateLimiter.js`)
- Google Generative AI (@google/generative-ai)

**Tooling**
- ESLint + Prettier
- Vitest + jsdom (unit & component tests), Jest + supertest (API tests)

## Arsitektur

Ruang Performer memakai arsitektur **monorepo ringan** dengan dua bagian yang deploy terpisah secara logis:

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Frontend (Vite/React)  │  HTTPS │  Backend (Express/Vercel Fn) │
│  src/                   │ ─────► │  api/                        │
│  → /api/* (proxy dev)   │  JWT   │  → Turso (libSQL)            │
└─────────────────────────┘        └──────────────────────────────┘
```

**Routing**
- **Produksi (Vercel):** route didefinisikan lewat regex rewrite di `vercel.json` → tiap file handler (`api/**/*.js`) menjadi serverless function.
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
npm run dev:api   # API  → http://localhost:3000
npm run dev       # Web  → http://localhost:5173
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

> Jangan pernah commit `.env.local` — sudah masuk `.gitignore`.

## Setup Database

Skema utama berada di [`db/schema.sql`](db/schema.sql). Perubahan schema berikutnya memakai file migrasi terpisah di `db/`:

```bash
node runMigration.js migration_add_time_signature_column.sql
```

`runMigration.js` memecah file SQL per `;`, membuang komentar `--`, mengeksekusi statement secara berurutan, mengabaikan error nonfatal (`already exists`, `no such column`), lalu menampilkan struktur seluruh tabel.

> **Peringatan:** sebelum menjalankan migrasi yang dapat menghapus kolom/tabel/data, selalu minta konfirmasi eksplisit pengguna terlebih dahulu.

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
| `node runMigration.js <file>` | Jalankan migrasi DB |

## Struktur Proyek

```
.
├── api/                  # Backend (Express + handler serverless)
│   ├── index.js          # Express app + registrasi route lokal
│   ├── _auth.js          # verifyToken (JWT)
│   ├── _turso.js         # Klien Turso (env-aware)
│   ├── middleware/       # rateLimiter
│   ├── auth/             # register, login, me, change-password, forgot/reset
│   ├── songs/            # index.js, [id].js
│   ├── setlists/         # index.js
│   ├── bands/            # index.js, [id].js, members.js
│   ├── events/           # gigs & sesi latihan
│   ├── users/            # user management (owner)
│   ├── tools/            # export/import, backup, restore
│   ├── ai.js             # Integrasi Gemini
│   └── __tests__/        # Jest + supertest
├── db/                   # schema.sql + migrasi
├── src/
│   ├── main.jsx          # Entry React
│   ├── App.jsx           # Router + state global
│   ├── apiClient.js      # Wrapper fetch terpusat
│   ├── contexts/         # AuthContext
│   ├── hooks/            # usePermission, useMetronome, useChordStats, ...
│   ├── components/       # UI reusable
│   ├── pages/            # <Feature>Page.jsx
│   ├── utils/            # chordUtils, permissionUtils, exportUtil, ...
│   ├── styles/           # AuditLog.css, setlist-poster.css
│   └── __tests__/        # Vitest
├── public/               # aset statis
├── vercel.json           # Routing serverless
└── vite.config.js        # Dev server + proxy + manualChunks
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
