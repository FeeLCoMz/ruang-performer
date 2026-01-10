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
        `CREATE TABLE IF NOT EXISTS setlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          songs TEXT DEFAULT '[]',
          songKeys TEXT DEFAULT '{}',
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )`
      );
      const rows = await client.execute(
        `SELECT id, name, songs, songKeys, createdAt, updatedAt
         FROM setlists
         ORDER BY (updatedAt IS NULL) ASC, datetime(updatedAt) DESC, datetime(createdAt) DESC`
      );
      const setlists = (rows.rows ?? []).map(row => ({
        id: row.id,
        name: row.name,
        songs: row.songs ? JSON.parse(row.songs) : [],
        songKeys: row.songKeys ? JSON.parse(row.songKeys) : {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));
      res.status(200).json(setlists);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const id = body.id?.toString() || randomUUID();
      const now = new Date().toISOString();
      const songsJson = JSON.stringify(body.songs || []);
      const songKeysJson = JSON.stringify(body.songKeys || {});
      await client.execute(
        `INSERT INTO setlists (id, name, songs, songKeys, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.name || 'Untitled Set List',
          songsJson,
          songKeysJson,
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
    console.error('API /api/setlists error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
