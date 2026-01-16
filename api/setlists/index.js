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
      // Create table if not exists
      await client.execute(
        `CREATE TABLE IF NOT EXISTS setlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          songs TEXT DEFAULT '[]',
          songKeys TEXT DEFAULT '{}',
          completedSongs TEXT DEFAULT '{}',
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )`
      );
      
      // Try to add completedSongs column if it doesn't exist (for existing tables)
      try {
        await client.execute(
          `ALTER TABLE setlists ADD COLUMN completedSongs TEXT DEFAULT '{}'`
        );
      } catch (e) {
        // Column already exists, ignore error
      }
      
      const rows = await client.execute(
        `SELECT id, name, songs, songKeys, completedSongs, createdAt, updatedAt
         FROM setlists
         ORDER BY (updatedAt IS NULL) ASC, datetime(updatedAt) DESC, datetime(createdAt) DESC`
      );
      const setlists = (rows.rows ?? []).map(row => ({
        id: row.id,
        name: row.name,
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
            return row.songKeys ? JSON.parse(row.songKeys) : {};
          } catch (e) {
            console.warn(`Invalid JSON in setlist.songKeys for id=${row.id}:`, e.message);
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
      
      // Validate required fields
      if (!body.name || body.name.trim() === '') {
        res.status(400).json({ error: 'Setlist name is required' });
        return;
      }
      
      const id = body.id?.toString() || randomUUID();
      const now = new Date().toISOString();
      
      try {
        const songsJson = JSON.stringify(body.songs || []);
        const songKeysJson = JSON.stringify(body.songKeys || {});
        const completedSongsJson = JSON.stringify(body.completedSongs || {});
        
        await client.execute(
          `INSERT INTO setlists (id, name, songs, songKeys, completedSongs, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            body.name.trim() || 'Untitled Set List',
            songsJson,
            songKeysJson,
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
          const songsJson = JSON.stringify(body.songs || []);
          const songKeysJson = JSON.stringify(body.songKeys || {});
          const completedSongsJson = JSON.stringify(body.completedSongs || {});
          
          await client.execute(
            `UPDATE setlists SET 
               name = ?, 
               songs = ?, 
               songKeys = ?, 
               completedSongs = ?, 
               updatedAt = ?
             WHERE id = ?`,
            [
              body.name.trim() || 'Untitled Set List',
              songsJson,
              songKeysJson,
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
    res.status(500).json({ error: 'Internal Server Error', message: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}