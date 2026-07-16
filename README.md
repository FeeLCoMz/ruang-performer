
# Ruang Performer

Aplikasi web untuk manajemen chord, setlist, band, dan performa musik. Mendukung multi-user, multi-band, backup SQL, serta sistem permission berbasis role.

## Struktur Folder

```
src/            # Frontend React (pages, components, hooks, utils)
api/            # Serverless API (Vercel/Express, Turso/libSQL)
db/             # Skema dan migrasi database
public/         # Static assets
__tests__/      # Unit test (Vitest/Jest)
```

## Fitur Utama
- Manajemen lagu, setlist, band, dan gigs
- Sistem permission role-based (owner, admin, member, guest)
- Backup & restore database ke file SQL (dump) dan JSON
- Otentikasi JWT, 2FA, audit log, analytics
- UI responsif, dark mode, dan komponen custom

## Instalasi
```bash
npm install
```

## Menjalankan
```bash
npm run dev         # Frontend (Vite, port 5173)
npm run dev:api     # API server lokal (Express, port 3000)
```

## Backup Database (SQL)
- Gunakan menu "Backup Database" di halaman Tools (khusus owner)
- File .sql berisi CREATE TABLE & INSERT, cocok untuk restore manual
- Pastikan routing/proxy sudah mengarah ke /api/tools/backup

## Routing & Proxy
- Vercel: routing diatur di vercel.json
- Dev lokal: Express (api/index.js) harus punya route khusus untuk /api/tools/backup sebelum catch-all /api/tools
- Vite proxy: sudah otomatis ke http://localhost:3000 untuk /api

## Environment
Lihat `.env.example` untuk variabel yang dibutuhkan (TURSO_DATABASE_URL, JWT_SECRET, dsb).

## Kontribusi
Pull request dan issue dipersilakan.

----

## 🚦 Permission Example

### Frontend (React)
```jsx
import { usePermission } from './hooks/usePermission';
const { can } = usePermission(bandId, userBandInfo);
if (can('edit_setlist')) {
	// Show edit button
}
```

### Backend (API)
```js
if (!userHasPermission(userId, 'edit_setlist')) {
	return res.status(403).json({ error: 'You do not have permission to edit this setlist.' });
}
```

---

## 🛡️ Error Handling Example

### Frontend
```jsx
{error && <div className="error-text">{error}</div>}
// Use <ErrorBoundary> for global error fallback
```

### Backend
```js
try {
	// ...
} catch (err) {
	res.status(400).json({ error: err.message || 'Input tidak valid' });
}
```

---

## 🧪 Testing Example

### Frontend (Vitest)
```js
import { canPerformAction } from '../utils/permissionUtils';
test('owner can edit setlist', () => {
	expect(canPerformAction('edit_setlist', 'owner')).toBe(true);
});
```

### Backend (Jest)
```js
const { userHasPermission } = require('../utils/permissionUtils');
test('admin can delete band', () => {
	expect(userHasPermission('admin', 'delete_band')).toBe(true);
});
```