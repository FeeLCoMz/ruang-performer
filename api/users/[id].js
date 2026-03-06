import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  const client = getTursoClient();
  const userId = req.query.id || req.params.id;

  // Only owner can manage users
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Hanya owner yang dapat mengelola users' });
  }

  if (req.method === 'GET') {
    // Get single user detail
    try {
      const result = await client.execute({
        sql: 'SELECT id, email, username, role, isActive, createdAt, updatedAt FROM users WHERE id = ? AND deletedAt IS NULL',
        args: [userId]
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }

      const user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        username: result.rows[0].username,
        role: result.rows[0].role,
        isActive: result.rows[0].isActive,
        createdAt: result.rows[0].createdAt,
        updatedAt: result.rows[0].updatedAt
      };

      // Get band membership
      const bandResult = await client.execute({
        sql: `
          SELECT b.id, b.name, bm.role, bm.status
          FROM band_members bm
          JOIN bands b ON bm.bandId = b.id
          WHERE bm.userId = ? AND bm.deletedAt IS NULL AND b.deletedAt IS NULL
        `,
        args: [userId]
      });
      user.bands = bandResult.rows.map(r => ({
        bandId: r.id,
        bandName: r.name,
        role: r.role,
        status: r.status
      }));

      res.json({ user });
    } catch (err) {
      console.error('Error fetching user:', err);
      res.status(500).json({ error: 'Gagal mengambil data user' });
    }
  } else if (req.method === 'PUT') {
    // Update user (role, isActive)
    try {
      const { role, isActive } = req.body;

      // Validate
      if (role && !['owner', 'admin', 'member'].includes(role)) {
        return res.status(400).json({ error: 'Role tidak valid' });
      }

      if (isActive !== undefined && typeof isActive !== 'number') {
        return res.status(400).json({ error: 'isActive harus berupa number (0 atau 1)' });
      }

      // Check if user exists
      const checkUser = await client.execute({
        sql: 'SELECT id, role FROM users WHERE id = ? AND deletedAt IS NULL',
        args: [userId]
      });

      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }

      // Prevent changing own role
      if (userId === req.user.userId && role && role !== checkUser.rows[0].role) {
        return res.status(400).json({ error: 'Tidak dapat mengubah role sendiri' });
      }

      // Update user
      let updates = [];
      let args = [];

      if (role) {
        updates.push('role = ?');
        args.push(role);
      }

      if (isActive !== undefined) {
        updates.push('isActive = ?');
        args.push(isActive);
      }

      if (updates.length > 0) {
        updates.push("updatedAt = datetime('now')");
        args.push(userId);

        await client.execute({
          sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          args
        });
      }

      res.json({ success: true, message: 'User berhasil diupdate' });
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Gagal mengupdate user' });
    }
  } else if (req.method === 'DELETE') {
    // Soft delete user
    try {
      // Check if user exists
      const checkUser = await client.execute({
        sql: 'SELECT id FROM users WHERE id = ? AND deletedAt IS NULL',
        args: [userId]
      });

      if (checkUser.rows.length === 0) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }

      // Prevent deleting own account
      if (userId === req.user.userId) {
        return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
      }

      // Soft delete user
      await client.execute({
        sql: "UPDATE users SET deletedAt = datetime('now') WHERE id = ?",
        args: [userId]
      });

      res.json({ success: true, message: 'User berhasil dihapus' });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Gagal menghapus user' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
