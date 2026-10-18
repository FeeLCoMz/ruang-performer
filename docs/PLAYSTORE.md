# Panduan Publikasi ke Google Play Store

Ruang Performer adalah PWA. Cara paling efisien untuk masuk Play Store adalah
membungkusnya sebagai **TWA (Trusted Web Activity)** â€” tanpa menulis ulang kode
native. Panduan ini mencakup seluruh alur dari persiapan hingga rilis.

---

## 1. Checklist Kesiapan (status proyek)

| Item | Status | Lokasi |
| --- | --- | --- |
| `manifest.json` lengkap (name, icons, maskable, shortcuts, screenshots) | âœ… | `public/manifest.json` |
| Service Worker (offline support) | âœ… | `public/sw.js` (register di `src/main.jsx`) |
| Ikon PWA 72â€“512px + maskable | âœ… | `public/icon-*.png` (`npm run generate-icons`) |
| Feature graphic 1024Ã—500 | âœ… | `public/feature-graphic.png` |
| Screenshot 1080Ã—1920 | âœ… | `public/screenshots/` (9 file) |
| Halaman Privacy Policy | âœ… | `public/privacy.html` â†’ `https://ruang-performer.vercel.app/privacy.html` |
| Digital Asset Links | âš ï¸ perlu fingerprint | `public/.well-known/assetlinks.json` |
| Konfigurasi TWA | âœ… | `twa-manifest.json` (Bubblewrap) |
| Domain produksi HTTPS | âœ… | `https://ruang-performer.vercel.app` (Vercel) |

> Catatan: semua panggilan API memakai path relatif (`/api/...`) melalui
> `src/apiClient.js`, sehingga TWA di domain produksi akan otomatis memakai
> backend yang sama. Tidak ada perubahan kode diperlukan.

---

## 2. Buat Akun & Aset Play Store

1. Daftar **Google Play Developer** â€” biaya one-time **US$25**
   â†’ https://play.google.com/console
2. Siapkan aset listing:
   - Ikon app **512Ã—512 PNG** (sudah ada: `public/icon-512x512.png`)
   - **Feature graphic 1024Ã—500** (sudah ada: `public/feature-graphic.png`)
   - **Screenshots phone** minimal 2, idealnya 8 (sudah ada 9 di `public/screenshots/`)
   - Deskripsi singkat (â‰¤80 karakter) & lengkap (â‰¤4000 karakter)
   - Kategori: *Music & Audio* atau *Productivity*
3. Isi **Data Safety form** di Play Console sesuai isi `privacy.html`
   (data dikumpulkan: email, konten buatan pengguna, audit log; data dienkripsi
   in-transit; ada fitur hapus akun).

---

## 3. Build AAB dengan PWABuilder (cara termudah)

1. Deploy ke produksi dulu (`git push` â†’ Vercel).
2. Buka https://www.pwabuilder.com â†’ masukkan `https://ruang-performer.vercel.app`.
3. Pastikan skor manifest & service worker hijau (seharusnya lolos).
4. Klik **Package for stores â†’ Android**.
5. Isi:
   - **Package ID**: `com.ruangperformer.app` (sudah dipakai di `assetlinks.json`)
   - **App name**: `Ruang Performer`
   - **Signing key**: pilih *Generate new* lalu **simpan file key & password
     dengan aman** â€” key yang sama wajib dipakai untuk semua update berikutnya.
6. Unduh paket. Isinya:
   - `app-release-bundle.aab` â†’ di-upload ke Play Console
   - `assetlinks.json` â†’ berisi SHA-256 fingerprint cert kamu

### Alternatif: Bubblewrap CLI (konfigurasi sudah disiapkan)

Repo ini sudah berisi `twa-manifest.json` (packageId `com.ruangperformer.app`,
splash `#0f0f0f`, theme `#667eea`, shortcuts Setlist/Konser/Lagu). Langkahnya:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://ruang-performer.vercel.app/manifest.json
# Saat ditanya manifest, Bubblewrap bisa memakai twa-manifest.json lokal:
#   bubblewrap init --manifest=./twa-manifest.json
# Ia akan meminta password untuk membuat android.keystore â€” SIMPAN file & password ini.
bubblewrap build   # hasil: app-release-bundle.aab + assetlinks.json
```

Untuk update versi: naikkan `appVersionCode` dan `appVersionName` di
`twa-manifest.json`, lalu jalankan `bubblewrap update` dan build ulang.

---

## 4. Pasang Digital Asset Links

Agar TWA tampil **tanpa URL bar browser** (syarat pengalaman fullscreen dan
pemeriksaan Google):

1. Ambil isi `assetlinks.json` dari hasil build (berisi fingerprint asli),
   atau ambil fingerprint dari keytool:
   ```bash
   keytool -list -v -keystore android.keystore -alias android
   # salin nilai SHA-256
   ```
2. Ganti `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` di
   `public/.well-known/assetlinks.json` dengan nilai SHA-256 tersebut.
3. Deploy ulang, lalu verifikasi:
   `https://ruang-performer.vercel.app/.well-known/assetlinks.json` harus bisa
   diakses publik dan JSON-nya valid.
4. Tes di perangkat Android: buka link aplikasi â€” tidak boleh muncul browser bar.

---

## 5. Upload ke Play Console

1. Buat aplikasi baru â†’ pilih **App** (bukan Game), gratis.
2. Isi store listing (aset dari langkah 2).
3. **Testing**: mulai dari *Internal testing* (upload AAB ke track internal,
   tambahkan tester via email) untuk memastikan TWA jalan mulus.
4. Naik ke *Closed testing* (Play Console baru mewajibkan minimal 20 tester
   closed-test â‰¥14 hari untuk akun baru) sebelum **Production**.
5. Lengkapi:
   - App content: privacy policy URL (`https://ruang-performer.vercel.app/privacy.html`),
     iklan (tidak ada), target audience, Data Safety.
6. Submit untuk review. Review pertama biasanya 1â€“7 hari.

---

## 6. Update Aplikasi di Masa Depan

1. Ubah versi web & deploy ke produksi.
2. Naikkan `versionCode` di konfigurasi Bubblewrap/PWABuilder (`twa-manifest.json`).
3. `bubblewrap update` (atau build ulang di PWABuilder) â†’ upload AAB baru ke
   Play Console. Pengguna Android otomatis memuat versi web terbaru karena
   kontennya live dari web.

---

## 7. Troubleshooting Umum

| Masalah | Penyebab & solusi |
| --- | --- |
| URL bar muncul di TWA | `assetlinks.json` fingerprint salah / belum deploy. Cek via https://developers.google.com/digital-asset-links/tools/generator |
| Layar putih saat offline | Pastikan SW ter-register (`src/main.jsx` hanya di PROD) dan cache `/index.html` |
| Notifikasi 401 terus-menerus | Token localStorage tidak terbawa â€” pastikan domain TWA sama dengan domain login |
| Review ditolak | Umumnya karena privacy policy tidak lengkap atau Data Safety tidak cocok dengan perilaku app |
