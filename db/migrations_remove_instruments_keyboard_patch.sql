-- Migration: remove instruments and keyboard_patch from songs table
-- WARNING: SQLite (and Turso/libSQL) does not support DROP COLUMN directly.
-- The workaround is to create a new table without the columns, copy data, drop old, rename new.

BEGIN TRANSACTION;

CREATE TABLE songs_new AS SELECT id, title, artist, youtubeId, key, tempo, genre, capo, lyrics, time_markers, userId, difficulty, duration, createdAt, updatedAt, deletedAt FROM songs;

DROP TABLE songs;

ALTER TABLE songs_new RENAME TO songs;

COMMIT;
