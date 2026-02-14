-- Migration: add arrangement_style and keyboard_patch to songs table
ALTER TABLE songs ADD COLUMN arrangement_style TEXT;
ALTER TABLE songs ADD COLUMN keyboard_patch TEXT;