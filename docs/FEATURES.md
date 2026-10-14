# Panduan Fitur

Dokumen ini menjelaskan fitur-fitur Ruang Performer dari sudut pandang pengguna maupun développeur.

---

## 1. Autentikasi

**Halaman:** `LoginPage.jsx`, `ResetPasswordPage.jsx`

| Fitur | Alur |
| --- | --- |
| Registrasi | Email + username + password → akun dengan role `member` |
| Login | Email + password → JWT disimpan di `localStorage` |
| Ingat sesi | `AuthProvider` memvalidasi ulang token via `GET /api/auth/me` saat mount |
| Ubah sandi | Wajib menyertakan password lama |
| Lupa sandi | Kirim email token reset; respons selalu sukses demi keamanan (tidak membocorkan apakah email terdaftar) |
| Hapus akun | Soft delete (`deletedAt`), data tidak dihapus fisik |

---

## 2. Dashboard

**Halaman:** `DashboardPage.jsx`

Ringkasan aktivitas: statistik lagu, setlist, gigs mendatang, dan sesi latihan. Didukung util `src/utils/dashboardUtils.js`.

---

## 3. Manajemen Lagu

**Halaman:** `SongListPage.jsx`, `SongAddEditPage.jsx`, `SongChordsPage.jsx`

### CRUD & Versi
- Tambah, edit, hapus lagu
- **Multi-versi**: `new-version/:id` membuat salinan lagu sebagai versi baru tanpa merusak versi lama

### Format Kord Kustom
Lirik disimpan sebagai teks dengan notasi kord dalam kurung siku:

```
[C]Twinkle twinkle little [Am]star
```

`src/utils/chordUtils.js` menyediakan:
- `transposeChord(chord, semitones)` — transposisi kord
- `parseChordLine(line)` — mengurai baris lirik berkord
- `ChordDisplay.jsx` merender token kord sebagai elemen interaktif

### Time Marker
Ditulis di dalam lirik, misalnya `[00:32]`. Dipakai untuk **sinkronisasi video YouTube** — klik marker akan seek player ke waktu tersebut.

### Sheet Music
Kolom `sheet_music_xml` (MusicXML) dirender oleh **OpenSheetMusicDisplay** melalui `SongSheetMusic.jsx`.

### Analisis Kord
`SongChordsAnalyzer.jsx` + `useChordStats.js` menampilkan statistik pemakaian kord (kord yang paling sering muncul, tingkat kesulitan, progresi umum) dalam **modal** yang dibuka lewat tombol "Analisis Chord".

### Panel Lirik & Chord (Song View)
Panel lirik/chord di halaman song view bersifat **read-only**. Kontrol edit lirik dan fullscreen tidak tersedia di sini; penyuntingan dilakukan lewat halaman tambah/edit lagu. Toolbar panel memuat **key/transpose + LED tempo**, **autoscroll lirik** (on/off + mode Musik/Manual + kecepatan), dan kontrol tampilan panggung (di bawah); pemutaran YouTube di panel media & kontrol fullscreen perf. Tombol **Export** berada di header info lagu (sebaris dengan Edit & Bagikan).

**Autoscroll lirik** di toolbar panel: gerak halus via requestAnimationFrame. Dua mode kecepatan — *Musik* (BPM mengikuti tempo lagu, dihitung dari tinggi baris + jumlah bar/chord per baris) dan *Manual* (level 1–10, 10–100 px/s). Reset kembali ke tempo lagu / level default.

Kontrol tampilan panggung di toolbar panel lirik (preferensi dipersist di localStorage):

| Kontrol | Fungsi |
| --- | --- |
| Font A− / A+ | Skala font lirik 85%–160%, realtime di panel |
| 🌙 Panggung | Mode kontras tinggi lokal di panel (teks putih, latar lebih gelap) |
| 🎯 Fokus | Sorot bagian (section) aktif, baris lain diredupkan |
| 🔓 Kunci | Lock layar — blok wheel/tap agar sentuhan tak sengaja tidak mengubah tampilan |
| ←/→ navigasi | Pindah lagu sebelumnya/berikutnya (hanya saat lagu dibuka dari setlist) |

### Mood & Genre
`src/utils/songMoodUtils.js` mengelompokkan lagu berdasarkan mood/genre untuk penyaringan.

### Mastery
Tandai lagu yang sudah dikuasai. Status disimpan per user di `song_user_mastery`, dan dapat dilihat anggota tim lain.

---

## 4. Setlist

**Halaman:** `SetlistPage.jsx`, `SetlistSongsPage.jsx`

| Fitur | Keterangan |
| --- | --- |
| CRUD setlist | Pribadi atau milik band |
| Urutan drag & drop | `@dnd-kit` + `@hello-pangea/dnd` |
| Metadata per lagu | Key, tempo, catatan transisi di setlist, terpisah dari metadata lagu asli |
| Auto Builder | Susun setlist otomatis dari kriteria |
| Smart Assistant | `setlistSmartAssistant.js` — saran urutan & kombinasi lagu |
| Poster setlist | `SetlistPoster.jsx` → ekspor PNG/PDF, lengkap dengan QR code |

Mode ringkas (`?summary=1`) mengambil data lebih ringan untuk daftar setlist.

---

## 5. Band & Anggota

**Halaman:** `BandManagementPage.jsx`, `BandDetailPage.jsx`

- Buat band (creator otomatis jadi `owner`)
- Tambah anggota berdasarkan email, ubah peran, kick anggota
- Detail band menampilkan anggota beserta peran, lagu, setlist, gigs, dan statistik latihan
- **Preferensi key per lagu** (`band_song_preferences`) — dipakai sebagai default saat menambahkan lagu ke setlist band

Peran diatur pada sistem permission; lihat [`PERMISSIONS.md`](PERMISSIONS.md).

---

## 6. Gigs / Pertunjukan

**Halaman:** `GigPage.jsx`

| Fitur | Keterangan |
| --- | --- |
| CRUD gig | Venue, tanggal, jam, fee, status, catatan |
| Setlist tertaut | Setiap gig dapat menunjuk satu setlist |
| Kalender | `CalendarView.jsx` menampilkan gigs dalam tampilan bulan |
| Unduh kalender | `calendarDownloadUtil.js` mengekspor `.ics` |
| Berbagi jadwal | `scheduleShareUtils.js` membuat tautan/ringkasan untuk dibagikan ke WhatsApp |

---

## 7. Latihan

Tabel `practice_sessions` mencatat sesi latihan per band: tanggal, durasi, lagu yang dilatih, rating, dan catatan. Statistik turunan disimpan di `band_song_practice_stats` agar performant.

---

## 8. Tema Tampilan

Aplikasi memakai mode gelap permanen — class `dark-mode` diterapkan pada `<body>`.

---

## 9. Offline

`src/utils/offlineCache.js` menyimpan data penting (setlist & lagu) agar tetap bisa diakses tanpa koneksi.

---

## 10. YouTube

| Komponen | Fungsi |
| --- | --- |
| `YouTubeViewer.jsx` | Player embed, seek via time marker |
| `FloatingYouTubePlayer.jsx` | Player mengambang yang tetap terlihat saat scroll |
| `YouTubeTrendingPage.jsx` | Eksplorasi lagu trending, simpan langsung ke repertoire |
| `youtubeUtils.js` | Ekstraksi & normalisasi YouTube ID dari URL |

Server menyediakan `POST /api/extract-chord` sebagai proxy untuk melewati batasan CORS saat mengambil HTML halaman.

---

## 11. Fitur AI

**Server:** `api/ai.js` (Google Gemini) · **UI:** `AIAutofillModal.jsx`

| Fitur | Keterangan |
| --- | --- |
| Autofill chord & lirik | Diberikan judul + artist, AI menghasilkan draf kord |
| Pencarian lagu AI | Metadata lagu dari judul/artist |
| Transkripsi audio | Unggah audio → teks lirik |
| Pilih model | Daftar model Gemini yang didukung, dapat dipilih user |

---

## 12. Alat Musik

| Alat | Lokasi |
| --- | --- |
| Virtual piano | `VirtualPiano.jsx` — keyboard interaktif (input MIDI didukung) |
| Metronom | `useMetronome.js` |
| Tap tempo | `TapTempo.jsx` |
| Kontrol tempo | `TempoControl.jsx` |
| Kontrol transpose | `TransposeKeyControl.jsx` |
| GM Soundbank | `gmSoundbank.js` |

---

## 13. Edit & Ekspor

### Editor Lirik
`SongLyricsEditorPanel.jsx` berbasis **Slate** (rich text) dengan `lyricsEditorUtils.js` dan `editorActionsUtils.js`.

### Ekspor
`exportUtil.js` mendukung ekspor ke PDF (`jsPDF`), PNG (`html2canvas` / `html-to-image`), dan dokumen kanvas (`fabric`).

---

## 14. Sistem & Admin

| Fitur | Halaman |
| --- | --- |
| **Tools** | Export/import seluruh data, backup & restore SQL |
| **Audit Log** | Riwayat aksi penting dengan tingkat severity (`auditLogger.js`) |
| **User Management** | Kelola user, ubah role, aktif/nonaktif, reset sandi (khusus owner) |
| **Analytics** | `analyticsUtil.js` mengirim event ke Google Analytics |
| **Web Vitals** | `webVitalsUtil.js` mengukur performa halaman |
| **Meta Tags** | `metaTagsUtil.js` mengatur meta tag dinamis per halaman |

---

## 15. Feedback & Error

| Komponen | Fungsi |
| --- | --- |
| `Toast.jsx` | Notifikasi sukses/error sementara |
| `ErrorBoundary.jsx` | Menangkap error render, mencegah white screen |
| `LoadingSkeleton.jsx` | Placeholder saat memuat data |
| `NotFound.jsx` | Halaman 404 |
| `PageLoader` | Fallback `Suspense` untuk lazy route |

---

## Referensi

- Endpoint API → [`API.md`](API.md)
- Struktur database → [`DATABASE.md`](DATABASE.md)
- Sistem permission → [`PERMISSIONS.md`](PERMISSIONS.md)