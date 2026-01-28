# Copilot Instructions for Ronz Chord Pro

## Project Overview
- **Ronz Chord Pro** is a web app for managing chords, setlists, and music performances.
- The project is split into a React frontend (`src/`), a backend API (`api/`), and a database schema (`db/`).

## Key Directories
- `src/` — React components, pages, and utilities. Main entry: `src/App.jsx`.
- `api/` — Node.js backend API endpoints, organized by resource (e.g., `songs/`, `setlists/`).
- `db/` — SQL schema and migrations.
- `public/` — Static assets.

## Developer Workflows
- **Install dependencies:** `npm install`
- **Start dev server:** `npm run dev` (Vite-powered, serves frontend and API)
- **Run tests:** `npm test` (see `src/__tests__/` for examples)
- **Environment:** Copy `.env.example` to `.env` and fill required variables.

## Patterns & Conventions
- **API routes:** Each resource (e.g., songs, setlists) has its own folder in `api/` with `[id].js` for item routes and `index.js` for collection routes.
- **Component structure:** UI components in `src/components/`, page-level components in `src/pages/`.
- **Utilities:** Shared logic in `src/utils/` (e.g., `chordUtils.js`, `audio.js`).
- **Testing:** Place tests in `src/__tests__/`, use descriptive test names.
- **Styling:** Use `App.css` for global styles; component-specific styles inline or via CSS modules if present.

## Integration & Data Flow
- **Frontend ↔ Backend:** Frontend calls API endpoints in `api/` (see `src/apiClient.js`).
- **Database:** API uses SQL schema from `db/schema.sql`.
- **No external state management:** State is managed via React hooks and context.

## Examples
- To add a new API resource, create a folder in `api/`, add `index.js` and `[id].js`.
- To add a new page, create a component in `src/pages/` and update routing if needed.

## References
- See `README.md` for setup and workflow basics.
- See `src/apiClient.js` for API usage patterns.
- See `db/schema.sql` for DB structure.

---

**Keep instructions concise and up-to-date. Update this file if project structure or workflows change.**
