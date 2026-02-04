# PerformerHub

Aplikasi web untuk manajemen chord, setlist, dan performa musik.

## Struktur Folder

## Instalasi
```bash
npm install
```

## Menjalankan
```bash
npm run dev
```

## Testing
```bash
npm test
```

## Environment
Lihat `.env.example` untuk variabel yang dibutuhkan.

## Kontribusi
Pull request dan issue dipersilakan.

---

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