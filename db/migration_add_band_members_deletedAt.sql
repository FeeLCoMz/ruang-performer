-- Migration: Add deletedAt column to band_members table for soft delete
-- Date: 2026-03-07

ALTER TABLE band_members ADD COLUMN deletedAt TEXT;
