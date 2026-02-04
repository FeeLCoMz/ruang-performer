import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import bandIdHandler from './[id].js';

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

    // Check if this is a request for a specific band ID
    const path = req.path || req.url.split('?')[0];
    const relativePath = path.replace(/^\/api\/bands\/?/, '').replace(/^\//, '');
    
    // Check for special endpoints (members, invitations)
    if (relativePath.includes('/')) {
      // Let this fall through to handle members/invitations routes below
    } else if (relativePath && (req.method === 'GET' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      // Delegate to [id].js handler for single band operations
      req.params = { ...req.params, id: relativePath };
      req.query = { ...req.query, id: relativePath };
      return bandIdHandler(req, res);
    }

    const client = getTursoClient();
    const userId = req.user?.userId;

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
        role: row.role || (row.createdBy === userId ? 'owner' : null),
        joinedAt: row.joinedAt,
        createdAt: row.createdAt,
        isOwner: row.createdBy === userId
      }));

      return res.status(200).json(bands);
    }

    // POST - Create new band
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
        return res.status(400).json({ error: 'Band name is required' });
      }
      const description = sanitize(body.description || '', 300);
      const genre = sanitize(body.genre || '', 50);

      const bandId = `band_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create band
      await client.execute(
        'INSERT INTO bands (id, name, description, genre, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [bandId, name, description || null, genre || null, userId, now]
      );

      // Add creator as owner
      await client.execute(
        'INSERT INTO band_members (bandId, userId, role, joinedAt) VALUES (?, ?, ?, ?)',
        [bandId, userId, 'owner', now]
      );

      return res.status(201).json({
        id: bandId,
        name,
        description,
        genre,
        createdBy: userId,
        role: 'owner',
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
