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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const client = getTursoClient();
    const body = await readJson(req);
    const songs = body.songs || [];

    if (!Array.isArray(songs) || songs.length === 0) {
      res.status(400).json({ error: 'No songs provided' });
      return;
    }

    // Ensure table exists
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

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const song of songs) {
      try {
        const id = song.id?.toString() || Date.now().toString();
        const now = new Date().toISOString();

        // Try insert, if exists do update
        const result = await client.execute(
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
            song.title || '',
            song.artist || null,
            song.youtubeId || null,
            song.melody || null,
            song.lyrics || null,
            song.key || null,
            song.tempo || null,
            song.style || null,
            (Array.isArray(song.timestamps) ? JSON.stringify(song.timestamps) : (song.timestamps || null)),
            song.createdAt || now,
            now,
          ]
        );

        if (result.rowsAffected > 0) {
          inserted++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error('Error syncing song:', song.title, err);
        errors++;
      }
    }

    res.status(200).json({
      success: true,
      total: songs.length,
      inserted,
      updated,
      errors
    });
  } catch (err) {
    console.error('API /api/songs/sync error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
