import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { randomUUID } from 'crypto';
import songIdHandler from './[id].js';

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

    // Check if this is a request for a specific song ID
    const path = req.path || req.url.split('?')[0];
    const relativePath = path.replace(/^\/api\/songs\/?/, '').replace(/^\//, '');
    
    if (relativePath && (req.method === 'GET' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      // Delegate to [id].js handler
      req.params = { ...req.params, id: relativePath };
      req.query = { ...req.query, id: relativePath };
      return songIdHandler(req, res);
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

      // Simple sanitization
      function sanitize(str, maxLen = 100) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>"'`]/g, '').slice(0, maxLen);
      }

      const upsertOne = async (item) => {
        // Validasi title wajib
        const title = sanitize(item.title, 100);
        if (!title || title.length < 1) {
          throw new Error('Judul lagu wajib diisi');
        }
        const artist = sanitize(item.artist, 100);
        const genre = sanitize(item.genre, 50);
        const key = sanitize(item.key, 20);
        const youtubeId = sanitize(item.youtubeId, 30);
        // Pastikan tempo disimpan sebagai string integer tanpa koma
        let tempoStr = null;
        if (item.tempo !== undefined && item.tempo !== null && item.tempo !== '') {
          const tempoInt = parseInt(String(item.tempo).replace(/,/g, '.'), 10);
          if (!isNaN(tempoInt)) tempoStr = tempoInt.toString();
        }
        // Pastikan capo disimpan sebagai string integer
        let capoStr = null;
        if (item.capo !== undefined && item.capo !== null && item.capo !== '') {
          const capoInt = parseInt(String(item.capo), 10);
          if (!isNaN(capoInt)) capoStr = capoInt.toString();
        }
        const id = item.id?.toString() || randomUUID();
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
            title,
            artist || null,
            youtubeId || null,
            item.lyrics || null,
            key || null,
            tempoStr,
            genre || null,
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
      try {
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
      } catch (err) {
        res.status(400).json({ error: err.message || 'Input tidak valid' });
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