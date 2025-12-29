import { getTursoClient } from '../_turso.js';

export default async function handler(req, res) {
  const client = getTursoClient();
  const { id } = req.query || {};

  if (!id) {
    res.status(400).json({ error: 'Missing setlist id' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const result = await client.execute(
        `SELECT id, name, songs, createdAt, updatedAt
         FROM setlists WHERE id = ? LIMIT 1`,
        [id.toString()]
      );

      const row = result.rows?.[0] || null;
      if (!row) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      res.status(200).json({
        id: row.id,
        name: row.name,
        songs: row.songs ? JSON.parse(row.songs) : [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || {};
      const now = new Date().toISOString();
      const songsJson = body.songs ? JSON.stringify(body.songs) : null;

      await client.execute(
        `UPDATE setlists SET 
           name = COALESCE(?, name),
           songs = COALESCE(?, songs),
           updatedAt = ?
         WHERE id = ?`,
        [
          body.name ?? null,
          songsJson,
          now,
          id.toString(),
        ]
      );

      res.status(200).json({ id });
      return;
    }

    if (req.method === 'DELETE') {
      await client.execute(`DELETE FROM setlists WHERE id = ?`, [id.toString()]);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/setlists/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
