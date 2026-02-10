
# Copilot Instructions — Ruang Performer
## Permission Enforcement Policy (CRITICAL)

**ALWAYS check and enforce the permission system whenever adding, editing, or suggesting any CRUD (Create, Read, Update, Delete) button, action, or feature that requires user authorization.**

- For every new or modified UI element or API endpoint that allows data creation, editing, or deletion, you MUST:
  - Identify the relevant permission(s) and role(s) required for the action.
  - Use the appropriate permission check (e.g., `usePermission`, `canPerformAction`, `can()`, etc.) before rendering the button or enabling the action.
  - Ensure that unauthorized users cannot see or trigger the action, both in the UI and in the backend if relevant.
  - Add a code comment referencing the permission check if the logic is non-obvious.

**NEVER add a CRUD button, modal, or sensitive action without explicit permission logic.**

This applies to all pages, components, and API routes. If in doubt, ask for clarification or refer to `permissionUtils.js` and `usePermission.js`.


## Project Overview
**Ruang Performer** is a React (Vite) app for managing songs, setlists, bands, gigs, and practice sessions.
- **Frontend:** `src/` (React + React Router)
- **Backend:** `api/` (Vercel serverless functions)
- **Database:** Turso (libSQL) via `@libsql/client`
- **Entry:** `src/App.jsx`

## Commands

**PENTING:** Setelah memodifikasi file di folder `api/`, Anda harus merestart server lokal (`npm run dev:api` atau server Vercel/Express) agar perubahan API diterapkan.
```bash
npm install              # Install dependencies
npm run dev              # Dev server (port 5173, proxies /api to 3000)
npm run dev:api          # Local Express API (dev only)
npm run build            # Production build
npm test                 # Run Vitest tests
node runMigration.js <file>  # Run DB migration from db/
```

**Environment:** Copy `.env.example` → `.env` and set:
- `TURSO_DATABASE_URL` / `rz_TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN` / `rz_TURSO_AUTH_TOKEN`
- `JWT_SECRET` (auth token signing)

## Architecture

### Serverless API Pattern (Vercel)
- Routes defined in `vercel.json` using regex rewrites
- API handlers: `api/<resource>/index.js` (list/create) + `api/<resource>/[id].js` (get/update/delete)
- All handlers use `verifyToken(req, res)` from `api/_auth.js` for JWT validation
- DB client: `getTursoClient()` from `api/_turso.js` (env-aware, supports `rz_` prefixed vars)

**Example pattern** (`api/songs/[id].js`):
```javascript
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  const id = req.query.id || req.params.id; // Support Vercel + Express
  if (!verifyToken(req, res)) return; // Auth check
  
  const client = getTursoClient();
  // SQL operations...
}
```

### Frontend Data Flow
1. User actions → React components
2. API calls → `src/apiClient.js` (centralized fetch wrapper with `getAuthHeader()`)
3. Auth state → `AuthContext` (`src/contexts/AuthContext.jsx`)
4. Permissions → `usePermission(bandId, userBandInfo)` hook → `src/utils/permissionUtils.js`

**Auth flow:**
- JWT stored in `localStorage` (via `src/utils/auth.js`)
- Context provides: `user`, `isAuthenticated`, `login()`, `logout()`
- Protected routes check `isAuthenticated` in components

### Database Schema (`db/schema.sql`)
- **Multi-tenancy:** Songs/setlists have `userId` AND optional `bandId`
- **Band roles:** `band_members` table with `role` field (owner, admin, member, guest)
- **Permissions:** Role-based checks in `permissionUtils.js` (e.g., `canPerformAction('edit_setlist', role)`)
- **JSON columns:** `setlists.songs` (array), `setlistSongMeta` (object), `songs.time_markers` (array)

**Migration workflow:**
```bash
# Edit db/migrations_<name>.sql
node runMigration.js migrations_<name>.sql
```
Migrations split by `;`, skip `--` comments, run sequentially.

## UI Standards

### CSS Architecture (CRITICAL)
**Single source of truth:** `src/App.css` — NEVER use inline styles, CSS-in-JS, or CSS modules.

**Pattern:**
```jsx
// ✅ CORRECT
<div className="song-item">...</div>

// ❌ WRONG
<div style={{ padding: '16px' }}>...</div>
```

**CSS Variables (use these):**
```css
--primary-bg, --card-bg, --text-primary, --text-secondary
--border-color, --primary-accent, --transition
```

**Standard classes:**
- Layout: `.page-container`, `.page-header`, `.card`, `.grid`
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`
- Forms: `.modal-input`, `.modal`, `.modal-overlay`
- Components: `.sidebar`, `.song-item`, `.setlist-container`

**Responsive breakpoints:** 1200px, 1024px, 768px, 600px

### Layout Structure
- **Desktop:** Sidebar navigation (`.sidebar`)
- **Mobile:** Hamburger menu (NO top-tab header pattern)
- **Page template:**
```jsx
<div className="page-container">
  <div className="page-header">
    <h1>Title</h1>
  </div>
  <div className="card">Content...</div>
</div>
```

## Conventions

### Folder Structure
```
src/
├── components/   # Reusable UI (modals, controls, tokens)
├── pages/        # Route components (*Page.jsx)
├── contexts/     # React Context (AuthContext.jsx)
├── hooks/        # Custom hooks (usePermission.js)
├── utils/        # Pure functions (chordUtils, permissionUtils, auth, analytics)
└── __tests__/    # Vitest tests
```

### Naming Patterns
- **Pages:** `<Feature>Page.jsx` (e.g., `SongListPage.jsx`)
- **Components:** PascalCase (e.g., `ChordDisplay.jsx`)
- **Utils:** camelCase functions (e.g., `transposeChord()`)
- **API routes:** Match HTTP verbs (GET all → `index.js`, GET/PUT/DELETE one → `[id].js`)

### Special Utils to Know
- **`chordUtils.js`:** `transposeChord()`, `parseChordLine()` — music theory logic
- **`permissionUtils.js`:** Role-based permissions (owner > admin > member > guest)
- **`analyticsUtil.js`:** Google Analytics tracking (already integrated in pages)
- **`auditLogger.js`:** Audit trail constants (`AUDIT_ACTIONS`, `SEVERITY_LEVELS`)

## Key Integration Points

### Permission System
Always check permissions for band-related actions:
```javascript
import { usePermission } from '../hooks/usePermission.js';

const { can } = usePermission(bandId, userBandInfo);
if (can('edit_setlist')) { /* allow edit */ }
```

**Available actions:** `view_band`, `edit_band`, `manage_members`, `edit_setlist`, `delete_setlist`, etc.

### Chord Display System
Songs use custom chord notation parsed by `chordUtils.js`:
- Brackets `[Am]` → clickable chord tokens
- Time markers `[00:32]` → clickable timestamps (for YouTube sync)
- Handles transposition, capo, key signatures

### Analytics (Already Integrated)
Track events via `analyticsUtil.js`:
```javascript
import { trackSongAction } from '../utils/analyticsUtil.js';
trackSongAction('view', songTitle); // Auto-sends to GA
```

## References
- **Architecture:** `vercel.json` (routing), `vite.config.js` (proxy), `api/_turso.js`, `api/_auth.js`
- **Auth flow:** `src/contexts/AuthContext.jsx`, `src/utils/auth.js`
- **Permissions:** `src/utils/permissionUtils.js`, `src/hooks/usePermission.js`
- **DB schema:** `db/schema.sql`
- **Features:** `FEATURES.md` (analytics, service worker, web vitals)
