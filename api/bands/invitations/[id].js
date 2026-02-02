import { getTursoClient } from '../../_turso.js';
import { verifyToken } from '../../_auth.js';

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

export default async function handler(req, res) {
  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    const client = getTursoClient();
    const userId = req.user?.userId;
    
    // Get invitationId from URL path or query
    const invitationId = req.query?.invId || req.query?.id || req.url?.split('/').pop();

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID required' });
    }

    // GET - Fetch invitation details
    if (req.method === 'GET') {
      const result = await client.execute(
        'SELECT id, bandId, email, role, status, createdAt, expiresAt FROM band_invitations WHERE id = ?',
        [invitationId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      const inv = result.rows[0];

      // Check if invitation is still valid
      if (inv.status !== 'pending') {
        return res.status(410).json({ error: `Invitation already ${inv.status}` });
      }

      if (new Date(inv.expiresAt) < new Date()) {
        return res.status(410).json({ error: 'Invitation has expired' });
      }

      return res.status(200).json(inv);
    }

    // POST - Accept or Reject invitation
    if (req.method === 'POST') {
      const body = await readJson(req);
      const { action: invAction = 'accept' } = body;

      const result = await client.execute(
        'SELECT id, bandId, email, role, status, expiresAt FROM band_invitations WHERE id = ?',
        [invitationId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      const inv = result.rows[0];

      // Check if invitation is pending
      if (inv.status !== 'pending') {
        return res.status(410).json({ error: `Invitation already ${inv.status}` });
      }

      // Check if expired
      if (new Date(inv.expiresAt) < new Date()) {
        return res.status(410).json({ error: 'Invitation has expired' });
      }

      // Get user by email and verify it matches current user
      const userResult = await client.execute(
        'SELECT id FROM users WHERE id = ? AND email = ?',
        [userId, inv.email]
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        return res.status(403).json({ error: 'This invitation is for a different email address' });
      }

      if (invAction === 'accept') {
        const now = new Date().toISOString();
        const memberId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add user as band member
        await client.execute(`
          INSERT INTO band_members (id, bandId, userId, role, joinedAt)
          VALUES (?, ?, ?, ?, ?)
        `, [memberId, inv.bandId, userId, inv.role, now]);

        // Mark invitation as accepted
        await client.execute(`
          UPDATE band_invitations SET status = 'accepted', acceptedAt = ? WHERE id = ?
        `, [now, invitationId]);

        return res.status(200).json({
          message: 'Invitation accepted',
          invitationId,
          bandId: inv.bandId,
          role: inv.role
        });
      } else if (invAction === 'reject') {
        const now = new Date().toISOString();

        // Mark invitation as rejected
        await client.execute(`
          UPDATE band_invitations SET status = 'rejected' WHERE id = ?
        `, [invitationId]);

        return res.status(200).json({
          message: 'Invitation rejected',
          invitationId
        });
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "accept" or "reject"' });
      }
    }

    // DELETE - Cancel invitation (owner only)
    if (req.method === 'DELETE') {
      const result = await client.execute(
        'SELECT bandId, status FROM band_invitations WHERE id = ?',
        [invitationId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      const inv = result.rows[0];

      // Check if user is band owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [inv.bandId]
      );

      if (!bandResult.rows || bandResult.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: 'Only band owner can cancel invitations' });
      }

      // Delete invitation
      await client.execute(
        'DELETE FROM band_invitations WHERE id = ?',
        [invitationId]
      );

      return res.status(200).json({ message: 'Invitation cancelled' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Invitation handler error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
