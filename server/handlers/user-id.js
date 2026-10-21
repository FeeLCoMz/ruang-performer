import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { writeAuditLog, getRequestMeta } from '../_audit.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  const client = getTursoClient();
  const userId = req.query.id || req.params.id;

  // Only administrator (owner/admin) can manage users
  if (!['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Hanya administrator yang dapat mengelola users' });
  }

  // Admin biasa tidak boleh memberi/mengubah role owner, agar tidak bisa
  // menaikkan hak akses akun mana pun (termasuk dirinya) melewati Owner.
  const isAdminAscendingToOwner = req.user.role === 'admin' && req.body?.role === 'owner';
  if (isAdminAscendingToOwner) {
    return res.status(403).json({ error: 'Hanya owner yang dapat memberikan role owner' });
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

      // Admin tidak boleh mengubah role seorang owner (turunkan/mengganti) —
      // wewenang tersebut hanya milik Owner aplikasi.
      if (req.user.role === 'admin' && role && checkUser.rows[0].role === 'owner') {
        return res.status(403).json({ error: 'Hanya owner yang dapat mengubah role owner' });
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

      const { ipAddress, userAgent } = getRequestMeta(req);
      await writeAuditLog(client, {
        action: role && role !== checkUser.rows[0].role ? 'MEMBER_ROLE_CHANGED' : 'USER_UPDATED',
        userId: req.user.userId,
        targetUserId: userId,
        resourceId: userId,
        resourceType: 'user',
        description: `User diperbarui: ${userId}`,
        changes: {
          ...(role ? { role: { from: checkUser.rows[0].role, to: role } } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
        ipAddress,
        userAgent,
      });

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

      // Admin (non-owner) tidak boleh menghapus akun owner.
      if (req.user.role === 'admin') {
        const targetRole = await client.execute({
          sql: 'SELECT role FROM users WHERE id = ? AND deletedAt IS NULL',
          args: [userId]
        });
        if (targetRole.rows[0]?.role === 'owner') {
          return res.status(403).json({ error: 'Hanya owner yang dapat menghapus akun owner' });
        }
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

      const { ipAddress, userAgent } = getRequestMeta(req);
      await writeAuditLog(client, {
        action: 'USER_DELETED',
        userId: req.user.userId,
        targetUserId: userId,
        resourceId: userId,
        resourceType: 'user',
        description: `User dihapus (soft delete): ${userId}`,
        ipAddress,
        userAgent,
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
