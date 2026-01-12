# RoNz Chord Pro 🎸

Aplikasi Chord dan Lirik berbasis React (Vite) dengan fitur lengkap untuk musisi dan penggemar musik. Mendukung format ChordPro dan format standar (chord di atas lirik), lengkap dengan import, transpose, autoscroll, YouTube, serta tampilan notasi melodi.

## ✨ Fitur Utama

- **📝 Chord Display**: Tampilkan chord & lirik (ChordPro dan format standar)
- **📥 Song Importer**: Import dari URL atau paste teks; otomatis deteksi dan konversi ke ChordPro
- **🔎 Pencarian Lagu**: Cari berdasarkan judul, artis, atau lirik
- **🎵 Transpose**: Transposisi chord ke kunci yang diinginkan
- **🎨 Chord Highlight**: Sorot chord untuk memudahkan pembacaan
- **📺 YouTube Viewer**: Embedded YouTube player untuk menonton video lagu
- **📜 Auto Scroll**: Scroll otomatis dengan kecepatan yang dapat diatur
- **🎼 Sheet Music & Not Angka**: Tampilkan melodi dalam Not Angka, Not Balok, atau keduanya
- **📐 Struktur Lagu**: Penanda bagian lagu (verse, chorus, bridge, dll.)
- **📋 Set List Management**: Kelola daftar lagu untuk performa/latihan
- **✏️ Song Editor**: Tambah/Edit lagu via UI (termasuk input melodi not angka)
- **💾 Local Storage**: Simpan set list dan lagu kustom secara otomatis

## 🚀 Cara Menjalankan

Persyaratan:

- Node.js 18+ (Vite 5)

### Install Dependencies

```bash
npm install
```

### Update Dependencies (Opsional - untuk versi terbaru)

```bash
npm run update
npm audit
npm audit-fix
```

### Jalankan Development Server

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:5173` (default Vite)

### Build untuk Production

```bash
npm run build
```

### Preview Build (Production-like)

```bash
npm run preview
```

Preview berjalan di `http://localhost:4173` (default Vite)

## 📖 Cara Menggunakan

### 1. Memilih Lagu

- Klik pada judul lagu di sidebar kiri
- Lagu akan ditampilkan dengan chord dan lirik

### 1.1. Pencarian Lagu

- Gunakan kotak pencarian di sidebar untuk memfilter daftar
- Pencarian mencocokkan judul, artis, dan isi lirik

### 2. Transpose Chord

- Gunakan tombol `-1` dan `+1` untuk transpose
- Tombol `Reset` untuk kembali ke kunci asli

### 3. Highlight Chord

- Toggle checkbox "Highlight Chords" untuk menyorot chord
- Memudahkan membaca chord saat bermain musik

### 4. Auto Scroll

- Klik "Auto Scroll" untuk mengaktifkan scroll otomatis
- Atur kecepatan dengan tombol `-` dan `+`
- Berguna saat bermain musik

### 5. YouTube Viewer

- Video YouTube otomatis dimuat jika tersedia
- Gunakan kontrol play/pause/stop
- Toggle checkbox untuk menampilkan/menyembunyikan video

### 6. Set List Management

- Klik ikon ⚙ untuk membuka Set List Manager
- Buat set list baru untuk latihan atau performa
- Tambah/hapus lagu dari set list
- Pilih set list untuk filter lagu

### 7. Import Lagu (URL / Paste)

- Buka menu Import, pilih mode: URL atau Paste Text
- Mode URL memakai proxy publik (CORS); jika gagal, gunakan Paste Text
- Setelah parse, periksa hasil dan klik Simpan Lagu

### 8. Partitur Melodi (Not Angka / Not Balok)

- Di tampilan lagu, klik tombol untuk menampilkan partitur
- Pilih tampilan: Not Angka, Not Balok, atau Keduanya
- Partitur ikut ter-transpose mengikuti kunci lagu

## 🎼 Format Chord & Contoh

Mendukung dua gaya input utama: ChordPro dan format standar (chord di atas lirik). Lihat contoh lengkap di [EXAMPLE_FORMATS.md](EXAMPLE_FORMATS.md).

### Contoh ChordPro

```
{title: Judul Lagu}
{artist: Nama Artis}
{key: C}

{start_of_verse}
[C]Lirik dengan [G]chord di [Am]atasnya [F]
{end_of_verse}

{start_of_chorus}
[C]Ini bagian [G]chorus [Am] [F]
{end_of_chorus}
```

### Tag yang Didukung:

- `{title:...}` - Judul lagu
- `{artist:...}` - Nama artis
- `{key:...}` - Kunci asli lagu
- `{start_of_verse}` / `{end_of_verse}` - Bagian verse
- `{start_of_chorus}` / `{end_of_chorus}` - Bagian chorus
- `{start_of_bridge}` / `{end_of_bridge}` - Bagian bridge
- `{start_of_intro}` / `{end_of_intro}` - Bagian intro
- `{start_of_outro}` / `{end_of_outro}` - Bagian outro
- `[chord]` - Chord di atas lirik

### Format Standar (Chord di atas Lirik)

Anda bisa copy-paste langsung dari situs chord. Aplikasi akan mencoba mendeteksi dan menyelaraskan chord dengan lirik secara otomatis. Lihat contoh di [EXAMPLE_FORMATS.md](EXAMPLE_FORMATS.md).

Catatan tambahan:

- Baris akor saja dengan tanda birama (mis. `| Am | F | Bdim | Am |`) akan ditampilkan sebagai satu baris inline dengan bar-line dan chord highlight, tanpa muncul baris akor terpisah di atasnya.
- Tanda pengulangan `|:` dan `:|` serta repeat cues (D.S., D.C., Fine, Coda, To Coda, Repeat, %) akan otomatis di-highlight.

## 🎯 Menambah Lagu Baru

Ada dua cara:

1. Via UI (disarankan)

- Klik tombol Tambah Lagu atau Edit Lagu
- Isi judul, artis, YouTube ID (opsional), lirik/chord, dan melodi (opsional)
- Gunakan tombol template untuk ChordPro/Standar
- Simpan; lagu kustom disimpan di Local Storage

2. Edit berkas sumber
   Edit file `src/data/songs.js`:

```javascript
{
  id: 4,
  title: "Judul Lagu",
  artist: "Nama Artis",
  youtubeId: "kode_video_youtube", // opsional
  lyrics: `{title: Judul Lagu}
{artist: Nama Artis}
{key: G}

{start_of_verse}
[G]Lirik dengan [D]chord
{end_of_verse}`,
  melody: "1 2 3 4 | 5 5 6 5 |" // opsional
}
```

## 🛠️ Teknologi yang Digunakan

- **React 18** - Library UI
- **Vite** - Build tool & dev server
- **YouTube IFrame API** - YouTube player integration
- **CSS3** - Styling dengan custom properties

## 📂 Struktur Proyek (Ringkas)

```
.
├─ src/
│  ├─ components/
│  │  ├─ AutoScroll.jsx
│  │  ├─ ChordDisplay.jsx
│  │  ├─ SetListManager.jsx
│  │  ├─ SheetMusicDisplay.jsx
│  │  ├─ SongForm.jsx
│  │  └─ SongImporter.jsx
│  ├─ data/
│  │  └─ songs.js
│  ├─ hooks/
│  │  └─ useLocalStorage.js
│  └─ utils/
│     ├─ chordUtils.js
│     └─ musicNotationUtils.js
├─ EXAMPLE_FORMATS.md
├─ MELODY_NOTATION_GUIDE.md
└─ vite.config.js
```

## 📱 Responsive Design

Aplikasi fully responsive dan dapat digunakan di:

- Desktop
- Tablet
- Mobile

## 🎶 Panduan Notasi Melodi

Aplikasi mendukung input melodi dalam format not angka dan menampilkannya sebagai Not Angka dan Not Balok. Panduan lengkap tersedia di [MELODY_NOTATION_GUIDE.md](MELODY_NOTATION_GUIDE.md).

Ringkasan cepat:

- Angka 1–7 mewakili do–si, gunakan `|` untuk bar
- Titik `.` untuk oktaf bawah, apostrof `'` untuk oktaf atas
- Tanda `-` memperpanjang durasi; dukung aksidental `#`/`b`

## 📝 Lisensi

MIT License - Bebas digunakan untuk keperluan pribadi dan komersial

## 👨‍💻 Author

**RoNz**

---

Selamat bermain musik! 🎸🎵

---

## 🌐 Koneksi ke Database Turso (libsql) di Vercel

Aplikasi ini dapat terhubung ke database Turso melalui API Serverless Vercel. Backend ringan sudah disiapkan di folder `api/`.

### 1) Siapkan Turso

- Install CLI Turso (opsional) atau pakai dashboard.
- Buat database Turso dan token akses (Read-Write).
- Catat `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`.

Contoh inisialisasi schema (opsional, sudah auto-create saat GET `/api/songs` pertama kali): lihat `db/schema.sql`.

### 2) Set Environment di Vercel

Tambahkan Environment Variables di proyek Vercel:

- `TURSO_DATABASE_URL` = URL database Turso
- `TURSO_AUTH_TOKEN` = Token RW Turso
- (opsional) `VITE_TURSO_SYNC` = `true` untuk menyinkronkan create/update/delete dari UI ke DB

Deploy ulang setelah menambahkan env vars.

### 3) Endpoint yang Tersedia

- `GET /api/songs` → daftar lagu
- `POST /api/songs` → buat lagu baru (fields: `id?`, `title`, `artist?`, `youtubeId?`, `melody?`, `lyrics?`)
- `GET /api/songs/:id` → detail lagu
- `PUT /api/songs/:id` → update lagu
- `DELETE /api/songs/:id` → hapus lagu

Semua endpoint menggunakan JSON.

### 4) Development Lokal

Untuk mencoba fungsi API secara lokal, gunakan Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel link
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env pull .env.local
vercel dev
```

Ini akan menjalankan server Vercel di port 3000 dengan route `api/*`. Jalankan Vite di terminal lain jika perlu:

```bash
npm run dev
```

Akses frontend di `http://localhost:5173` dan backend di `http://localhost:3000/api/songs`.

Catatan: Sinkronisasi otomatis create/update/delete dari UI hanya aktif jika `VITE_TURSO_SYNC=true` (lihat `.env` atau Vercel Project Env). Fetch awal dari DB tidak diaktifkan agar tidak mengubah alur lokal; Anda dapat menambahkan fetch awal sesuai kebutuhan.

---

## 🎤 Audio Transcription

Fitur transkripsi audio untuk mengkonversi file audio menjadi teks lirik:

- Upload file audio (MP3, WAV, dll)
- Transkripsi otomatis menggunakan backend API
- Hasil dapat langsung dipaste ke editor lagu

### Cara Pakai

- Di form edit/tambah lagu, klik tombol "🎤 Transkripsi"
- Upload file audio
- Tunggu proses transkripsi selesai
- Paste hasil ke field lirik
