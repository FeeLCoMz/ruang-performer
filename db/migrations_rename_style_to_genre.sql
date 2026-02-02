-- Migration: Rename 'style' column to 'genre' in songs table
-- SQLite doesn't support direct ALTER COLUMN RENAME, so we recreate the table

-- Step 1: Create new table with 'genre' instead of 'style'
CREATE TABLE songs_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  youtubeId TEXT,
  key TEXT,
  tempo TEXT,
  genre TEXT,
  capo TEXT,
  lyrics TEXT,
  instruments TEXT,
  timestamps TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Step 2: Copy data from old table, mapping 'style' to 'genre'
INSERT INTO songs_new (id, title, artist, youtubeId, key, tempo, genre, capo, lyrics, instruments, timestamps, createdAt, updatedAt)
SELECT 
  id, 
  title, 
  artist, 
  youtubeId, 
  key, 
  tempo,
  style as genre,
  capo, 
  lyrics, 
  instruments, 
  timestamps, 
  createdAt, 
  updatedAt
FROM songs;

-- Step 3: Drop old table
DROP TABLE songs;

-- Step 4: Rename new table to original name
ALTER TABLE songs_new RENAME TO songs;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_songs_userId ON songs(userId);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);

