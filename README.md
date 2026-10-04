
# Ruang Performer

Aplikasi web untuk manajemen repertoar musik: chord & lirik, setlist, band, gigs, dan mode tampil panggung (*performance mode*). Multi-user, multi-band, dengan sistem permission berbasis role, database Turso/libSQL, dan dukungan offline.

- **Versi:** 2.0.10
- **Lisensi:** MIT

## Fitur Utama

### Lagu & Chord
- Editor chord & lirik dengan notasi `[Am]` dan time marker `[00:32]` (sinkronisasi YouTube)
- Transposisi key, kontrol tempo, dan metronome
- Virtual piano + dukungan Web MIDI (pilih program/soundbank GM)
- Analisis chord (statistik & mood lagu) dan anotasi notasi musik (OpenSheetMusicDisplay)
- Riwayat versi lagu (`new-version`), status *mastered* per anggota band

### Setlist & Performa
- Manajemen setlist dengan drag & drop (@dnd-kit / hello-pangea)
- **Performance Mode**: UI ringkas khusus panggung, sembunyikan kontrol edit
- **Lyrics/Vocalist Mode**: tampilan lirik besar untuk vokalis
- Cetak poster setlist (html-to-image / html2canvas / jsPDF), ekspor kalender (.ics), QR code
- Prefetch data ke cache agar mode perform tetap jalan saat offline

### Band, Gig & Alat Bantu
- Manajemen band + anggota dengan role: `owner`, `admin`, `member`, `guest`
- Jadwal gigs & performance notes per lagu
- Pencarian lagu tren YouTube
- AI Autofill (Google Generative AI) untuk membantu pengisian data lagu
- Audit log, analitik, dan user management
- Backup & restore database (SQL dump / JSON) melalui halaman Tools
- Dark/light mode, PWA (manifest + ikon), desain responsif mobile & desktop

## Teknologi

| Bagian | Teknologi |
|--------|-----------|
| Frontend | React 18, Vite, React Router 7 |
| Editor | Slate / slate-react |
| State | React Context (`AuthContext`) |
| Backend | Vercel Serverless Functions + Express (dev lokal) |
| Database | Turso / libSQL (`@libsql/client`) |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |
| Test | Vitest (frontend), Jest + Supertest (API) |

## Struktur Folder

```
src/
├── pages/         # Komponen route (*Page.jsx)
├── components/    # UI reusable (ChordDisplay, VirtualPiano, Sidebar, dll)
├── hooks/         # usePermission, useMetronome, useChordStats, useSongFetch
├── utils/         # chordUtils, permissionUtils, auth, auditLogger, offlineCache
├── contexts/      # AuthContext.jsx
└── __tests__/     # Unit test frontend (Vitest)
api/
├── auth/          # login, register, me, change/reset password, delete account
├── songs/         # CRUD lagu (+ [id].js)
├── setlists/      # CRUD setlist
├── bands/         # band & members
├── events/        # gigs
├── users/         # user management
├── tools/         # backup & restore database
├── _auth.js       # verifyToken() JWT guard
├── _turso.js      # getTursoClient()
├── middleware/    # rate limiter
└── index.js       # Express router untuk dev lokal
db/                # schema.sql & migrasi
public/            # asset statis, manifest, ikon, screenshots
scripts/           # generate-icons.cjs
```

## Instalasi

```bash
npm install
cp .env.example .env   # sesuaikan nilainya
```

## Environment

```bash
API_URL=http://localhost:3000
DB_PATH=./db/schema.sql
JWT_SECRET=your-super-secret-key-change-this-in-production
APP_NAME=Ruang Performer
APP_ENV=development
```

Database (Turso) juga memakai variabel berikut (didukung prefiks `rz_`):

```bash
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

> Lihat `.env.example` untuk daftar terbaru.

## Menjalankan

```bash
npm run dev        # Frontend Vite (port 5173, proxy /api → 3000)
npm run dev:api    # API Express lokal (port 3000)
npm run dev:full   # Jalankan keduanya sekaligus
npm run build      # Build produksi
npm run preview    # Preview hasil build
```

> Setelah memodifikasi file di `api/`, **restart** `npm run dev:api`.

## Testing & Quality

```bash
npm run test:unit         # Vitest (src/__tests__)
npm run test:unit:watch   # Mode watch
npm run lint              # ESLint
npm run format            # Prettier
```

Test API memakai Jest + Supertest (`api/__tests__`).

## Migrasi Database

```bash
node runMigration.js db/migrations_<nama>.sql
```

Migrasi dijalankan berurutan, komentar `--` dilewati.

## Backup & Restore Database
- Menu **Tools** → Backup Database (khusus owner)
- Dump `.sql` berisi `CREATE TABLE` + `INSERT`, cocok untuk restore manual
- Pastikan route `/api/tools/backup` terdaftar baik di `vercel.json` maupun `api/index.js` (route spesifik harus diletakkan sebelum catch-all)

## Routing
- **Vercel:** rewrite regex pada `vercel.json`
- **Dev lokal:** Express `api/index.js` meniru route serverless
- **Vite:** proxy otomatis `/api` ke `http://localhost:3000`

## Permission

### Frontend
```jsx
import { usePermission } from './hooks/usePermission.js';
const { can } = usePermission(bandId, userBandInfo);
if (can('edit_setlist')) {
  // tampilkan tombol edit
}
```

### Backend
```js
import { verifyToken } from './_auth.js';
if (!verifyToken(req, res)) return; // 401
// validasi aksi spesifik terhadap role pengguna sebelum mengubah data
```

Aksi yang umum: `view_band`, `edit_band`, `manage_members`, `edit_setlist`, `delete_setlist`.

## Error Handling

```jsx
{error && <div className="error-text">{error}</div>}
// fallback global memakai <ErrorBoundary>
```

```js
try {
  // ...
} catch (err) {
  res.status(400).json({ error: err.message || 'Input tidak valid' });
}
```

## Testing Example

```js
import { canPerformAction } from '../utils/permissionUtils.js';
test('owner can edit setlist', () => {
  expect(canPerformAction('edit_setlist', 'owner')).toBe(true);
});
```

```js
import request from 'supertest';
test('GET /api/songs butuh auth', async () => {
  await request(app).get('/api/songs').expect(401);
});
```

## Standar Coding
- CSS tunggal di `src/App.css` — hindari inline style & CSS-in-JS; gunakan variabel (`--primary-bg`, `--card-bg`, `--text-primary`, dll) dan class standar (`.page-container`, `.card`, `.btn`, `.btn-primary`)
- Halaman: `<Feature>Page.jsx`, komponen: PascalCase, util: camelCase
- Logika chord selalu lewat helper di `src/utils/chordUtils.js`
- Perubahan CRUD wajib disertai permission check di UI dan backend

## Kontribusi
Pull request dan issue dipersilakan. Pastikan `npm run lint` dan `npm run test:unit` lulus sebelum membuka PR.