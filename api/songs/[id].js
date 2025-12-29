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
  const client = getTursoClient();
  const { id } = req.query || {};

  if (!id) {
    res.status(400).json({ error: 'Missing song id' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const result = await client.execute(
        `SELECT id, title, artist, youtubeId, melody, lyrics, createdAt, updatedAt
         FROM songs WHERE id = ? LIMIT 1`,
        [id.toString()]
      );
      const row = result.rows?.[0] || null;
      if (!row) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(row);
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const now = new Date().toISOString();

      await client.execute(
        `UPDATE songs SET 
           title = COALESCE(?, title),
           artist = COALESCE(?, artist),
           youtubeId = COALESCE(?, youtubeId),
           melody = COALESCE(?, melody),
           lyrics = COALESCE(?, lyrics),
           updatedAt = ?
         WHERE id = ?`,
        [
          body.title ?? null,
          body.artist ?? null,
          body.youtubeId ?? null,
          body.melody ?? null,
          body.lyrics ?? null,
          now,
          id.toString(),
        ]
      );

      res.status(200).json({ id });
      return;
    }

    if (req.method === 'DELETE') {
      await client.execute(`DELETE FROM songs WHERE id = ?`, [id.toString()]);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/songs/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
