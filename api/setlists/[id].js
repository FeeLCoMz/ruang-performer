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
  const { id } = req.query || {};

  if (!id) {
    res.status(400).json({ error: 'Missing setlist id' });
    return;
  }

  try {
    const client = getTursoClient();
    if (req.method === 'GET') {
      const result = await client.execute(
        `SELECT id, name, songs, songKeys, createdAt, updatedAt
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
        songKeys: row.songKeys ? JSON.parse(row.songKeys) : {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const songsJson = body.songs ? JSON.stringify(body.songs) : null;
      const songKeysJson = body.songKeys ? JSON.stringify(body.songKeys) : null;

      await client.execute(
        `UPDATE setlists SET 
           name = COALESCE(?, name),
           songs = COALESCE(?, songs),
           songKeys = COALESCE(?, songKeys),
           updatedAt = ?
         WHERE id = ?`,
        [
          body.name ?? null,
          songsJson,
          songKeysJson,
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
