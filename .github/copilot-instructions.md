# Copilot Instructions — PerformerHub

## Project Overview
# Copilot Instructions — PerformerHub

## Project Overview
- React (Vite) frontend in `src/`, API routes in `api/`, DB schema in `db/`.
- Main entry: `src/App.jsx`.

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Tests: `npm test`
- Env: `.env.example` → `.env`

## Architecture
- API routes: `api/<resource>/index.js` and `api/<resource>/[id].js`.
- Frontend API calls via `src/apiClient.js`.
- State: React hooks + context only.

## UI Standards
- Layout: Sidebar (desktop) + mobile header with hamburger only.
- Avoid desktop top‑tab header.
- Pages: use `.page-container` + `.page-header` + cards/grids.
- Inputs in modals/forms: `.modal-input`.
- Styling: keep everything in `src/App.css`.
- Breakpoints: 1200px, 1024px, 768px, 600px.

## Conventions
- Components: `src/components/`
- Pages: `src/pages/`
- Utils: `src/utils/`
- Tests: `src/__tests__/`

## References
- `README.md`
- `src/apiClient.js`
- `db/schema.sql`

---
Keep this file concise and updated when structure/workflow changes.
- Main entry: `src/App.jsx`.
