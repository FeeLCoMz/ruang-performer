# Sistem Permission

Otorisasi Ruang Performer bersifat **per-band**, berbasis peran (role-based access control).
Implementasi utama: [`src/utils/permissionUtils.js`](../src/utils/permissionUtils.js) · Hook: [`src/hooks/usePermission.js`](../src/hooks/usePermission.js)

---

## Konsep

Permission bersifat **dua dimensi**:

1. **Peran global** — `users.role` (`owner` / `admin` / `member`), governs akses seluruh sistem seperti User Management dan Tools.
2. **Peran band** — `band_members.role`, governs akses ke konten sebuah band (lagu, setlist, gigs, anggota).

Ketika user berinteraksi dengan konten yang punya `bandId`, peran **band** yang dipakai.

```javascript
// src/utils/permissionUtils.js
resolveUserBandRole(userBandInfo, bandId)
```
Mencari entri band yang cocok berdasarkan `bandId || id`, lalu mengembalikan `role`. Hasil `null` berarti user bukan anggota — seluruh permission otomatis bernilai `false`.

---

## Daftar Permission

Didefinisikan pada konstanta `PERMISSIONS` dengan format `<domain>:<action>`.

| Konstanta | Nilai |
| --- | --- |
| `BAND_CREATE` | `band:create` |
| `BAND_EDIT` | `band:edit` |
| `BAND_DELETE` | `band:delete` |
| `BAND_VIEW` | `band:view` |
| `MEMBER_INVITE` | `member:invite` |
| `MEMBER_REMOVE` | `member:remove` |
| `MEMBER_CHANGE_ROLE` | `member:change_role` |
| `MEMBER_VIEW` | `member:view` |
| `SONG_CREATE` | `song:create` |
| `SONG_EDIT` | `song:edit` |
| `SONG_DELETE` | `song:delete` |
| `SONG_VIEW` | `song:view` |
| `SETLIST_CREATE` | `setlist:create` |
| `SETLIST_EDIT` | `setlist:edit` |
| `SETLIST_DELETE` | `setlist:delete` |
| `SETLIST_VIEW` | `setlist:view` |
| `GIG_EDIT` | `gig:edit` |
| `ADMIN_MANAGE_ROLES` | `admin:manage_roles` |
| `ADMIN_VIEW_LOGS` | `admin:view_logs` |

---

## Matriks Peran

### `owner`

| Domain | Permission |
| --- | --- |
| Band | create, edit, **delete**, view |
| Anggota | invite, remove, change_role, view |
| Lagu | create, edit, delete, view |
| Setlist | create, edit, delete, view |
| Gig | edit |
| Admin | manage_roles, view_logs |

### `admin`

| Domain | Permission |
| --- | --- |
| Band | edit, view (tanpa create/delete) |
| Anggota | invite, remove, change_role, view |
| Lagu | create, edit, delete, view |
| Setlist | create, edit, delete, view |
| Gig | edit |
| Admin | view_logs (tanpa manage_roles) |

### `member`

| Domain | Permission |
| --- | --- |
| Band | view |
| Anggota | view |
| Lagu | **create**, view (tanpa edit/delete) |
| Setlist | view saja |
| Gig | — |

> ⚠️ Perbedaan penting dari `owner`/`admin`: **member boleh menambah lagu tetapi tidak boleh mengedit atau menghapus.** Ini adalah keputusan desain yang disengaja untuk mencegah anggota tim merusak repertoire band.

### `guest`

Tidak didefinisikan pada `ROLE_PERMISSIONS` — selalu ditolak karena `hasPermission()` jatuh ke array kosong.

### Hierarki

```javascript
getRoleHierarchy() → { owner: 3, admin: 2, member: 1 }
isRoleHigherThan(role1, role2)
```
Digunakan untuk mencegah owner/admin menurunkan peran yang setara atau di atasnya.

---

## Helpers

| Fungsi | Kegunaan |
| --- | --- |
| `resolveUserBandRole(userBandInfo, bandId)` | Mencari peran user di band tertentu |
| `hasPermission(role, permission)` | Cek satu permission |
| `hasAllPermissions(role, permissions[])` | Cek semua permission terpenuhi |
| `hasAnyPermission(role, permissions[])` | Cek salah satu permission terpenuhi |
| `getPermissionsForRole(role)` | Semua permission sebuah peran |
| `canPerformAction(user, bandId, userBandInfo, permission)` | Cek izin dengan konteks lengkap |
| `isValidRole(role)` / `getAllRoles()` | Validasi peran |
| `canEditSetlist(setlist, userBandInfo, user)` | Helper tingkat tinggi untuk setlist |
| `canDeleteSetlist(setlist, userBandInfo, user)` | Helper tingkat tinggi untuk setlist |

---

## Penggunaan

### Hook `usePermission`

```javascript
import { usePermission } from '../hooks/usePermission.js';

function SongList({ bandId, userBandInfo }) {
  const { can, canAll, canAny, isOwner, isAdmin, isMember, getRole, getPermissions }
    = usePermission(bandId, userBandInfo);

  return (
    <>
      {can('song:create') && <button>Tambah Lagu</button>}
      {canAll(['song:edit', 'song:delete']) && <button>Admin Lagu</button>}
      {canAny(['band:edit', 'band:delete']) && <button>Kelola Band</button>}
      {isOwner() && <button>Pengaturan Band</button>}
    </>
  );
}
```

### Komponen `PermissionGate`

```jsx
import { PermissionGate } from '../hooks/usePermission.js';

<PermissionGate permission="setlist:delete" userRole={role} fallback={<span>Akses dibatasi</span>}>
  <button>Hapus Setlist</button>
</PermissionGate>
```

Dengan `type` menentukan mode: `single` (default), `all`, atau `any`.

---

## Aturan Penerapan

### Wajib

1. **Setiap** tombol atau aksi CRUD harus memiliki cek permission eksplisit — baik di UI maupun di backend.
2. Gunakan `PERMISSIONS.*`, bukan string literal, agar tidak ada typo.
3. Backend adalah otoritas akhir. Filter query harus membatasi data yang dikembalikan sesuai cakupan user, bukan hanya menyembunyikan tombol.
4. Jika logika permission tidak jelas, tambahkan komentar kode yang menyebut permission yang dicek.

### Hindari

```jsx
// ❌ Tombol CRUD tanpa permission
<button onClick={handleDelete}>Hapus</button>

// ❌ Menyembunyikan UI tapi backend tetap terbuka
// (backend wajib punya verifyToken + pengecekan peran)
```

---

## Fallback pada Backend

Handler server melakukan verifikasi peran secara langsung, misalnya:

- `api/bands/[id].js` — `DELETE` hanya untuk owner
- `api/setlists/index.js` — `DELETE` mengecek permission konstanta
- `api/songs/[id].js` — `DELETE` berdasarkan kepemilikan (`userId`)
- `api/users/*` — khusus `role: 'owner'` (global)

Dokumentasi developer terkait aturan ini ada di `.github/copilot-instructions.md` — **policy confirming**: setiap perubahan CRUD wajib disertai permission check.

---

## Ringkasan Alur Otorisasi

```
Pengguna klik tombol
       │
       ▼
usePermission(bandId, userBandInfo).can('song:edit')
       │
       ├── false → tombol tidak dirender
       │
       └── true → request dikirim
                    │
                    ▼
            verifyToken(req, res)  ← JWT valid?
                    │
                    ▼
            Cek peran di band_members / users.role
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
        403               200 + data
```