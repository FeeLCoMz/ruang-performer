-- Migration: add keyboard_patch to songs table
ALTER TABLE songs ADD COLUMN keyboard_patch TEXT;