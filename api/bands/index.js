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
  try {
    const client = getTursoClient();
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create tables if not exist
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS bands (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          createdBy TEXT NOT NULL,
          description TEXT,
          genre TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS band_members (
          id TEXT PRIMARY KEY,
          bandId TEXT NOT NULL,
          userId TEXT NOT NULL,
          role TEXT,
          status TEXT DEFAULT 'active',
          joinedAt TEXT DEFAULT (datetime('now')),
          UNIQUE(bandId, userId)
        )
      `);
    } catch (tableError) {
      console.error('Table creation error:', tableError);
      // Continue even if tables already exist
    }

    // GET - Fetch all bands where user is a member
    if (req.method === 'GET') {
      const result = await client.execute(`
        SELECT DISTINCT b.id, b.name, b.description, b.genre, b.createdBy, b.createdAt,
               bm.role, bm.joinedAt
        FROM bands b
        LEFT JOIN band_members bm ON b.id = bm.bandId AND bm.userId = ?
        WHERE b.createdBy = ? OR bm.userId = ?
        ORDER BY b.createdAt DESC
      `, [userId, userId, userId]);

      const bands = (result.rows || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        genre: row.genre,
        createdBy: row.createdBy,
        role: row.role || (row.createdBy === userId ? 'leader' : null),
        joinedAt: row.joinedAt,
        createdAt: row.createdAt,
        isOwner: row.createdBy === userId
      }));

      return res.status(200).json(bands);
    }

    // POST - Create new band
    if (req.method === 'POST') {
      const body = await readJson(req);
      const { name, description, genre } = body;

      if (!name) {
        return res.status(400).json({ error: 'Band name is required' });
      }

      const bandId = `band_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create band
      await client.execute(
        'INSERT INTO bands (id, name, description, genre, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [bandId, name, description || null, genre || null, userId, now]
      );

      // Add creator as leader
      await client.execute(
        'INSERT INTO band_members (bandId, userId, role, joinedAt) VALUES (?, ?, ?, ?)',
        [bandId, userId, 'leader', now]
      );

      return res.status(201).json({
        id: bandId,
        name,
        description,
        genre,
        createdBy: userId,
        role: 'leader',
        createdAt: now,
        isOwner: true
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bands handler error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
