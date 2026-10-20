import jwt from 'jsonwebtoken';
import { getTursoClient } from '../_turso.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const client = getTursoClient();
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = decoded.userId;
    // Soft delete user (set deletedAt)
    await client.execute(
      'UPDATE users SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
    // Optionally: remove from band_members, invalidate sessions, etc.
    await client.execute(
      'DELETE FROM band_members WHERE userId = ?',
      [userId]
    );
    // TODO: tambahkan penghapusan data lain jika diperlukan
    return res.status(200).json({ success: true, message: 'Akun berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
}
