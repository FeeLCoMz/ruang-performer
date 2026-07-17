
# Vercel Deployment Guide

## 🚀 Siap Deploy ke Vercel

### Struktur & Routing
- Semua endpoint API diletakkan di folder `api/` (pattern Vercel)
- Routing diatur di `vercel.json` (pastikan route khusus seperti `/api/tools/backup` ada sebelum catch-all `/api/tools`)
- Untuk dev lokal, Express harus punya route khusus `/api/tools/backup` sebelum `/api/tools` agar backup SQL berjalan benar

### Fitur Utama yang Didukung
- ✅ Auth (login, register, reset)
- ✅ Manajemen lagu, setlist, band, gigs, latihan
- ✅ Backup & restore database (SQL & JSON)
- ✅ AI autofill, permission, audit log, rate limit

### Backup SQL
- Endpoint `/api/tools/backup` menghasilkan file .sql (CREATE TABLE + INSERT)
- Pastikan route ini tidak tertimpa oleh `/api/tools` di Express/dev

### Langkah Deploy


```bash
# 1. Test lokal
npm run dev
npm run dev:api

# 2. Deploy ke Vercel
vercel --prod

# 3. Cek function count di Vercel Dashboard
# Settings → Functions → Harus ≤12 functions (free tier)
```


### Catatan Produksi
- Semua fitur utama berjalan (auth, songs, setlists, bands, backup SQL)
- Endpoint backup SQL harus dicek routing-nya jika restore/manual
- Frontend tetap tanpa perubahan
- Semua API call kompatibel dengan Vercel
**Total: 13 functions** ✅ (Vercel counts 12 after consolidation)

