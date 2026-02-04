import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { randomUUID } from 'crypto';
import setlistIdHandler from './[id].js';

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

    // Check if this is a request for a specific setlist ID
    const path = req.path || req.url.split('?')[0];
    const relativePath = path.replace(/^\/api\/setlists\/?/, '').replace(/^\//, '');
    
    if (relativePath && (req.method === 'GET' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      // Delegate to [id].js handler
      req.params = { ...req.params, id: relativePath };
      req.query = { ...req.query, id: relativePath };
      return setlistIdHandler(req, res);
    }

    const client = getTursoClient();
    const userId = req.user?.userId;

    if (req.method === 'GET') {
      // Create table if not exists
      await client.execute(
        `CREATE TABLE IF NOT EXISTS setlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          bandId TEXT,
          songs TEXT DEFAULT '[]',
          setlistSongMeta TEXT DEFAULT '{}',
          completedSongs TEXT DEFAULT '{}',
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )`
      );

      // Try to add desc and completedSongs column if not exist (for existing tables)
      try {
        await client.execute(`ALTER TABLE setlists ADD COLUMN description TEXT DEFAULT ''`);
      } catch (e) {}
      try {
        await client.execute(`ALTER TABLE setlists ADD COLUMN completedSongs TEXT DEFAULT '{}'`);
      } catch (e) {}
      try {
        await client.execute(`ALTER TABLE setlists ADD COLUMN setlistSongMeta TEXT DEFAULT '{}'`);
      } catch (e) {}
      try {
        await client.execute(`ALTER TABLE setlists ADD COLUMN bandId TEXT`);
      } catch (e) {}
      
      // Get only setlists user has access to
      // Rules: user's own setlists OR setlists from bands they're a member of
      const rows = await client.execute(
        `SELECT s.id, s.name, s.description, s.bandId, s.songs, s.setlistSongMeta, s.completedSongs, s.createdAt, s.updatedAt,
                b.name as bandName
         FROM setlists s
         LEFT JOIN bands b ON s.bandId = b.id
         WHERE s.bandId IS NULL 
            OR (s.bandId IS NOT NULL AND EXISTS (
              SELECT 1 FROM band_members WHERE bandId = s.bandId AND userId = ?
            ))
         ORDER BY (s.updatedAt IS NULL) ASC, datetime(s.updatedAt) DESC, datetime(s.createdAt) DESC`,
        [userId]
      );
      const setlists = (rows.rows ?? []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        bandId: row.bandId,
        bandName: row.bandName,
        songs: (() => {
          try {
            return row.songs ? JSON.parse(row.songs) : [];
          } catch (e) {
            console.warn(`Invalid JSON in setlist.songs for id=${row.id}:`, e.message);
            return [];
          }
        })(),
        setlistSongMeta: (() => {
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
      }));
      res.status(200).json(setlists);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);

      // Simple sanitization
      function sanitize(str, maxLen = 100) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>"'`]/g, '').slice(0, maxLen);
      }

      // Validate and sanitize required fields
      const name = sanitize(body.name, 100);
      if (!name || name.length < 1) {
        res.status(400).json({ error: 'Setlist name is required' });
        return;
      }
      const description = sanitize(body.description || '', 300);
      let bandId = body.bandId || null;
      if (bandId) {
        bandId = sanitize(bandId, 50);
        const bandCheck = await client.execute(
          `SELECT 1 FROM band_members WHERE bandId = ? AND userId = ?`,
          [bandId, userId]
        );
        if (!bandCheck.rows || bandCheck.rows.length === 0) {
          res.status(403).json({ error: 'You are not a member of this band' });
          return;
        }
      }

      const id = body.id?.toString() || randomUUID();
      const now = new Date().toISOString();

      try {
        const songsJson = JSON.stringify(Array.isArray(body.songs) ? body.songs : []);
        const setlistSongMetaJson = JSON.stringify(typeof body.setlistSongMeta === 'object' && body.setlistSongMeta !== null ? body.setlistSongMeta : {});
        const completedSongsJson = JSON.stringify(typeof body.completedSongs === 'object' && body.completedSongs !== null ? body.completedSongs : {});

        await client.execute(
          `INSERT INTO setlists (id, name, description, bandId, songs, setlistSongMeta, completedSongs, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            name,
            description,
            bandId,
            songsJson,
            setlistSongMetaJson,
            completedSongsJson,
            body.createdAt || now,
            now,
          ]
        );
        res.status(201).json({ id });
      } catch (insertErr) {
        // Check if it's a duplicate key error
        if (insertErr.message && insertErr.message.includes('UNIQUE')) {
          // Setlist already exists, update instead
          const songsJson = JSON.stringify(Array.isArray(body.songs) ? body.songs : []);
          const setlistSongMetaJson = JSON.stringify(typeof body.setlistSongMeta === 'object' && body.setlistSongMeta !== null ? body.setlistSongMeta : {});
          const completedSongsJson = JSON.stringify(typeof body.completedSongs === 'object' && body.completedSongs !== null ? body.completedSongs : {});

          await client.execute(
            `UPDATE setlists SET 
               name = ?, 
               description = ?,
               bandId = ?,
               songs = ?, 
               setlistSongMeta = ?, 
               completedSongs = ?, 
               updatedAt = ?
             WHERE id = ?`,
            [
              name,
              description,
              bandId,
              songsJson,
              setlistSongMetaJson,
              completedSongsJson,
              now,
              id,
            ]
          );
          res.status(200).json({ id });
        } else {
          throw insertErr;
        }
      }
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/setlists error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
