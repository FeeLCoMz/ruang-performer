-- Migration: add sheet_music_xml column to songs
ALTER TABLE songs ADD COLUMN sheet_music_xml TEXT;