-- Migration: Add bandId column to songs table
ALTER TABLE songs ADD COLUMN bandId TEXT;
-- Optionally, add foreign key constraint if needed:
-- ALTER TABLE songs ADD CONSTRAINT fk_band FOREIGN KEY (bandId) REFERENCES bands(id);