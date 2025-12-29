-- Turso (libsql) schema for RoNz Chord Pro

CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  youtubeId TEXT,
  melody TEXT,
  lyrics TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Example index for faster title searches
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
