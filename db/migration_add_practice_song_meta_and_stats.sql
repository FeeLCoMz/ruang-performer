ALTER TABLE practice_sessions ADD COLUMN songMeta TEXT;

CREATE TABLE IF NOT EXISTS band_song_practice_stats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bandId TEXT NOT NULL,
  songId TEXT NOT NULL,
  sessionCount INTEGER NOT NULL DEFAULT 0,
  practicedCount INTEGER NOT NULL DEFAULT 0,
  ratingAvg REAL,
  lastPracticedAt TEXT,
  lastRating INTEGER,
  updatedAt TEXT,
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
  UNIQUE(bandId, songId)
);

CREATE INDEX IF NOT EXISTS idx_band_song_practice_stats_band_song
  ON band_song_practice_stats(bandId, songId);
