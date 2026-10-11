# Database

Basis data: **Turso (libSQL)** — SQLite terkelola, diakses via `@libsql/client`.
Skema utama: [`db/schema.sql`](../db/schema.sql) · Runner: [`runMigration.js`](../runMigration.js)

---

## Konvensi Umum

| Aspek | Aturan |
| --- | --- |
| Primary key | `TEXT` dengan default `lower(hex(randomblob(16)))` |
| Waktu | `TEXT` ISO-8601, default `datetime('now')` |
| Boolean | `INTEGER` 0/1 |
| JSON | Disimpan sebagai `TEXT`, default `'[]'` atau `'{}'`, di-parse di handler |
| Soft delete | Kolom `deletedAt TEXT`; query memakai `deletedAt IS NULL` |
| Optimasi | `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` (idempoten) |

---

## Diagram Relasi

```
                 ┌──────────┐
                 │  users   │
                 └────┬─────┘
        ┌─────────────┼──────────────┬───────────────┐
        │             │              │               │
   createdBy         userId         userId      bandId (FK)
        │             │              │               │
   ┌────▼─────┐  ┌────▼─────┐  ┌─────▼──────┐       │
   │  bands   │  │  songs   │  │   gigs     │       │
   └────┬─────┘  └────┬─────┘  └────────────┘       │
        │             │                             │
        │        ┌────▼──────────────┐              │
        │        │  band_members     │              │
        │        │  UNIQUE(band,user) │              │
        │        └───────────────────┘              │
        │                                            │
  ┌─────┴──────────┐   ┌──────────────┐              │
  │ practice_      │   │  setlists    │              │
  │ sessions       │   └──────┬───────┘              │
  └─────┬──────────┘          │                      │
        │              ┌──────▼───────┐              │
  ┌─────▼─────────────────▼──┐  ┌────▼───────┐        │
  │ band_song_practice_stats │  │ setlist_   │        │
  └──────────────────────────┘  │ songs      │        │
                                └────────────┘        │
                                                    │
   ┌────────────────────────┐   ┌──────────────────┐│
   │ band_song_preferences  │   │ song_user_mastery││
   └────────────────────────┘   └──────────────────┘│
                                                    │
        semua tabel di bawah attach ke bands ◄─────┘
```

---

## Tabel

### `users`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `email` | TEXT | UNIQUE, NOT NULL |
| `username` | TEXT | UNIQUE, NOT NULL |
| `passwordHash` | TEXT | bcrypt |
| `role` | TEXT | default `member` |
| `isActive` | INTEGER | default `1` |
| `createdAt` / `updatedAt` / `deletedAt` | TEXT | |

### `bands`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `name` | TEXT | NOT NULL |
| `createdBy` | TEXT | FK → `users.id`, NOT NULL |
| `description`, `genre` | TEXT | |
| `createdAt` / `updatedAt` / `deletedAt` | TEXT | |

### `band_members`

Tabel relasi user↔band dengan **peran**. Inilah sumber kebenaran sistem permission.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `bandId` | TEXT | FK → `bands.id` **CASCADE**, NOT NULL |
| `userId` | TEXT | FK → `users.id` **CASCADE**, NOT NULL |
| `role` | TEXT | `owner` / `admin` / `member` |
| `status` | TEXT | default `active` |
| `invitation` | TEXT | token undangan (fitur undangan telah dihapus) |
| `joinedAt` | TEXT | |
| `deletedAt` | TEXT | soft delete |
| — | UNIQUE | `(bandId, userId)` |

### `songs`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `title` | TEXT | NOT NULL |
| `artist`, `genre` | TEXT | |
| `youtubeId` | TEXT | untuk sinkronisasi video |
| `key` | TEXT | kunci lagu |
| `tempo` | TEXT | |
| `time_signature` | TEXT | Birama lagu (mis. `4/4`), default `4/4` |
| `arrangement_style` | TEXT | |
| `keyboard_patch` | TEXT | program MIDI |
| `lyrics` | TEXT | lirik berkord |
| `time_markers` | TEXT | JSON array, mis. `["00:32","01:10"]` |
| `sheet_music_xml` | TEXT | MusicXML untuk render partitur |
| `userId` | TEXT | FK → `users.id` |
| `bandId` | TEXT | FK → `bands.id` **SET NULL** |
| `createdAt` / `updatedAt` / `deletedAt` | TEXT | |

### `setlists`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | |
| `songs` | TEXT | JSON array id lagu, default `'[]'` |
| `setlistSongMeta` | TEXT | JSON object metadata per lagu, default `'{}'` |
| `completedSongs` | TEXT | JSON object status selesai, default `'{}'` |
| `userId` | TEXT | FK → `users.id` |
| `bandId` | TEXT | FK → `bands.id` **CASCADE** |
| `createdAt` / `updatedAt` / `deletedAt` | TEXT | |

> ⚠️ `bandId` memakai `ON DELETE CASCADE` — menghapus band ikut menghapus setlist-nya. Setlist individual (tanpa `bandId`) tetap aman.

### `setlist_songs`

Relasi terurut antara setlist dan lagu.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `setlist_id` | TEXT | FK → `setlists.id` **CASCADE**, NOT NULL |
| `song_id` | TEXT | FK → `songs.id` **CASCADE**, NOT NULL |
| `position` | INTEGER | urutan, default `0` |
| `meta` | TEXT | JSON default `'{}'` |
| `createdAt` / `updatedAt` | TEXT | |
| — | UNIQUE | `(setlist_id, song_id)` |

### `band_song_preferences`

Key default per lagu untuk sebuah band.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `bandId`, `songId` | TEXT | FK **CASCADE**, NOT NULL |
| `preferredKey` | TEXT | NOT NULL |
| `createdAt` / `updatedAt` | TEXT | |
| — | UNIQUE | `(bandId, songId)` |

### `song_user_mastery`

Status "sudah hafal" per lagu per user.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `songId`, `userId` | TEXT | FK **CASCADE**, NOT NULL |
| `mastered` | INTEGER | NOT NULL default `1` |
| `masteredAt` | TEXT | |
| `createdAt` / `updatedAt` | TEXT | |
| — | UNIQUE | `(songId, userId)` |

### `song_member_mastery` (legacy)

Tabel lama pelacakan hafal per anggota band. Dipertahankan untuk kompatibilitas mundur — backend (`api/songs`) melakukan backfill ke `song_user_mastery` bila tabel ini ada. Tidak dipakai untuk fitur baru.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `songId`, `bandId`, `userId` | TEXT | FK **CASCADE**, NOT NULL |
| `mastered` | INTEGER | NOT NULL default `1` |
| `masteredAt` | TEXT | |
| `createdAt` / `updatedAt` | TEXT | |
| — | UNIQUE | `(songId, userId)` |

### `practice_sessions`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `bandId` | TEXT | FK **CASCADE**, NOT NULL |
| `date` | TEXT | NOT NULL |
| `duration` | INTEGER | menit |
| `songs`, `songMeta` | TEXT | JSON |
| `notes` | TEXT | |
| `createdBy` | TEXT | FK → `users.id` |
| `createdAt` / `updatedAt` / `deletedAt` | TEXT | |

### `band_song_practice_stats`

Agregasi turunan dari `practice_sessions` untuk performa.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `bandId`, `songId` | TEXT | FK **CASCADE**, NOT NULL |
| `sessionCount` | INTEGER | default `0` |
| `practicedCount` | INTEGER | default `0` |
| `ratingAvg` | REAL | |
| `lastRating`, `lastPracticedAt` | | |
| `updatedAt` | TEXT | |
| — | UNIQUE | `(bandId, songId)` |

### `gigs`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | TEXT PK | |
| `bandId` | TEXT | FK **CASCADE**, NOT NULL |
| `venue` | TEXT | NOT NULL |
| `date` | TEXT | NOT NULL |
| `time` | TEXT | |
| `fee` | REAL | |
| `setlistId` | TEXT | FK → `setlists.id` |
| `notes` | TEXT | |
| `status` | TEXT | default `scheduled` |
| `userId` | TEXT | FK → `users.id` |
| `createdAt` / `updatedAt` / `deletedAt` | TEXT | |

---

## Index

| Index | Tabel |
| --- | --- |
| `idx_songs_title` | songs |
| `idx_setlists_name` | setlists |
| `idx_setlists_userId_updatedAt` | setlists |
| `idx_setlists_bandId_updatedAt` | setlists |
| `idx_bands_createdBy` | bands |
| `idx_band_members_bandId` / `_userId` / `_role` | band_members |
| `idx_setlist_songs_setlist_id_position` | setlist_songs |
| `idx_band_song_preferences_bandId_songId` | band_song_preferences |
| `idx_song_user_mastery_songId` / `_userId` | song_user_mastery |
| `idx_practice_sessions_bandId` | practice_sessions |
| `idx_band_song_practice_stats_band_song` | band_song_practice_stats |
| `idx_gigs_bandId` / `idx_gigs_status` | gigs |
| `idx_users_role` | users |

Daftar lengkap index ada di bagian akhir [`db/schema.sql`](../db/schema.sql), meliputi index setlist (`idx_setlists_userId_updatedAt`, `idx_setlists_bandId_updatedAt`), `band_song_preferences`, `song_user_mastery`, dan `song_member_mastery`.

---

## Migrasi & Skema

### Menjalankan

Seluruh skema (tabel, kolom, index) kini berada dalam satu file mandiri `db/schema.sql`. Untuk menyiapkan database baru cukup:

```bash
node runMigration.js schema.sql
```

Runner melakukan:
1. Memuat `.env.local` lalu `.env`
2. Membaca kredensial Turso (`rz_`/RZ_/prefix standar)
3. Membaca file dari folder `db/`
4. Memecah SQL per `;`, membuang baris komentar `--`, membuang statement kosong
5. Mengeksekusi berurutan
6. **Mengabaikan** error nonfatal: `already exists`, `no such column`, `duplicate column name`
7. Menampilkan `PRAGMA table_info` untuk seluruh tabel sebagai verifikasi

> Semua statement memakai `IF NOT EXISTS`, sehingga perintah di atas idempoten dan aman dijalankan berulang.

> 🔴 **Wajib:** sebelum menjalankan skrip yang bisa menghapus kolom, tabel, atau record, minta konfirmasi eksplisit pengguna terlebih dahulu.

### Riwayat Perubahan Skema

Migrasi bertahap (`migration_add_*.sql`) dahulu digunakan sebelum aplikasi masuk produksi. Saat ini seluruh perubahannya sudah dikonsolidasikan ke dalam `db/schema.sql` dan file migrasi terpisah sudah dihapus. Untuk perubahan schema ke depan, tambahkan langsung ke `db/schema.sql` dengan statement idempoten (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) — atau buat file migrasi baru di `db/` bila perlu upgrade DB produksi yang sudah berjalan.

### Upgrade DB Produksi yang Sudah Berjalan

> ⚠️ **Penting:** `db/schema.sql` **hanya** untuk menyiapkan database baru. Karena semua tabel memakai `CREATE TABLE IF NOT EXISTS`, menjalankannya pada DB yang sudah ada **tidak akan mengubah** tabel yang sudah terbuat — kolom/tabel baru tidak akan muncul.

DB produksi saat ini sudah berjalan dan tidak perlu menjalankan apa pun. Untuk memperkenalkan perubahan schema baru ke DB produksi, ikuti prosedur berikut:

**1. Perubahan aditif (kolom/tabel/index baru):**

```bash
# a. Tambahkan statement ke db/schema.sql agar DB baru tetap lengkap
#    (mis. ALTER TABLE songs ADD COLUMN foo TEXT; / CREATE TABLE IF NOT EXISTS ...)

# b. Jalankan file yang sama ke DB produksi — hanya statement yang belum
#    ada yang akan berefek; sisanya di-skip otomatis oleh runner
node runMigration.js schema.sql
```

Runner mengabaikan error nonfatal (`no such column`, `duplicate column name`, `already exists`), sehingga `ALTER TABLE ... ADD COLUMN` pada kolom yang sudah ada akan di-skip tanpa menghentikan proses.

**2. Perubahan destruktif (drop/rename kolom, ubah tipe, backfill data):**

- Buat file migrasi terpisah di `db/` (mis. `migration_<tanggal>_<deskripsi>.sql`).
- **Backup terlebih dahulu** lewat menu Tools → Backup Database, atau `scripts/backup-db.mjs`.
- 🔴 **Wajib minta konfirmasi eksplisit pengguna** sebelum menjalankannya, lalu jalankan:

```bash
node runMigration.js migration_<tanggal>_<deskripsi>.sql
```

**3. Update dokumentasi:** setelah perubahan diterapkan, perbarui tabel di dokumen ini (dan `db/schema.sql` bila belum) agar tetap sinkron.

> Tip: selalu uji perubahan pada database Turso terpisah/staging sebelum menjalankannya ke produksi.

---

## Contoh Query

**Semua lagu milik user beserta nama band:**
```sql
SELECT s.*, b.name AS bandName
FROM songs s
LEFT JOIN bands b ON b.id = s.bandId
WHERE s.userId = ? AND s.deletedAt IS NULL
ORDER BY s.createdAt DESC;
```

**Setlist yang bisa diakses user (personal + band):**
```sql
SELECT sl.* FROM setlists sl
LEFT JOIN band_members bm
  ON bm.bandId = sl.bandId AND bm.userId = ? AND bm.deletedAt IS NULL
WHERE sl.deletedAt IS NULL
  AND (sl.userId = ? OR bm.id IS NOT NULL);
```

**Peran user di sebuah band:**
```sql
SELECT role FROM band_members
WHERE bandId = ? AND userId = ? AND deletedAt IS NULL;
```
