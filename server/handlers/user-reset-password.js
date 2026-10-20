import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  const client = getTursoClient();
  const userId = req.query.id || req.params.id;

  // Only owner can reset user passwords
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Hanya owner yang dapat reset password user' });
  }

  if (req.method === 'POST') {
    try {
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
      }

      // Check if user exists
      const checkUser = await client.execute({
        sql: 'SELECT id, email FROM users WHERE id = ? AND deletedAt IS NULL',
        args: [userId]
      });

      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update password
      await client.execute({
        sql: "UPDATE users SET passwordHash = ?, updatedAt = datetime('now') WHERE id = ?",
        args: [passwordHash, userId]
      });

      res.json({ 
        success: true, 
        message: `Password untuk ${checkUser.rows[0].email} berhasil direset` 
      });
    } catch (err) {
      console.error('Error resetting password:', err);
      res.status(500).json({ error: 'Gagal reset password' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
