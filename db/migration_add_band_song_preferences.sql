CREATE TABLE IF NOT EXISTS band_song_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bandId TEXT NOT NULL,
  songId TEXT NOT NULL,
  preferredKey TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE(bandId, songId)
);

CREATE INDEX IF NOT EXISTS idx_band_song_preferences_bandId_songId
  ON band_song_preferences(bandId, songId);
