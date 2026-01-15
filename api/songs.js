import { getTursoClient } from './_turso.js';
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
  const client = getTursoClient();
  const url = req.url || '';
  const method = req.method;

  // /api/songs/sync
  if (url.startsWith('/api/songs/sync')) {
    if (method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const body = await readJson(req);
    const songs = body.songs || [];
    if (!Array.isArray(songs) || songs.length === 0) {
      res.status(400).json({ error: 'No songs provided' });
      return;
    }
    await client.execute(
      `CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        youtubeId TEXT,
        lyrics TEXT,
        key TEXT,
        tempo TEXT,
        style TEXT,
        timestamps TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT
      )`
    );
    for (const song of songs) {
      await client.execute(
        `INSERT OR REPLACE INTO songs (id, title, artist, youtubeId, lyrics, key, tempo, style, timestamps, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM songs WHERE id = ?), datetime('now')), datetime('now'))`,
        [song.id, song.title, song.artist, song.youtubeId, song.lyrics, song.key, song.tempo, song.style, song.timestamps, song.id]
      );
    }
    res.json({ success: true, count: songs.length });
    return;
  }

  // /api/songs/:id
  const idMatch = url.match(/^\/api\/songs\/(.+)$/);
  if (idMatch && !url.startsWith('/api/songs/sync')) {
    const id = decodeURIComponent(idMatch[1]);
    if (!id) {
      res.status(400).json({ error: 'Missing song id' });
      return;
    }
    if (method === 'GET') {
      const result = await client.execute(
        `SELECT id, title, artist, youtubeId, lyrics, key, tempo, style, timestamps, createdAt, updatedAt
         FROM songs WHERE id = ? LIMIT 1`,
        [id]
      );
      const song = result.rows[0];
      if (!song) {
        res.status(404).json({ error: 'Song not found' });
        return;
      }
      res.json(song);
      return;
    }
    if (method === 'PUT') {
      const body = await readJson(req);
      await client.execute(
        `UPDATE songs SET title=?, artist=?, youtubeId=?, lyrics=?, key=?, tempo=?, style=?, timestamps=?, updatedAt=datetime('now') WHERE id=?`,
        [body.title, body.artist, body.youtubeId, body.lyrics, body.key, body.tempo, body.style, body.timestamps, id]
      );
      res.json({ success: true });
      return;
    }
    if (method === 'DELETE') {
      await client.execute(`DELETE FROM songs WHERE id=?`, [id]);
      res.json({ success: true });
      return;
    }
    res.setHeader('Allow', 'GET,PUT,DELETE');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // /api/songs (list & create)
  if (url.startsWith('/api/songs')) {
    if (method === 'GET') {
      await client.execute(
        `CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT,
          youtubeId TEXT,
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
        `SELECT id, title, artist, youtubeId, lyrics, key, tempo, style, timestamps, createdAt, updatedAt
         FROM songs
         ORDER BY (updatedAt IS NULL) ASC, datetime(updatedAt) DESC, datetime(createdAt) DESC`
      );
      res.json(rows.rows);
      return;
    }
    if (method === 'POST') {
      const body = await readJson(req);
      const id = body.id || randomUUID();
      await client.execute(
        `INSERT INTO songs (id, title, artist, youtubeId, lyrics, key, tempo, style, timestamps, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)`,
        [id, body.title, body.artist, body.youtubeId, body.lyrics, body.key, body.tempo, body.style, body.timestamps]
      );
      res.json({ success: true, id });
      return;
    }
    res.setHeader('Allow', 'GET,POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Fallback
  res.status(404).json({ error: 'Not found' });
}
