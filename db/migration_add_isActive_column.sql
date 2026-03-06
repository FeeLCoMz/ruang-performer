-- Migration: Add isActive column to users table
-- Date: 2026-03-07

ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1;
