import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getTursoClient } from '../_turso.js';

/**
 * POST /api/auth/reset-password
 * Reset password with valid token
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, email, newPassword } = req.body;

    // Validate inputs
    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'Token, email, and password are required' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const client = getTursoClient();

    // Find user by email
    const userResult = await client.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const userId = userResult.rows[0].id;

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find and validate reset token
    const tokenResult = await client.execute(
      `SELECT id FROM password_reset_tokens 
       WHERE userId = ? AND tokenHash = ? AND expiresAt > CURRENT_TIMESTAMP
       ORDER BY createdAt DESC LIMIT 1`,
      [userId, tokenHash]
    );

    if (!tokenResult.rows || tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await client.execute(
      'UPDATE users SET passwordHash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );

    // Delete all reset tokens for this user
    await client.execute(
      'DELETE FROM password_reset_tokens WHERE userId = ?',
      [userId]
    );

    // Log password change
    await client.execute(
      `INSERT INTO audit_logs 
       (userId, action, category, severity, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, 'USER_PASSWORD_RESET', 'SECURITY', 'high', 'success']
    );

    return res.status(200).json({
      message: 'Password reset successfully',
      success: true
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}
