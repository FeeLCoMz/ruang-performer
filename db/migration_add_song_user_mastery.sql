-- Global mastery tracking so any authenticated user can mark any song
CREATE TABLE IF NOT EXISTS song_user_mastery (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  songId TEXT NOT NULL,
  userId TEXT NOT NULL,
  mastered INTEGER NOT NULL DEFAULT 1,
  masteredAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(songId, userId)
);

CREATE INDEX IF NOT EXISTS idx_song_user_mastery_songId ON song_user_mastery(songId);
CREATE INDEX IF NOT EXISTS idx_song_user_mastery_userId ON song_user_mastery(userId);

-- Backfill existing mastery data from legacy band-based table if present
INSERT OR IGNORE INTO song_user_mastery (id, songId, userId, mastered, masteredAt, createdAt, updatedAt)
SELECT id, songId, userId, mastered, masteredAt, createdAt, updatedAt
FROM song_member_mastery;
