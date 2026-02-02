import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
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
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    const client = getTursoClient();

    await client.execute(
      `CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        youtubeId TEXT,
        lyrics TEXT,
        key TEXT,
        tempo TEXT,
        genre TEXT,
        capo TEXT,
        instruments TEXT,
        time_markers TEXT,
        userId TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT
      )`
    );
    const columnsResult = await client.execute(`PRAGMA table_info(songs)`);
    const columns = (columnsResult.rows || []).map(row => row.name);
    if (!columns.includes('userId')) {
      await client.execute(`ALTER TABLE songs ADD COLUMN userId TEXT`);
    }

    if (req.method === 'GET') {
      const rows = await client.execute(
        `SELECT id, title, artist, youtubeId, lyrics, key, tempo, genre, capo, instruments, time_markers, userId, createdAt, updatedAt
         FROM songs
         ORDER BY (updatedAt IS NULL) ASC, datetime(updatedAt) DESC, datetime(createdAt) DESC`
      );
      const list = (rows.rows ?? []).map(row => ({
        ...row,
        time_markers: row.time_markers ? JSON.parse(row.time_markers) : [],
        instruments: row.instruments ? JSON.parse(row.instruments) : [],
      }));
      res.status(200).json(list);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const now = new Date().toISOString();
      const userId = req.user?.userId;

      const upsertOne = async (item) => {
        const id = item.id?.toString() || randomUUID();
        // Pastikan tempo disimpan sebagai string integer tanpa koma
        let tempoStr = null;
        if (item.tempo !== undefined && item.tempo !== null && item.tempo !== '') {
          // Ambil hanya bagian integer, buang koma/desimal
          const tempoInt = parseInt(String(item.tempo).replace(/,/g, '.'), 10);
          if (!isNaN(tempoInt)) tempoStr = tempoInt.toString();
        }
        // Pastikan capo disimpan sebagai string integer
        let capoStr = null;
        if (item.capo !== undefined && item.capo !== null && item.capo !== '') {
          const capoInt = parseInt(String(item.capo), 10);
          if (!isNaN(capoInt)) capoStr = capoInt.toString();
        }
        await client.execute(
          `INSERT INTO songs (id, title, artist, youtubeId, lyrics, key, tempo, genre, capo, instruments, time_markers, userId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             artist = excluded.artist,
             youtubeId = excluded.youtubeId,
             lyrics = excluded.lyrics,
             key = excluded.key,
             tempo = excluded.tempo,
             genre = excluded.genre,
             capo = excluded.capo,
             instruments = excluded.instruments,
             time_markers = excluded.time_markers,
             updatedAt = excluded.updatedAt`,
          [
            id,
            item.title || '',
            item.artist || null,
            item.youtubeId || null,
            item.lyrics || null,
            item.key || null,
            tempoStr,
            item.genre || null,
            capoStr,
            (Array.isArray(item.instruments) ? JSON.stringify(item.instruments) : (item.instruments || null)),
            (Array.isArray(item.timestamps) ? JSON.stringify(item.timestamps) : (item.timestamps || null)),
            userId,
            item.createdAt || now,
            now
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
    res.status(500).json({ error: 'Internal Server Error', message: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}