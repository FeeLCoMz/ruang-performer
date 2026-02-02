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
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create tables if not exist
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS practice_sessions (
          id TEXT PRIMARY KEY,
          bandId TEXT,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          duration INTEGER,
          songs TEXT DEFAULT '[]',
          notes TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )
      `);
    } catch (tableError) {
      console.error('Table creation error:', tableError);
    }

    // GET - Fetch all practice sessions for user
    if (req.method === 'GET') {
      const { bandId } = req.query;
      
      let query = `
        SELECT ps.id, ps.bandId, ps.date, ps.duration, ps.songs, ps.notes, ps.createdAt, ps.updatedAt,
               b.name as bandName
        FROM practice_sessions ps
        LEFT JOIN bands b ON ps.bandId = b.id
        WHERE ps.userId = ?
      `;
      const params = [userId];
      
      if (bandId) {
        query += ` AND ps.bandId = ?`;
        params.push(bandId);
      }
      
      query += ` ORDER BY datetime(ps.date) DESC`;
      
      const result = await client.execute(query, params);

      const sessions = (result.rows || []).map(row => ({
        id: row.id,
        bandId: row.bandId,
        bandName: row.bandName,
        date: row.date,
        duration: row.duration,
        songs: (() => {
          try {
            return row.songs ? JSON.parse(row.songs) : [];
          } catch (e) {
            console.warn(`Invalid JSON in practice_sessions.songs for id=${row.id}:`, e.message);
            return [];
          }
        })(),
        notes: row.notes || '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));

      return res.status(200).json(sessions);
    }

    // POST - Create new practice session
    if (req.method === 'POST') {
      const body = await readJson(req);
      const { bandId, date, duration, songs, notes } = body;

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      const songsJson = JSON.stringify(songs || []);

      try {
        await client.execute(
          `INSERT INTO practice_sessions (id, bandId, userId, date, duration, songs, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, bandId || null, userId, date, duration || null, songsJson, notes || '', now, now]
        );
        res.status(201).json({ id });
      } catch (err) {
        console.error('Insert error:', err);
        throw err;
      }
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/practice error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
