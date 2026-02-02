-- Phase 4: Advanced Features & Security Enhancements
-- Migration script for password reset tokens, audit logs, and 2FA

-- 1. Update users table to add 2FA columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twoFactorSecret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twoFactorBackupCodes TEXT; -- JSON array of hashed codes

-- 2. Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  userId TEXT NOT NULL,
  tokenHash TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  usedAt TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_userId ON password_reset_tokens(userId);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_tokenHash ON password_reset_tokens(tokenHash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiresAt ON password_reset_tokens(expiresAt);

-- 3. Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  userId TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'LOW',
  status TEXT DEFAULT 'success',
  bandId TEXT,
  description TEXT,
  details TEXT, -- JSON object with additional details
  ipAddress TEXT,
  userAgent TEXT,
  changes TEXT, -- JSON object of what changed
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (bandId) REFERENCES bands(id) ON DELETE SET NULL
);

-- Add indexes for audit_logs for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_bandId ON audit_logs(bandId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- 4. Create indexes for 2FA columns
CREATE INDEX IF NOT EXISTS idx_users_twoFactorEnabled ON users(twoFactorEnabled);

-- 5. Create cleanup trigger for expired password reset tokens
-- Note: Turso/LibSQL may not support triggers, so cleanup should be done in application code
-- See api/auth/reset-password.js and other handlers for cleanup logic

-- Sample data for audit log testing (optional - remove in production)
-- INSERT INTO audit_logs (userId, action, category, severity, status, description)
-- VALUES (null, 'USER_LOGIN', 'USER', 'LOW', 'success', 'User login recorded');

-- Verify table creation
-- SELECT name FROM sqlite_master WHERE type='table' AND (name='password_reset_tokens' OR name='audit_logs');
