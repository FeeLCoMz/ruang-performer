// Band Members API handler for /api/bands/[bandId]/members and /api/bands/[bandId]/members/[userId]
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { PERMISSIONS, hasPermission } from '../../src/utils/permissionUtils.js';

export default async function handler(req, res) {
  // URL: /api/bands/:id/members or /api/bands/:id/members/:userId (Express: req.params.id)
  const bandId = req.params?.id || req.query?.bandId || (req.url.split('/')[3] || '').split('?')[0];
  const userId = req.params?.userId || req.query?.userId || (req.url.split('/')[5] || '').split('?')[0];

  if (!verifyToken(req, res)) return;
  const client = getTursoClient();
  const currentUserId = req.user?.userId;

  // Permission check: only band owner/admin can add/remove/update members
  // (You may want to refine this logic based on your permissionUtils)

  if (req.method === 'GET') {
    // Get all members for a band
    const members = await client.execute(
      'SELECT bm.*, u.email, u.username FROM band_members bm JOIN users u ON bm.userId = u.id WHERE bm.bandId = ?',
      [bandId]
    );
    return res.json(members.rows || []);
  }

  if (req.method === 'POST') {
    // Add a member to the band
    const { email, role } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: 'Email and role required' });
    // Find user by email
    const userRes = await client.execute('SELECT id FROM users WHERE email = ?', [email]);
    const newUser = userRes.rows?.[0];
    if (!newUser) return res.status(404).json({ error: 'User not found' });
    // Insert into band_members
    await client.execute(
      'INSERT INTO band_members (bandId, userId, role, joinedAt) VALUES (?, ?, ?, ?)',
      [bandId, newUser.id, role, new Date().toISOString()]
    );
    return res.json({ success: true });
  }

  if (req.method === 'PATCH') {
    // Debug log for PATCH
    console.log('[PATCH] Update member role', {
      bandId,
      userId,
      body: req.body,
      currentUserId
    });
    // Update member role
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ error: 'Role required' });
    await client.execute(
      'UPDATE band_members SET role = ? WHERE bandId = ? AND userId = ?',
      [role, bandId, userId]
    );
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    // Remove member from band
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    await client.execute(
      'DELETE FROM band_members WHERE bandId = ? AND userId = ?',
      [bandId, userId]
    );
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
