-- Turso (libsql) schema for PerformerHub


-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  deletedAt TEXT
);


CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  artist TEXT,
  youtubeId TEXT,
  key TEXT,
  tempo TEXT,
  genre TEXT,  
  lyrics TEXT,
  time_markers TEXT,
  arrangement_style TEXT,
  keyboard_patch TEXT,
  sheet_music_xml TEXT,
  userId TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  deletedAt TEXT,
  FOREIGN KEY (userId) REFERENCES users(id)
);


-- Bands table
CREATE TABLE IF NOT EXISTS bands (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  deletedAt TEXT,
  FOREIGN KEY (createdBy) REFERENCES users(id)
);


-- Band members table
CREATE TABLE IF NOT EXISTS band_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bandId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'active',
  invitation TEXT,
  joinedAt TEXT DEFAULT (datetime('now')),
  deletedAt TEXT,
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(bandId, userId)
);


-- Set lists (playlists of songs)
CREATE TABLE IF NOT EXISTS setlists (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  songs TEXT DEFAULT '[]',
  setlistSongMeta TEXT DEFAULT '{}',
  completedSongs TEXT DEFAULT '{}',
  userId TEXT,
  bandId TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  deletedAt TEXT,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE
);


-- Setlist songs relation table (ordered songs + per-song metadata in setlist)
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


-- Practice sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bandId TEXT NOT NULL,
  date TEXT NOT NULL,
  duration INTEGER,
  songs TEXT,
  notes TEXT,
  createdBy TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  deletedAt TEXT,
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES users(id)
);


-- Gigs/Performances table
CREATE TABLE IF NOT EXISTS gigs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bandId TEXT NOT NULL,
  venue TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  fee REAL,
  setlistId TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  userId TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT,
  deletedAt TEXT,
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE CASCADE,
  FOREIGN KEY (setlistId) REFERENCES setlists(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);


-- Indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_setlists_name ON setlists(name);
CREATE INDEX IF NOT EXISTS idx_setlists_userId_updatedAt ON setlists(userId, updatedAt);
CREATE INDEX IF NOT EXISTS idx_setlists_bandId_updatedAt ON setlists(bandId, updatedAt);
CREATE INDEX IF NOT EXISTS idx_bands_createdBy ON bands(createdBy);
CREATE INDEX IF NOT EXISTS idx_band_members_bandId ON band_members(bandId);
CREATE INDEX IF NOT EXISTS idx_band_members_userId ON band_members(userId);
CREATE INDEX IF NOT EXISTS idx_band_members_role ON band_members(role);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id_position ON setlist_songs(setlist_id, position);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_bandId ON practice_sessions(bandId);
CREATE INDEX IF NOT EXISTS idx_gigs_bandId ON gigs(bandId);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
