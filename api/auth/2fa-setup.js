import { getTursoClient } from '../_turso.js';
import speakeasy from 'speakeasy';

/**
 * GET /api/auth/2fa/setup
 * Generate 2FA setup data (secret, QR code, backup codes)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = getTursoClient();

    // Get user email
    const userResult = await client.execute(
      'SELECT email, twoFactorEnabled FROM users WHERE id = ?',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is already enabled for this account' });
    }

    // Generate 2FA secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `PerformerHub (${userResult.rows[0].email})`,
      issuer: 'PerformerHub'
    });

    // Generate backup codes (8 codes, 8 characters each)
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    ).map((code, i) => 
      code.slice(0, 4) + '-' + code.slice(4, 8)
    );

    return res.status(200).json({
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      backupCodes,
      setupId: Math.random().toString(36).substring(7)
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({ error: 'Failed to generate 2FA setup' });
  }
}
