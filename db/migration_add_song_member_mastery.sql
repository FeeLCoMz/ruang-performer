-- Track each band member mastery status per song
CREATE TABLE IF NOT EXISTS song_member_mastery (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  songId TEXT NOT NULL,
  bandId TEXT NOT NULL,
  userId TEXT NOT NULL,
  mastered INTEGER NOT NULL DEFAULT 1,
  masteredAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(songId, userId)
);

CREATE INDEX IF NOT EXISTS idx_song_member_mastery_songId ON song_member_mastery(songId);
CREATE INDEX IF NOT EXISTS idx_song_member_mastery_bandId_userId ON song_member_mastery(bandId, userId);
