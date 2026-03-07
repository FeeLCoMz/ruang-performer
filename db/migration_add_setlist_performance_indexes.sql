-- Add/ensure setlist_songs table and indexes to speed up setlists queries

CREATE TABLE IF NOT EXISTS setlist_songs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  setlist_id TEXT NOT NULL,
  song_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  meta TEXT DEFAULT '{}',
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE(setlist_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_setlists_userId_updatedAt ON setlists(userId, updatedAt);
CREATE INDEX IF NOT EXISTS idx_setlists_bandId_updatedAt ON setlists(bandId, updatedAt);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id_position ON setlist_songs(setlist_id, position);
