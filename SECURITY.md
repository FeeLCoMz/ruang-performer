# Kebijakan Keamanan — Ruang Performer

## Melaporkan Kerentanan

Jika Anda menemukan kerentanan keamanan di Ruang Performer, **jangan buat issue publik**.

Laporkan via email ke: **support@ruangperformer.app**

Sertakan:
- Deskripsi kerentanan dan dampaknya
- Langkah-langkah untuk mereproduksi (PoC/screenshot bila ada)
- Versi/URL yang terdampak

Kami akan merespons dalam **7 hari** dan bekerja sama dengan Anda untuk perbaikan sebelum disclosure publik.

## Aturan untuk Kontributor

**JANGAN pernah commit:**
- `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` produksi — set di Vercel/CI sebagai environment variable
- `JWT_SECRET` produksi
- File `.env`, `.env.local`, `.env.production`
- Backup database (`backups/`) — berisi data pengguna nyata

Gunakan `.env.example` sebagai templat nilai lokal, dan `.env.test` (dummy) untuk pengujian.

## Pelaporan Otomatis

- **Dependabot** aktif untuk dependency & security alerts
- **Secret scanning** GitHub aktif — push yang mengandung secret akan ditolak

## Scope

Yang berlaku:
- Kode aplikasi (`src/`, `api/`, `scripts/`)
- Konfigurasi deployment (`vercel.json`, `twa-manifest.json`)

Tidak berlaku:
- Layanan pihak ketiga (Turso, Vercel, Google AI, YouTube)
- Penetration testing tanpa izin terhadap infrastruktur produksi
