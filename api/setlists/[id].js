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
    res.status(400).json({ error: 'Missing setlist id' });
    return;
  }

  try {
    let client;
    try {
      client = getTursoClient();
    } catch (clientErr) {
      console.error(`[setlists/[id]] Failed to get Turso client:`, clientErr.message);
      res.status(500).json({ error: 'Database connection error', details: clientErr.message });
      return;
    }
    if (req.method === 'GET') {
      try {
        const result = await client.execute(
          `SELECT id, name, desc, songs, setlistSongMeta, completedSongs, createdAt, updatedAt
           FROM setlists WHERE id = ? LIMIT 1`,
          [idStr]
        );

        const row = result.rows?.[0] || null;
        if (!row) {
          res.status(404).json({ error: 'Setlist not found' });
          return;
        }
        res.status(200).json({
          id: row.id,
          name: row.name,
          desc: row.desc || '',
          songs: (() => {
            try {
              return row.songs ? JSON.parse(row.songs) : [];
            } catch (e) {
              console.warn(`Invalid JSON in setlist.songs for id=${row.id}:`, e.message);
              return [];
            }
          })(),
          songKeys: (() => {
            try {
              return row.setlistSongMeta ? JSON.parse(row.setlistSongMeta) : {};
            } catch (e) {
              console.warn(`Invalid JSON in setlist.setlistSongMeta for id=${row.id}:`, e.message);
              return {};
            }
          })(),
          completedSongs: (() => {
            try {
              return row.completedSongs ? JSON.parse(row.completedSongs) : {};
            } catch (e) {
              console.warn(`Invalid JSON in setlist.completedSongs for id=${row.id}:`, e.message);
              return {};
            }
          })(),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        });
        return;
      } catch (queryErr) {
        throw queryErr;
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const songsJson = body.songs ? JSON.stringify(body.songs) : null;
      const setlistSongMetaJson = body.setlistSongMeta ? JSON.stringify(body.setlistSongMeta) : null;
      const completedSongsJson = body.completedSongs ? JSON.stringify(body.completedSongs) : null;

      await client.execute(
        `UPDATE setlists SET 
           name = COALESCE(?, name),
           desc = COALESCE(?, desc),
           songs = COALESCE(?, songs),
           setlistSongMeta = COALESCE(?, setlistSongMeta),
           completedSongs = COALESCE(?, completedSongs),
           updatedAt = ?
         WHERE id = ?`,
        [
          body.name ?? null,
          body.desc ?? null,
          songsJson,
          setlistSongMetaJson,
          completedSongsJson,
          now,
          idStr,
        ]
      );

      res.status(200).json({ id });
      return;
    }

    if (req.method === 'DELETE') {
      await client.execute(`DELETE FROM setlists WHERE id = ?`, [idStr]);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/setlists/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}