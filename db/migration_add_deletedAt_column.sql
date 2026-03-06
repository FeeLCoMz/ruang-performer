-- Migration: Add deletedAt column to users table for soft delete
-- Date: 2026-03-07

ALTER TABLE users ADD COLUMN deletedAt TEXT;
