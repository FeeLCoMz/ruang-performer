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

    // Create table if not exist
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS gigs (
          id TEXT PRIMARY KEY,
          bandId TEXT,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          venue TEXT,
          city TEXT,
          fee REAL,
          setlistId TEXT,
          notes TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )
      `);
    } catch (tableError) {
      console.error('Table creation error:', tableError);
    }

    // GET - Fetch all gigs for user
    if (req.method === 'GET') {
      const { bandId } = req.query;
      
      let query = `
        SELECT g.id, g.bandId, g.date, g.venue, g.city, g.fee, g.setlistId, g.notes, g.createdAt, g.updatedAt,
               b.name as bandName, s.name as setlistName
        FROM gigs g
        LEFT JOIN bands b ON g.bandId = b.id
        LEFT JOIN setlists s ON g.setlistId = s.id
        WHERE g.userId = ?
      `;
      const params = [userId];
      
      if (bandId) {
        query += ` AND g.bandId = ?`;
        params.push(bandId);
      }
      
      query += ` ORDER BY datetime(g.date) DESC`;
      
      const result = await client.execute(query, params);

      const gigs = (result.rows || []).map(row => ({
        id: row.id,
        bandId: row.bandId,
        bandName: row.bandName,
        date: row.date,
        venue: row.venue || '',
        city: row.city || '',
        fee: row.fee,
        setlistId: row.setlistId,
        setlistName: row.setlistName,
        notes: row.notes || '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));

      return res.status(200).json(gigs);
    }

    // POST - Create new gig
    if (req.method === 'POST') {
      const body = await readJson(req);
      const { bandId, date, venue, city, fee, setlistId, notes } = body;

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      const id = randomUUID();
      const now = new Date().toISOString();

      try {
        await client.execute(
          `INSERT INTO gigs (id, bandId, userId, date, venue, city, fee, setlistId, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, bandId || null, userId, date, venue || '', city || '', fee || null, setlistId || null, notes || '', now, now]
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
    console.error('API /api/gigs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
