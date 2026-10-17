# Panduan Pengembangan

Standar kode, alur kerja, dan checklist sebelum deploy.

---

## Prasyarat

| Kebutuhan | Keterangan |
| --- | --- |
| Node.js | 18+ (disarankan LTS terbaru) |
| npm | 10+ |
| Akun Turso | Database libSQL gratis |
| Akun Vercel | Untuk deployment (opsional) |
| Akun Google AI Studio | API key Gemini bila memakai fitur AI |

---

## Menjalankan

```bash
npm install

#Terminal 1 — API
npm run dev:api        # http://localhost:3000

# Terminal 2 — Web
npm run dev            # http://localhost:5173 (auto-open browser)
```

Atau sekaligus:

```bash
npm run dev:full
```

`vite.config.js` me-proxy `/api` → `http://127.0.0.1:3000`, sehingga di browser Anda cukup mengakses port 5173.

---

## Standar Kode

### Gaya Penulisan

Dari `.eslintrc.json` dan `.prettierrc`:

| Aturan | Nilai |
| --- | --- |
| Semicolon | Selalu (`"semi": ["error", "always"]`) |
| Kutipan | Double quote (`singleQuote: false`) |
| Indentasi | 2 spasi |
| Lebar baris | 100 karakter |

Jalankan formatter sebelum commit:

```bash
npm run format    # Prettier pada src/
npm run lint      # ESLint pada src/
```

### Larangan

1. **Dilarang** memakai inline style, CSS-in-JS, atau CSS module.
2. **Dilarang** membuat logika kord baru sebelum mengecek `src/utils/chordUtils.js`.
3. **Dilarang** membuat tombol/aksi CRUD tanpa permission check eksplisit.
4. **Dilarang** melakukan perubahan database destruktif tanpa konfirmasi pengguna.

### CSS

Styling dibagi per domain di `src/styles/` — **satu file CSS per fitur/kelompok komponen**. Semua file diimpor berurutan di `src/main.jsx`, dan **urutan import harus dipertahankan** agar spesifisitas/override CSS tidak berubah.

File utama:

| File | Isi |
| --- | --- |
| `theme.css` | CSS variables, tema, global styles |
| `layout.css` | Sidebar, app container & header |
| `components.css` | Page layout, buttons, cards, modals, forms, utility |
| `stage-mode.css` | Stage Mode (tema kontras tinggi + halaman fullscreen) |
| `setlist-songs.css`, `song-editor.css`, `lyrics-*.css`, `playback.css`, dst. | CSS per fitur/halaman |

Fitur baru: buat file sendiri di `src/styles/<fitur>.css`, lalu impor di `main.jsx` (atau di komponen pemakainya, seperti yang dilakukan `StageModePage.jsx`).

```jsx
// ✅ Benar
<div className="song-item">…</div>

// ❌ Salah
<div style={{ padding: "16px" }}>…</div>
```

Variabel CSS yang tersedia:

```css
--primary-bg, --card-bg, --text-primary, --text-secondary,
--border-color, --primary-accent, --transition
```

Kelas standar:

| Kategori | Kelas |
| --- | --- |
| Layout | `.page-container`, `.page-header`, `.card`, `.grid` |
| Tombol | `.btn`, `.btn-primary`, `.btn-secondary` |
| Form | `.modal`, `.modal-overlay`, `.modal-input` |
| Komponen | `.sidebar`, `.song-item`, `.setlist-container` |

Breakpoint responsif: **1200px, 1024px, 768px, 600px**.

Pola halaman:

```jsx
<div className="page-container">
  <div className="page-header"><h1>Judul</h1></div>
  <div className="card">…</div>
</div>
```

Layout: **desktop** memakai sidebar, **mobile** memakai hamburger menu (bukan tab header).

---

## Menambah Handler API Baru

Checklist lengkap:

1. **Buat file handler** di `api/<resource>/index.js` (list/create) atau `api/<resource>/[id].js` (item).
2. **Gunakan pola isomorfis** — jangan andalkan `req.params` saja:

   ```javascript
   const id = req.query.id || req.params.id;
   ```

3. **Verifikasi token** di baris pertama handler:

   ```javascript
   if (!verifyToken(req, res)) return;
   ```

4. **Tambahkan rewrite di `vercel.json`** agar dapat diakses di produksi.
5. **Daftarkan route di `api/index.js`** agar dapat diakses di Express lokal.
6. **Restart `npm run dev:api`**.
7. **Tambahkan fungsi client** di `src/apiClient.js`.
8. **Tambahkan permission check** bila menyangkut data yang bersifat CRUD.
9. **Tulis test** di `api/__tests__/`.

Contoh registrasi Express:

```javascript
import songsHandler from './songs/index.js';
app.use('/api/songs', verifyToken, (req, res, next) => {
  Promise.resolve(songsHandler(req, res)).catch(next);
});
```

Contoh rewrite Vercel:

```json
{ "src": "/api/songs/([^/]+)$", "dest": "/api/songs/[id].js?id=$1" }
```

---

## Konvensi Penamaan

| Jenis | Pola | Contoh |
| --- | --- | --- |
| Halaman | `<Feature>Page.jsx` | `SongListPage.jsx` |
| Komponen | PascalCase | `ChordDisplay.jsx` |
| Hook | `use<Name>.js` | `usePermission.js` |
| Util | camelCase | `transposeChord()` |
| Test | `<Name>.test.js(x)` | `chordUtils.test.js` |
| Skema DB | `db/schema.sql` (satu file, idempoten) | `db/schema.sql` |

Struktur folder:

```
src/
├── components/   # UI reusable
├── pages/        # Komponen rute
├── contexts/     # React Context
├── hooks/        # Custom hooks
├── utils/        # Fungsi murni
├── styles/       # CSS khusus
└── __tests__/    # Test
```

---

## Chord & Musik

Selalu gunakan helper dari `src/utils/chordUtils.js`:

- `transposeChord()`
- `parseChordLine()`

Buat logika baru hanya jika helper yang ada tidak memadai. Prinsipnya: **konsistensi dan reuse lebih diutamakan**.

---

## Testing

### Unit & Component (Vitest)

```bash
npm run test:unit          # Sekali jalan
npm run test:unit:watch    # Mode watch
```

Environment `jsdom`, globals dinyalakan. Cakupan saat ini: util (`chordUtils`, `permissionUtils`, `exportUtil`, `lyricsEditorUtils`, `setlistSmartAssistant`, `analyticsUtil`, dll.), hooks (`useChordStats`), handler AI (`api.ai.test.js` — menguji `api/ai.js` secara terisolasi), dan komponen/halaman (`ChordDisplay`, `Sidebar`, `SongListPage`, `DashboardPage`, `AIAutofillModal`, dan lainnya).

Helper tersedia di `src/__tests__/helpers/`:
- `domTestUtils.js`
- `dashboardApiMocks.js`

### API (Jest + supertest)

```bash
npm run test:api          # Sekali jalan
npm run test:api:watch    # Mode watch
```

- `NODE_ENV=test` membuat `verifyToken` otomatis meloloskan token dummy dan `getTursoClient()` mengembalikan mock.
- Test mencakup songs, bands, setlists, dan gigs (`api/__tests__/**/*.cjs`).
- Helper: `api/test-helpers/setupEnv.cjs`, `api/test-helpers/jest.setup.api.js`

**Catatan modul (penting):** root `package.json` memakai `"type": "module"`, sehingga `api/index.js` adalah ESM dan tidak bisa `require()` dari test CommonJS. Karena itu:
- `api/server.cjs` adalah *loader* CommonJS yang memuat app lewat `import()` dinamis.
- Test memanggil `const loadApp = require('../server')` lalu `app = await loadApp()` di dalam `beforeAll`.
- Skrip `test:api` menjalankan Jest dengan flag `--experimental-vm-modules` (wajib untuk dynamic import di Jest) dan `--forceExit` (menutup handle ESM yang masih terbuka).

`jest.config.cjs` hanya menangani test API ini: `testEnvironment: 'node'` dipakai agar global `fetch`/`Request` (undici) tetap tersedia untuk `@libsql/client` — di bawah `jsdom` global tersebut hilang dan menyebabkan `fetch is not defined`. Test di bawah `src/__tests__` **tidak** dijalankan Jest karena sudah ditangani Vitest.

---

## Build & Optimasi

```bash
npm run build      # Output ke dist/
npm run preview    # Preview hasil build
```

Code splitting:
- Halaman non-kritis di-`lazy()` di `src/App.jsx` + `Suspense` dengan `PageLoader`
- Vendor dipecah lewat `manualChunks` di `vite.config.js`:
  `react-vendor`, `pdf-vendor`, `music-display-vendor`, `fabric-vendor`, `slate-vendor`, `qrcode-vendor`, `vendor`

---

## Deployment

1. Push ke branch yang terhubung ke Vercel
2. Tambahkan environment variables di dashboard Vercel
3. Deploy — `vercel.json` menangani routing; `maxDuration` 10 detik per function

### Checklist Pra-Deploy

- [ ] `npm run lint` bersih
- [ ] `npm run test:unit` lulus
- [ ] `npm run build` sukses
- [ ] Semua migrasi DB sudah dijalankan
- [ ] `JWT_SECRET` diganti dari nilai default
- [ ] Tidak ada kredensial yang ter-commit

---

## Git

- Commit message deskriptif
- Satu perubahan logis per commit
- **Selalu sertakan konfirmasi pengguna dalam commit message** bila perubahan dapat menyebabkan kehilangan data
- Jangan pernah commit `.env.local`

---

## Referensi

- Arsitektur → [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Endpoint → [`API.md`](API.md)
- Database → [`DATABASE.md`](DATABASE.md)
- Fitur → [`FEATURES.md`](FEATURES.md)
- Permission → [`PERMISSIONS.md`](PERMISSIONS.md)
- Policy developer resmi → [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)