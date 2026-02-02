import { getTursoClient } from '../_turso.js';

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
  const id =
    (req.params && req.params.id) ||
    (req.query && req.query.id) ||
    (req.url && req.url.split('/').pop()) || '';

  const idStr = id ? String(id).trim() : '';
  if (!idStr) {
    res.status(400).json({ error: 'Missing practice session id' });
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
        `SELECT ps.id, ps.bandId, ps.date, ps.duration, ps.songs, ps.notes, ps.createdAt, ps.updatedAt,
                b.name as bandName
         FROM practice_sessions ps
         LEFT JOIN bands b ON ps.bandId = b.id
         WHERE ps.id = ? AND ps.bandId IN (
           SELECT bandId FROM band_members WHERE userId = ?
         ) LIMIT 1`,
        [idStr, userId]
      );

      const row = result.rows?.[0] || null;
      if (!row) {
        res.status(404).json({ error: 'Practice session not found' });
        return;
      }
      res.status(200).json({
        id: row.id,
        bandId: row.bandId,
        bandName: row.bandName,
        date: row.date,
        duration: row.duration,
        songs: (() => {
          try {
            return row.songs ? JSON.parse(row.songs) : [];
          } catch (e) {
            return [];
          }
        })(),
        notes: row.notes || '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const now = new Date().toISOString();

      // Check if user is the creator of the practice session
      const sessionCheck = await client.execute(
        `SELECT userId FROM practice_sessions WHERE id = ?`,
        [idStr]
      );
      
      if (!sessionCheck.rows?.[0] || sessionCheck.rows[0].userId !== userId) {
        return res.status(403).json({ error: 'Forbidden - only creator can edit' });
      }

      const songsJson = body.songs ? JSON.stringify(body.songs) : null;

      await client.execute(
        `UPDATE practice_sessions SET 
           bandId = COALESCE(?, bandId),
           date = COALESCE(?, date),
           duration = COALESCE(?, duration),
           songs = COALESCE(?, songs),
           notes = COALESCE(?, notes),
           updatedAt = ?
         WHERE id = ?`,
        [
          body.bandId !== undefined ? body.bandId : null,
          body.date ?? null,
          body.duration ?? null,
          songsJson,
          body.notes ?? null,
          now,
          idStr
        ]
      );

      res.status(200).json({ id: idStr });
      return;
    }

    if (req.method === 'DELETE') {
      // Check if user is the creator of the practice session
      const sessionCheck = await client.execute(
        `SELECT userId FROM practice_sessions WHERE id = ?`,
        [idStr]
      );
      
      if (!sessionCheck.rows?.[0] || sessionCheck.rows[0].userId !== userId) {
        return res.status(403).json({ error: 'Forbidden - only creator can delete' });
      }

      await client.execute(`DELETE FROM practice_sessions WHERE id = ?`, [idStr]);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/practice/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
