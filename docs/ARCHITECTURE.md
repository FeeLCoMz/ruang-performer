# Arsitektur

Dokumen ini menjelaskan secara detail bagaimana Ruang Performer tersusun: dua bagian runtime (frontend & backend), pola routing, alur request, danalb konvensi internal.

---

## 1. Gambaran Umum

Ruang Performer adalah **SPA React** yang berkomunikasi CRUD ke **REST API stateless** yang berjalan di atas **Turso (libSQL)**.

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser                                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  React App (src/)                                            │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐   │  │
│  │  │  Pages/    │  │ Components/  │  │  Hooks & Contexts   │   │  │
│  │  └─────┬──────┘  └──────┬───────┘  └──────────┬──────────┘   │  │
│  │        └────────────────┴──────────────────────┘             │  │
│  │                    apiClient.js  (+ AuthContext)             │  │
│  └────────────────────────────┬─────────────────────���───────────┘  │
└───────────────────────────────┼──────────────────────────────────┘
                                │  fetch("/api/...", Bearer JWT)
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│  Server (api/)                                                     │
│  Express (lokal)  ◄── isomorphic ──►  Vercel Serverless Functions  │
│         │                                                          │
│         ├─ _auth.js     : verifyToken (JWT)                       │
│         ├─ middleware/  : rate limiter                            │
│         └─ _turso.js    : getTursoClient()                        │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
                     Turso / libSQL (SQLite remote)
```

## 2. Dua Mode Eksekusi Backend

Handler yang sama dilayani oleh dua runtime berbeda. Inilah alasan utama semua handler ditulis dalam bentuk fungsi `(req, res)` generik, bukan handler Express murni.

### 2.1 Serverless (produksi — Vercel)

Setiap file di `api/**/*.js` menjadi sebuah **Vercel Serverless Function**. Routing ditentukan oleh regex rewrite di `vercel.json`:

```json
{ "src": "/api/songs/([^/]+)$", "dest": "/api/songs/[id].js?id=$1" }
```

Parameter diambil dari `req.query`. Batas durasi fungsi diatur `maxDuration: 10` detik.

Fallback akhir meneruskan semua request non-API ke `/index.html` agar routing SPA bekerja saat halaman di-refresh.

### 2.2 Express (lokal)

`api/index.js` membuat aplikasi Express dan mendaftarkan **setiap** handler secara eksplisit:

```javascript
import songsHandler from './songs/index.js';
app.use('/api/songs', verifyToken, (req, res, next) => {
  Promise.resolve(songsHandler(req, res)).catch(next);
});
```

`api/index.js` juga mendefinisikan `verifyToken` versi Express (middleware 3-argumen), berbeda dari `api/_auth.js` yang mengembalikan boolean untuk Gaya Vercel.

> **Aturan penting:** setiap handler baru **wajib** didaftarkan di `api/index.js`, dan setelah mengubah `api/`, server lokal harus di-restart.

## 3. Pola Handler

### 3.1 Koleksi vs. Item

| Jenis | File | Peran |
| --- | --- | --- |
| Koleksi | `api/<resource>/index.js` | `GET` list, `POST` create |
| Item | `api/<resource>/[id].js` | `GET`/`PUT`/`DELETE` satu record |

Handler koleksi sering mendelegasikan rute item ke handler `[id].js` dengan membaca `req.query.id`:

```javascript
const id = req.query.id || req.params.id;
if (id) return [idHandler]({ ...req, query: { ...req.query, id } }, res);
```

### 3.2 Bentuk Umum

```javascript
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;        // 1. autentikasi
  const client = getTursoClient();           // 2. koneksi DB
  // 3. branching per req.method
  // 4. kirim JSON
}
```

### 3.3 Mode Uji

`verifyToken` dan `getTursoClient` sama-sama punya cabang `NODE_ENV === 'test'`:
- Token otomatis diganti user `test-user` dengan role `owner`
- Klien DB dimock menjadi fungsi kosong (rows kosong)

Ini membuat test API tidak memerlukan kredensial database sungguhan.

## 4. Lapisan Database

`api/_turso.js` mengabstraksi pembuatan klien dan mendukung beberapa nama variabel environment:

```javascript
const url = process.env.rz_TURSO_DATABASE_URL
  ?? process.env.RZ_TURSO_DATABASE_URL
  ?? process.env.TURSO_DATABASE_URL;
```

Semua kolom waktu disimpan sebagai **TEXT ISO-8601** (default `datetime('now')`), kolom boolean sebagai **INTEGER** 0/1, dan beberapa kolomJSON disimpan sebagai string (`songs`, `setlistSongMeta`, `completedSongs`, `time_markers`). Penguraian JSON dilakukan di sisi server handler sebelum dikirim ke client.

**Soft delete:** tabel yang memiliki kolom `deletedAt` (users, songs, bands, setlists, gigs, practice_sessions) tidak dihapus fisik. Filter `deletedAt IS NULL` dipakai pada query.

## 5. Frontend

### 5.1 Entry & Routing

`src/main.jsx` merender `<App />` di dalam `AuthProvider`. `src/App.jsx` adalah **router sekaligus pemilik state global**.

Route yang ada:

| Path | Halaman |
| --- | --- |
| `/` | Dashboard |
| `/songs` | Daftar lagu |
| `/songs/add`, `/songs/edit/:id`, `/songs/new-version/:id` | Form lagu |
| `/songs/view/:id` | Lirik + kord |
| `/setlists`, `/setlists/:id` | Setlist |
| `/setlists/:setlistId/songs/:id` | Lirik dari dalam setlist |
| `/gigs` | Gig |
| `/bands/manage`, `/bands/:id` | Band |
| `/youtube-trending` | Trending YouTube |
| `/tools`, `/audit-logs`, `/user-management` | Utilitas & pengaturan |

Halaman non-kritis di-`lazy()` dan dibungkus `Suspense` dengan `PageLoader`.

### 5.2 State Global

`App.jsx` memegang: `songs`, `setlists`, `activeSetlist`, `userBandInfo`, `theme`, `performanceMode`, `sidebarOpen`, `toastMessage`. State ini diteruskan sebagai props ke halaman.

Dua mode tampilan disimpan di `localStorage` dan diterapkan sebagai class pada `<body>`:

| Key | Class `<body>` | Efek |
| --- | --- | --- |
| `ruangperformer_theme` | `dark-mode` / `light-mode` | Tema warna |
| `ruangperformer_performance_mode` | `performance-mode` | UI panggung: sembunyikan kontrol non-esensial |

### 5.3 Lapisan API

`src/apiClient.js` adalah satu-satunya titik keluar HTTP ke backend. `request()` internal menangani:
- Base URL `/api`
- Injeksi header autentikasi (`getAuthHeader()` dari `src/utils/auth.js`)
- Username/serialisasi body JSON, `FormData`, dan body mentah
- Parsing error: coba JSON, fallback teks, pesan `fallbackError`
- Opsi `expect: 'text'` untuk respons non-JSON (backup SQL)

### 5.4 Code Splitting

`vite.config.js` memisah bundle vendor menjadi chunk: `pdf-vendor`, `music-display-vendor`, `fabric-vendor`, `slate-vendor`, `qrcode-vendor`, `react-vendor`, dan `vendor` umum.

## 6. Autentikasi

```
Login ──► POST /api/auth/login ──► verifikasi bcrypt ──► sign JWT
                                                        │
                                                        ▼
                                        token disimpan di localStorage
                                                        │
        Request berikutnya: Authorization: Bearer <token>│
                                                        ▼
                                        verifyToken → req.user
                                                        ▼
                                    Otorisasi per-band via band_members
```

`AuthProvider` saat mount memeriksa token+user yang tersimpan, lalu memvalidasi ulang lewat `GET /api/auth/me`. Bila validitas server tidak terkonfirmasi (jaringan gagal), user lokal tetap dipakai — namun endpoint privat akan tetap menolak request tanpa token valid.

## 7. Rate Limiting

`api/middleware/rateLimiter.js` menyediakan `RATE_LIMITS` dan `createRateLimiter()` (in-memory, token bucket):

| Kelompok | Batas |
| --- | --- |
| `AUTH_LOGIN` | 5 / 15 menit |
| `AUTH_REGISTER`, `AUTH_FORGOT`, `AUTH_RESET` | 3 / jam |
| `API_READ` | 100 / menit |
| `API_WRITE` | 50 / menit |
| `API_DELETE` | 10 / menit |
| `GENERAL` | 1000 / menit |

Kunci rate limit dibangkitkan per user (`userKeyGenerator`) atau per IP+endpoint (`endpointKeyGenerator`).

## 8. Konvensi Nama

| Jenis | Pola | Contoh |
| --- | --- | --- |
| Halaman | `<Feature>Page.jsx` | `SongListPage.jsx` |
| Komponen | PascalCase | `ChordDisplay.jsx` |
| Util | camelCase | `transposeChord()` |
| Rute API | sesuai HTTP verb | `index.js`, `[id].js` |
| Migrasi | `migration_add_<fitur>.sql` | `migration_add_time_signature_column.sql` |

## 9. Referensi Lintas

- Kontrak endpoint → [`API.md`](API.md)
- Skema tabel → [`DATABASE.md`](DATABASE.md)
- Sistem peran → [`PERMISSIONS.md`](PERMISSIONS.md)
- Standar pengembangan → [`DEVELOPMENT.md`](DEVELOPMENT.md)
- Panduan fitur → [`FEATURES.md`](FEATURES.md)