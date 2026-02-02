import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { getTursoClient } from '../_turso.js';

/**
 * POST /api/auth/2fa/verify
 * Verify and enable 2FA with secret and backup codes
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user?.userId;
    const { secret, token, backupCodes } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!secret || !token || !backupCodes || backupCodes.length === 0) {
      return res.status(400).json({ error: 'Secret, token, and backup codes are required' });
    }

    // Verify TOTP token using speakeasy
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Hash backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    const client = getTursoClient();

    // Update user with 2FA enabled
    await client.execute(
      `UPDATE users 
       SET twoFactorEnabled = 1, 
           twoFactorSecret = ?,
           twoFactorBackupCodes = ?,
           updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        secret,
        JSON.stringify(hashedBackupCodes),
        userId
      ]
    );

    // Log 2FA enablement
    await client.execute(
      `INSERT INTO audit_logs 
       (userId, action, category, severity, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, 'USER_2FA_ENABLED', 'SECURITY', 'high', 'success']
    );

    return res.status(200).json({
      message: '2FA enabled successfully',
      success: true
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return res.status(500).json({ error: 'Failed to enable 2FA' });
  }
}
