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
- **CSS Only**: All styling MUST use `src/App.css`. Never use inline `style={}`, CSS-in-JS, or CSS modules.
  - Add classes to JSX elements (e.g., `<div className="song-item">`).
  - Define styles in `src/App.css` using CSS classes and CSS variables.
  - Use CSS variables for colors, spacing, transitions: `--primary-bg`, `--text-primary`, etc.
- Breakpoints: 1200px, 1024px, 768px, 600px.
- Standard classes: `.page-container`, `.page-header`, `.card`, `.btn`, `.btn-primary`, `.modal`, `.modal-input`, `.sidebar`, etc.

## Conventions
- Components: `src/components/`
- Pages: `src/pages/`
- Utils: `src/utils/`
- Tests: `src/__tests__/`

## CSS & Styling Rules
- **All styling goes in `src/App.css`** - this is the single source of truth.
- Never use inline styles (`style={{...}}`).
- Never use CSS modules or styled-components.
- Always add `className` to JSX elements.
- Examples of good class names: `.song-item`, `.setlist-container`, `.modal-overlay`, `.btn-primary`, `.info-text`, `.error-text`.
- Use CSS variables for consistency:
  - Colors: `--primary-bg`, `--card-bg`, `--text-primary`, `--text-secondary`, `--border-color`, `--primary-accent`
  - Spacing: padding, margin in standard units (8px, 16px, 24px)
  - Transitions: `--transition: 0.2s ease` for smooth interactions
- Media queries: `@media (max-width: 1200px)`, `@media (max-width: 768px)`, etc.
- Always define responsive styles (mobile first or mobile-last, be consistent).

## References
- `README.md`
- `src/apiClient.js`
- `db/schema.sql`

---
Keep this file concise and updated when structure/workflow changes.
- Main entry: `src/App.jsx`.
