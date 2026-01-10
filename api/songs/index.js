import { getTursoClient } from '../_turso.js';
import { randomUUID } from 'crypto';

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
    const client = getTursoClient();

    if (req.method === 'GET') {
      await client.execute(
        `CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT,
          youtubeId TEXT,
          melody TEXT,
          lyrics TEXT,
          key TEXT,
          tempo TEXT,
          style TEXT,
          timestamps TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )`
      );
      const rows = await client.execute(
        `SELECT id, title, artist, youtubeId, melody, lyrics, key, tempo, style, timestamps, createdAt, updatedAt
         FROM songs
         ORDER BY (updatedAt IS NULL) ASC, datetime(updatedAt) DESC, datetime(createdAt) DESC`
      );
      const list = (rows.rows ?? []).map(row => ({
        ...row,
        timestamps: row.timestamps ? JSON.parse(row.timestamps) : []
      }));
      res.status(200).json(list);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const upsertOne = async (item) => {
        const id = item.id?.toString() || randomUUID();
        await client.execute(
          `INSERT INTO songs (id, title, artist, youtubeId, melody, lyrics, key, tempo, style, timestamps, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             artist = excluded.artist,
             youtubeId = excluded.youtubeId,
             melody = excluded.melody,
             lyrics = excluded.lyrics,
             key = excluded.key,
             tempo = excluded.tempo,
             style = excluded.style,
             timestamps = excluded.timestamps,
             updatedAt = excluded.updatedAt`,
          [
            id,
            item.title || '',
            item.artist || null,
            item.youtubeId || null,
            item.melody || null,
            item.lyrics || null,
            item.key || null,
            item.tempo || null,
            item.style || null,
            (Array.isArray(item.timestamps) ? JSON.stringify(item.timestamps) : (item.timestamps || null)),
            item.createdAt || now,
            now,
          ]
        );
        return id;
      };
      if (Array.isArray(body)) {
        const ids = [];
        for (const item of body) {
          const id = await upsertOne(item);
          ids.push(id);
        }
        res.status(200).json({ ids });
      } else {
        const id = await upsertOne(body);
        res.status(201).json({ id });
      }
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/songs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
