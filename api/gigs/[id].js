import { getTursoClient } from '../_turso.js';
import { hasPermission } from '../../src/utils/permissionUtils.js';

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
  // Debug log for method and URL
  console.log('API gigs/[id].js called:', req.method, req.url);
  const id =
    (req.params && req.params.id) ||
    (req.query && req.query.id) ||
    (req.url && req.url.split('/').pop()) || '';

  const idStr = id ? String(id).trim() : '';
  if (!idStr) {
    res.status(400).json({ error: 'Missing gig id' });
    return;
  }

  try {
    const client = getTursoClient();
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const result = await client.execute(
        `SELECT g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.createdAt, g.updatedAt,
                b.name as bandName, s.name as setlistName
         FROM gigs g
         LEFT JOIN bands b ON g.bandId = b.id
         LEFT JOIN setlists s ON g.setlistId = s.id
         WHERE g.id = ? AND g.userId = ? LIMIT 1`,
        [idStr, userId]
      );

      const row = result.rows?.[0] || null;
      if (!row) {
        res.status(404).json({ error: 'Gig not found' });
        return;
      }
      res.status(200).json({
        id: row.id,
        bandId: row.bandId,
        bandName: row.bandName,
        date: row.date,
        venue: row.venue || '',
        city: row.city || '',
        fee: row.fee,
        setlistId: row.setlistId,
        setlistName: row.setlistName,
        notes: row.notes || '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const now = new Date().toISOString();

      // Check gig data
      const gigCheck = await client.execute(
        `SELECT userId, bandId FROM gigs WHERE id = ?`,
        [idStr]
      );
      const gig = gigCheck.rows?.[0];
      if (!gig) {
        return res.status(404).json({ error: 'Gig not found' });
      }

      // Permission check
      let canEdit = false;
      if (gig.userId === userId) {
        canEdit = true;
      } else if (gig.bandId) {
        // Get band role
        const bandMember = await client.execute(
          `SELECT role FROM band_members WHERE bandId = ? AND userId = ? AND status = 'active' LIMIT 1`,
          [gig.bandId, userId]
        );
        const role = bandMember.rows?.[0]?.role;
        if (role && hasPermission(role, 'gig:edit')) {
          canEdit = true;
        }
      }
      if (!canEdit) {
        return res.status(403).json({ error: 'Forbidden - insufficient permission to edit gig' });
      }

      await client.execute(
        `UPDATE gigs SET 
           bandId = COALESCE(?, bandId),
           date = COALESCE(?, date),
           venue = COALESCE(?, venue),
           city = COALESCE(?, city),
           fee = COALESCE(?, fee),
           setlistId = COALESCE(?, setlistId),
           notes = COALESCE(?, notes),
           updatedAt = ?
         WHERE id = ?`,
        [
          body.bandId !== undefined ? body.bandId : null,
          body.date ?? null,
          body.venue ?? null,
          body.city ?? null,
          body.fee ?? null,
          body.setlistId ?? null,
          body.notes ?? null,
          now,
          idStr
        ]
      );

      res.status(200).json({ id: idStr });
      return;
    }

    if (req.method === 'DELETE') {
      // Check gig data
      const gigCheck = await client.execute(
        `SELECT userId, bandId FROM gigs WHERE id = ?`,
        [idStr]
      );
      const gig = gigCheck.rows?.[0];
      if (!gig) {
        return res.status(404).json({ error: 'Gig not found' });
      }

      // Permission check
      let canDelete = false;
      if (gig.userId === userId) {
        canDelete = true;
      } else if (gig.bandId) {
        // Get band role
        const bandMember = await client.execute(
          `SELECT role FROM band_members WHERE bandId = ? AND userId = ? AND status = 'active' LIMIT 1`,
          [gig.bandId, userId]
        );
        const role = bandMember.rows?.[0]?.role;
        if (role && hasPermission(role, 'gig:edit')) {
          canDelete = true;
        }
      }
      if (!canDelete) {
        return res.status(403).json({ error: 'Forbidden - insufficient permission to delete gig' });
      }

      await client.execute(`DELETE FROM gigs WHERE id = ?`, [idStr]);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/gigs/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
