import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';

async function readJson(req) {
  if (req.body) return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

/**
 * GET /api/bands/:id/members - Get all members of a band
 * PATCH /api/bands/:id/members/:userId - Update member role
 * DELETE /api/bands/:id/members/:userId - Remove member
 */
export default async function handler(req, res) {
    // DEBUG LOGGING
    console.log('[BandMembersHandler]', {
      method: req.method,
      path: req.path || req.url,
      params: req.params,
      query: req.query,
      body: req.body
    });
  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    // Extract bandId from Express params (now guaranteed to be set by app.get/patch/delete)
    const bandId = req.params?.id;
    const userId = req.user?.userId;

    if (!bandId || !userId) {
      return res.status(400).json({ error: 'Missing bandId or unauthorized' });
    }

    const client = getTursoClient();

    if (req.method === 'POST') {
      // Add a new member to the band (invite by email)
      const body = await readJson(req);
      const { email, role } = body;
      if (!email || !role || !['member', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Email dan role wajib diisi' });
      }

      // Only owner or admin can add members
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );
      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }
      // Cek role user di band
      const roleCheck = await client.execute(
        'SELECT role FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, userId]
      );
      const isOwner = bandResult.rows[0].createdBy === userId;
      const isAdmin = roleCheck.rows && roleCheck.rows[0]?.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Hanya owner/admin yang bisa menambah anggota' });
      }

      // Cari userId dari email
      const userResult = await client.execute(
        'SELECT id, username, email FROM users WHERE email = ?',
        [email]
      );
      if (!userResult.rows || userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
      const targetUserId = userResult.rows[0].id;
      // Cek apakah sudah jadi anggota
      const exists = await client.execute(
        'SELECT id FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, targetUserId]
      );
      if (exists.rows && exists.rows.length > 0) {
        return res.status(400).json({ error: 'User sudah menjadi anggota band' });
      }
      // Tambahkan ke band_members
      await client.execute(
        'INSERT INTO band_members (bandId, userId, role, status, joinedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [bandId, targetUserId, role, 'active']
      );
      return res.status(201).json({
        userId: targetUserId,
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        role,
        isOwner: false
      });
    }

    if (req.method === 'GET') {
      // Verify user is member of band or owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      const isOwner = bandResult.rows[0].createdBy === userId;
      const memberCheck = await client.execute(
        'SELECT id FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, userId]
      );

      if (!isOwner && (!memberCheck.rows || memberCheck.rows.length === 0)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get all members with their info
      const members = await client.execute(
        `SELECT 
          bm.userId,
          bm.role,
          u.username,
          u.email
        FROM band_members bm
        JOIN users u ON bm.userId = u.id
        WHERE bm.bandId = ?
        ORDER BY u.username`,
        [bandId]
      );

      // Include the owner in the list
      const ownerResult = await client.execute(
        `SELECT id, username, email FROM users WHERE id = ?`,
        [bandResult.rows[0].createdBy]
      );

      const allMembers = [];

      // Add owner first
      if (ownerResult.rows && ownerResult.rows.length > 0) {
        allMembers.push({
          userId: ownerResult.rows[0].id,
          username: ownerResult.rows[0].username,
          email: ownerResult.rows[0].email,
          role: 'owner',
          isOwner: true
        });
      }

      // Add other members
      if (members.rows) {
        members.rows.forEach(m => {
          allMembers.push({
            userId: m.userId,
            username: m.username,
            email: m.email,
            role: m.role,
            isOwner: false
          });
        });
      }

      return res.status(200).json(allMembers);
    }

    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const { role } = body;

      if (!['member', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Extract userId from Express params
      const targetUserId = req.params?.userId;
      
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing target userId' });
      }

      // Verify requester is band owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      if (bandResult.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: 'Only owner can change roles' });
      }

      // Cannot change owner role
      if (bandResult.rows[0].createdBy === targetUserId) {
        return res.status(400).json({ error: 'Cannot change owner role' });
      }

      // Update role
      await client.execute(
        'UPDATE band_members SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE bandId = ? AND userId = ?',
        [role, bandId, targetUserId]
      );

      // Get updated member info
      const member = await client.execute(
        `SELECT bm.userId, bm.role, u.username, u.email
         FROM band_members bm
         JOIN users u ON bm.userId = u.id
         WHERE bm.bandId = ? AND bm.userId = ?`,
        [bandId, targetUserId]
      );

      if (!member.rows || member.rows.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(200).json({
        userId: member.rows[0].userId,
        role: member.rows[0].role,
        username: member.rows[0].username,
        email: member.rows[0].email
      });
    }

    if (req.method === 'DELETE') {
      // Extract userId from Express params
      const targetUserId = req.params?.userId;
      
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing target userId' });
      }

      // Verify requester is band owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      if (bandResult.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: 'Only owner can remove members' });
      }

      // Cannot remove owner
      if (bandResult.rows[0].createdBy === targetUserId) {
        return res.status(400).json({ error: 'Cannot remove owner' });
      }

      // Remove member
      await client.execute(
        'DELETE FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, targetUserId]
      );

      return res.status(200).json({ success: true });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Band members handler error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
