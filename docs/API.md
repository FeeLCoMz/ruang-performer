# Referensi API

Base URL: `/api` · Autentikasi: **JWT Bearer token** · Format: JSON (kecuali `/api/tools/backup` yang mengembalikan teks SQL)

Semua endpoint tercetak **🔒** memerlukan header:
```
Authorization: Bearer <token>
```

Karena handler ditulis secara isomorfis, satu kontrak endpoint dilayani oleh dua rute fisik:

| Runtime | Rute |
| --- | --- |
| Vercel | rewrite regex di `vercel.json` → file handler |
| Express | registrasi di `api/index.js` |

---

## 1. Health Check

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/status` | ❌ | `{ status: "ok", timestamp }` |
| `GET` | `/` | ❌ | Teks: `Ruang Performer API is running` |

## 2. Autentikasi — `/api/auth`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | ❌ | `{ email, username, password }` → membuat user baru (role `member`) |
| `POST` | `/api/auth/login` | ❌ | `{ email, password }` → `{ token, user }` |
| `GET` | `/api/auth/me` | 🔒 | Profil user saat ini |
| `PUT` | `/api/auth/me` | 🔒 | Ubah profil (mis. nama/username) |
| `POST` | `/api/auth/change-password` | 🔒 | `{ oldPassword, newPassword }` |
| `POST` | `/api/auth/forgot-password` | ❌ | `{ email }` → kirim email reset (selalu respons sukses) |
| `POST` | `/api/auth/reset-password` | ❌ | `{ token, email, newPassword }` |
| `GET` | `/api/auth/user-audit-logs` | 🔒 | Riwayat audit milik user sendiri |
| `DELETE` | `/api/auth/delete-account` | 🔒 | Hapus akun (soft delete) |

Rate limit ketat: login 5/15 menit; register/forgot/reset 3/jam.

## 3. Lagu — `/api/songs`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/songs` | 🔒 | Daftar lagu. Query: `include=trending`, `bandId`, `summary`, `search` |
| `POST` | `/api/songs` | 🔒 | Buat lagu baru |
| `GET` | `/api/songs/:id` | 🔒 | Detail satu lagu |
| `PUT` / `PATCH` | `/api/songs/:id` | 🔒 | Update lagu |
| `DELETE` | `/api/songs/:id` | 🔒 | Soft delete lagu |
| `GET` | `/api/songs/:id/mastery` | 🔒 | Daftar user yang sudah menguasai lagu ini |
| `PUT` / `PATCH` | `/api/songs/:id/mastery` | 🔒 | Set/unset mastery. Body: `{ mastered: true\|false }` |

Respons `GET /api/songs` dengan `include=trending`:
```json
{ "songs": [ ... ], "trending": [ ... ] }
```

Respons mastery:
```json
{
  "songId": "...",
  "mastered": true,
  "masteredBy": ["userId1", "userId2"],
  "isMasteredByCurrentUser": true
}
```

> **Kolom lagu:** `title`, `artist`, `youtubeId`, `key`, `tempo`, `genre`, `lyrics`, `time_markers`, `time_signature`, `arrangement_style`, `keyboard_patch`, `sheet_music_xml`, `userId`, `bandId`.

## 4. Setlist — `/api/setlists`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/setlists` | 🔒 | Daftar setlist yang diakses user. Query `summary=1` untuk ringkasan ringan |
| `POST` | `/api/setlists` | 🔒 | Buat setlist |
| `GET` | `/api/setlists/:id` | 🔒 | Detail setlist |
| `PUT` / `PATCH` | `/api/setlists/:id` | 🔒 | Update setlist / urutan lagu |
| `DELETE` | `/api/setlists/:id` | 🔒 | Hapus setlist |

Hanya mengembalikan setlist milik user atau setlist band yang user jadi anggota aktifnya.

## 5. Band — `/api/bands`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/bands` | 🔒 | Band yang user ikuti (dengan `role` milik user di band tsb) |
| `POST` | `/api/bands` | 🔒 | Buat band (creator menjadi `owner`) |
| `GET` | `/api/bands/:id` | 🔒 | Detail band + anggota |
| `PUT` | `/api/bands/:id` | 🔒 | Update band |
| `DELETE` | `/api/bands/:id` | 🔒 | Hapus band (hanya owner) |

### Anggota band — `/api/bands/:id/members`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/bands/:id/members` | 🔒 | Daftar anggota |
| `POST` | `/api/bands/:id/members` | 🔒 | Tambah anggota. Body: `{ email, role }` |
| `PATCH` | `/api/bands/:id/members/:userId` | 🔒 | Ubah peran anggota |
| `DELETE` | `/api/bands/:id/members/:userId` | 🔒 | Kick anggota |

> Di Vercel, rute ini dipetakan lewat regex: `/api/bands/([^/]+)/members(?:/([^/]+))?` → `api/bands/members.js?id=$1&userId=$2`.

## 6. Gig & Latihan — `/api/events`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/events/gig?bandId=` | 🔒 | Daftar gigs (opsional filter `bandId`) |
| `POST` | `/api/events/gig` | 🔒 | Buat gig |
| `GET` | `/api/events/gig/:id` | 🔒 | Detail gig |
| `PUT` / `PATCH` | `/api/events/gig/:id` | 🔒 | Update gig |
| `DELETE` | `/api/events/gig/:id` | 🔒 | Hapus gig |

> **Kolom gig:** `bandId`, `venue`, `date`, `time`, `fee`, `setlistId`, `notes`, `status` (`scheduled`/dst), `userId`.

Tipe `practice` ditangani oleh tabel `practice_sessions` melalui handler yang sama.

## 7. Manajemen User (Owner) — `/api/users`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/users` | 🔒 | Daftar semua user (khusus owner) |
| `GET` | `/api/users/:id` | 🔒 | Detail user |
| `PUT` | `/api/users/:id` | 🔒 | Update user (role, `isActive`) |
| `DELETE` | `/api/users/:id` | 🔒 | Soft delete user |
| `POST` | `/api/users/:id/reset-password` | 🔒 | Reset sandi user lain |

## 8. Alat & Backup — `/api/tools`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/tools` | 🔒 | Export seluruh data (JSON) |
| `POST` | `/api/tools` | 🔒 | Import data. Body: `{ songs, setlists, bands, users }` (overwrite) |
| `GET` | `/api/tools/backup` | 🔒 | Dump SQL database (respons `text`) |
| `POST` | `/api/tools/restore` | 🔒 | Restore dari SQL dump |

> ⚠️ `POST /api/tools` dan `/api/tools/restore` menulis menimpa data. Akses dibatasi untuk owner.

## 9. AI — `/api/ai`

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `POST` | `/api/ai` | ❌* | Chat/isi: `{ prompt, context, system, model }` |
| `GET` | `/api/ai/list-models` | ❌* | Daftar model Gemini yang didukung |
| `POST` | `/api/ai/song-search` | ❌* | Cari metadata lagu via AI |
| `POST` | `/api/ai/transcribe` | ❌* | Transkripsi audio (multipart) |

> \* Endpoint AI tidak dipasang di belakang `verifyToken` pada Express, namun tetap melalui limiter dan memerlukan `GEMINI_API_KEY` yang valid.

Model teks yang didukung didefinisikan di `api/ai.js` (`GEMINI_TEXT_MODELS_SUPPORTED`), antara lain `gemini-2.5-flash`.

## 10. Ekstraksi Kord

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| `POST` | `/api/extract-chord` | ❌ | `{ url }` → fetch HTML halaman untuk di-parse chord di client |

Endpoint ini adalah **proxy CORS bypass**: server mengunduh halaman dan mengembalikan HTML-nya agar bisa di-parsing di browser.

---

## Konvensi

**Header**
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Status code**
| Code | Makna |
| --- | --- |
| `200` | Berhasil |
| `201` | Resource dibuat |
| `400` | Body/query tidak valid |
| `401` | Token hilang, invalid, atau kedaluwarsa |
| `403` | Tidak punya izin (peran tidak sesuai) |
| `404` | Resource tidak ditemukan |
| `405` | Method tidak didukung |
| `429` | Rate limit terlampaui |
| `500` | Kesalahan server |

**Format error**
```json
{ "error": "pesan dalam bahasa Indonesia" }
```

**Contoh header `Allow` pada method tidak didukung**
```json
{ "error": "Method not allowed" }
```
