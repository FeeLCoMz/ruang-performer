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

export default async function handler(req, res) {
  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    const client = getTursoClient();
    const userId = req.user?.userId;
    const bandId = req.query?.id || req.params?.id || req.url?.split('/').pop();

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // GET - Fetch band details with members
    if (req.method === 'GET') {
      // Check if user is member
      const memberCheck = await client.execute(
        'SELECT role FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, userId]
      );

      const bandResult = await client.execute(
        'SELECT * FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      const band = bandResult.rows[0];
      const isMember = memberCheck.rows && memberCheck.rows.length > 0;
      const isOwner = band.createdBy === userId;

      if (!isMember && !isOwner) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get members
      const membersResult = await client.execute(`
        SELECT bm.id, bm.userId, bm.role, bm.status, bm.joinedAt, u.username, u.email
        FROM band_members bm
        JOIN users u ON bm.userId = u.id
        WHERE bm.bandId = ?
        ORDER BY bm.joinedAt ASC
      `, [bandId]);

      const members = (membersResult.rows || []).map(row => ({
        id: row.id,
        userId: row.userId,
        username: row.username,
        email: row.email,
        role: row.role,
        status: row.status,
        joinedAt: row.joinedAt,
        isOwner: row.userId === band.createdBy // Tandai owner
      }));

      return res.status(200).json({
        ...band,
        members,
        isOwner,
        userRole: memberCheck.rows?.[0]?.role || (isOwner ? 'owner' : null)
      });
    }

    // PUT - Update band details
    if (req.method === 'PUT') {
      const body = await readJson(req);
      const { name, description, genre } = body;

      // Check if user is owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      if (bandResult.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: 'Only band owner can update' });
      }

      const now = new Date().toISOString();
      await client.execute(
        'UPDATE bands SET name = ?, description = ?, genre = ?, updatedAt = ? WHERE id = ?',
        [name, description || null, genre || null, now, bandId]
      );

      return res.status(200).json({ success: true });
    }

    // DELETE - Delete band
    if (req.method === 'DELETE') {
      // Check if user is owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      if (bandResult.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: 'Only band owner can delete' });
      }

      // Delete band (cascade will delete members, setlists, etc.)
      await client.execute('DELETE FROM bands WHERE id = ?', [bandId]);

      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Band detail handler error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
