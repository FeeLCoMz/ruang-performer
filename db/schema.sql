-- Turso (libsql) schema for RoNz Chord

CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  youtubeId TEXT,
  key TEXT,
  tempo TEXT,
  style TEXT,
  lyrics TEXT,
  instruments TEXT,
  timestamps TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Set lists (playlists of songs)
CREATE TABLE IF NOT EXISTS setlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  songs TEXT DEFAULT '[]',
  songKeys TEXT DEFAULT '{}',
  completedSongs TEXT DEFAULT '{}',
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Example indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_setlists_name ON setlists(name);
