-- Migration: Add capo field to songs table
-- Run this if you have existing songs table without capo column

ALTER TABLE songs ADD COLUMN capo TEXT;
