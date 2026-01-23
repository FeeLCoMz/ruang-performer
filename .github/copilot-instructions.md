

# Copilot & AI Agent Instructions for RoNz Chord Pro

## Project Overview
RoNz Chord Pro is a React (Vite) app for managing, displaying, and editing song chords/lyrics, supporting both ChordPro and standard (chord-above-lyrics) formats. It features cloud sync (Turso/libsql via Vercel serverless API), local storage fallback, and advanced UI for musicians.

## Architecture & Data Flow
- **Frontend:**
  - Entry: `src/main.jsx`, root: `src/App.jsx`
  - UI: Component-driven (`src/components/`), e.g. `ChordDisplay.jsx`, `SongForm.jsx`, `SetListForm.jsx`, `YouTubeViewer.jsx`
  - State/data: Custom hooks in `src/hooks/` (e.g. `useSongs.js`, `useSetLists.js`, `useDatabase.js`)
  - Utilities: `src/utils/` (e.g. `chordUtils.js`, `musicNotationUtils.js`)
- **Backend API:**
  - Vercel serverless functions in `api/` (see `api/songs/`, `api/setlists/`, `api/ai/`)
  - DB schema: `db/schema.sql`
  - Endpoints: `/api/songs`, `/api/setlists`, `/api/ai/song-search` (CRUD, JSON)
- **AI Integration:**
  - Main UI: `src/components/AiAssistant.jsx`, `AIAssistantModal.jsx`
  - Backend: `api/ai/song-search.js` (YouTube, Chordtela, Ultimate Guitar, Chordify integration)
  - Docs: `AI_ASSISTANT.md`, `AI_ASSISTANT_IMPLEMENTATION.md`, `AI_ASSISTANT_QUICK_REF.md`

## Developer Workflows
- **Install:** `npm install`
- **Dev server:** `npm run dev` (Vite, port 5173)
- **Build:** `npm run build`
- **Preview:** `npm run preview` (port 4173)
- **API local dev:** Use Vercel CLI (`vercel dev`), see `ENV_SETUP.md` for env setup
- **Update deps:** `npm run update`

## Project-Specific Conventions
- **Song data:** Prefer UI for adding/editing; static songs in `src/data/songs.js`
- **Chord formats:** ChordPro and standard supported; see `EXAMPLE_FORMATS.md` for parsing rules and examples
- **Bulk add:** Use `BulkAddSongsModal.jsx` and see `BULK_ADD_SONGS.md` for batch import/search
- **Keyboard shortcuts:** See `KEYBOARD_SHORTCUTS.md` for navigation/editing hotkeys
- **Notifications:** Use `Toast.jsx`/`ToastContainer.jsx` (never use `alert()`)
- **Virtual scrolling:** For large lists, use `VirtualizedSongList.jsx` (see `VIRTUAL_SCROLLING.md`)
- **Service worker:** See `public/service-worker.js` and `SERVICE_WORKER_GUIDE.md` for PWA/offline

## Integration & External Dependencies
- **YouTube:** Embedded via IFrame API (`YouTubeViewer.jsx`)
- **Turso DB:** API integration via Vercel serverless (`api/`), see `ENV_SETUP.md` for keys
- **AI:** Uses external APIs for song metadata/transcription (see `AI_ASSISTANT.md`)

## Cross-Component Patterns
- **SongForm.jsx** integrates AI Assistant via `AIAssistantModal` (see code comments for state/handler patterns)
- **API/DB sync:** Controlled by `VITE_TURSO_SYNC` env; see `ENV_SETUP.md` for details
- **Melody notation:** See `MELODY_NOTATION_GUIDE.md` for Not Angka/Balok conventions
- **Setlist logic:** Managed via `SetListForm.jsx`, `SetlistPicker.jsx`, and hooks in `src/hooks/`

## References & Further Reading
- Main docs: `README.md`, `COMPLETE_FEATURES.md`, `AI_ASSISTANT.md`, `DEVELOPERS_GUIDE.md`
- For new features, follow patterns in `src/components/` and `src/hooks/`
- For backend, see `api/` and `db/schema.sql`

---

**If unsure about a pattern or workflow, check the referenced docs or ask for clarification.**
