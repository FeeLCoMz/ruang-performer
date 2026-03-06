import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  const client = getTursoClient();

  // Only owner can list all users
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Hanya owner yang dapat mengakses daftar users' });
  }

  if (req.method === 'GET') {
    try {
      const result = await client.execute(`
        SELECT 
          id, email, username, role, isActive, createdAt, updatedAt
        FROM users 
        WHERE deletedAt IS NULL 
        ORDER BY createdAt DESC
      `);
      
      const users = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        username: row.username,
        role: row.role,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));

      // Get band membership info for each user
      for (let user of users) {
        const bandResult = await client.execute({
          sql: `
            SELECT b.id, b.name, bm.role
            FROM band_members bm
            JOIN bands b ON bm.bandId = b.id
            WHERE bm.userId = ? AND bm.deletedAt IS NULL AND b.deletedAt IS NULL
          `,
          args: [user.id]
        });
        user.bands = bandResult.rows.map(r => ({
          bandId: r.id,
          bandName: r.name,
          role: r.role
        }));
      }

      res.json({ users });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Gagal mengambil daftar users' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
