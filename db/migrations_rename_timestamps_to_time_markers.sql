-- Migration: Rename 'timestamps' column to 'time_markers' in songs table
-- This ensures consistency across the application

-- Step 1: Create new table with 'time_markers' instead of 'timestamps'
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
  time_markers TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT
);

-- Step 2: Copy data from old table, mapping 'timestamps' to 'time_markers'
INSERT INTO songs_new (id, title, artist, youtubeId, key, tempo, genre, capo, lyrics, instruments, time_markers, createdAt, updatedAt)
SELECT 
  id, 
  title, 
  artist, 
  youtubeId, 
  key, 
  tempo,
  genre,
  capo, 
  lyrics, 
  instruments, 
  timestamps as time_markers,
  createdAt, 
  updatedAt
FROM songs;

-- Step 3: Drop old table
DROP TABLE songs;

-- Step 4: Rename new table to original name
ALTER TABLE songs_new RENAME TO songs;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
