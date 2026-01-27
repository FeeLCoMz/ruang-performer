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
  const { id } = req.params || {};

  // Validate id parameter - be lenient, accept any non-empty string/number
  const idStr = id ? String(id).trim() : '';
  
  if (!idStr) {
    res.status(400).json({ error: 'Missing song id' });
    return;
  }

  try {
    let client;
    try {
      client = getTursoClient();
    } catch (clientErr) {
      console.error(`[songs/[id]] Failed to get Turso client:`, clientErr.message);
      res.status(500).json({ error: 'Database connection error', details: clientErr.message });
      return;
    }
    if (req.method === 'GET') {
      try {
        const result = await client.execute(
          `SELECT id, title, artist, youtubeId, lyrics, key, tempo, style, instruments, timestamps, createdAt, updatedAt
           FROM songs WHERE id = ? LIMIT 1`,
          [idStr]
        );
        const row = result.rows?.[0] || null;
        if (!row) {
          res.status(404).json({ error: 'Song not found' });
          return;
        }
        res.status(200).json({
          ...row,
          timestamps: row.timestamps ? JSON.parse(row.timestamps) : [],
          instruments: row.instruments ? JSON.parse(row.instruments) : [],
        });
        return;
      } catch (queryErr) {
        throw queryErr;
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const now = new Date().toISOString();

      // DEBUG: log payload yang diterima
      console.log('[PUT /api/songs/:id] Payload:', JSON.stringify(body));

      const updateParams = [
        body.title ?? null,
        body.artist ?? null,
        body.youtubeId ?? null,
        body.lyrics ?? null,
        body.key ?? null,
        body.tempo ?? null,
        body.style ?? null,
        (Array.isArray(body.instruments) ? JSON.stringify(body.instruments) : (body.instruments ?? null)),
        (Array.isArray(body.timestamps) ? JSON.stringify(body.timestamps) : (body.timestamps ?? null)),
        now,
        idStr,
      ];
      //console.log('[PUT /api/songs/:id] Update params:', updateParams);

      const result = await client.execute(
        `UPDATE songs SET 
           title = COALESCE(?, title),
           artist = COALESCE(?, artist),
           youtubeId = COALESCE(?, youtubeId),
           lyrics = COALESCE(?, lyrics),
           key = COALESCE(?, key),
           tempo = COALESCE(?, tempo),
           style = COALESCE(?, style),
           instruments = COALESCE(?, instruments),
           timestamps = COALESCE(?, timestamps),
           updatedAt = ?
         WHERE id = ?`,
        updateParams
      );
      console.log('[PUT /api/songs/:id] Update result:', result);

      res.status(200).json({ id });
      return;
    }

    if (req.method === 'DELETE') {
      await client.execute(`DELETE FROM songs WHERE id = ?`, [idStr]);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/songs/[id] error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}