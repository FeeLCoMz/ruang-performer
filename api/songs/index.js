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
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )`
      );
      const rows = await client.execute(
        `SELECT id, title, artist, youtubeId, melody, lyrics, createdAt, updatedAt
         FROM songs
         ORDER BY (updatedAt IS NULL) ASC, datetime(updatedAt) DESC, datetime(createdAt) DESC`
      );
      res.status(200).json(rows.rows ?? []);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const id = body.id?.toString() || randomUUID();
      const now = new Date().toISOString();
      await client.execute(
        `INSERT INTO songs (id, title, artist, youtubeId, melody, lyrics, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.title || '',
          body.artist || null,
          body.youtubeId || null,
          body.melody || null,
          body.lyrics || null,
          body.createdAt || now,
          now,
        ]
      );
      res.status(201).json({ id });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/songs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
