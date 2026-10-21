import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';

/**
 * POST /api/tools/restore
 * Body: { sql: string }
 * Restore database from SQL dump (administrator only)
 */
export default async function handler(req, res) {
  const user = req.user;
  if (!user || !['owner', 'admin'].includes(user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sql } = req.body || {};
  if (!sql || typeof sql !== 'string' || !sql.trim()) {
    return res.status(400).json({ error: 'File SQL kosong atau tidak valid.' });
  }

  // Validasi minimal: hanya statement INSERT, UPDATE, DELETE, dan CREATE TABLE yang diizinkan
  const allowed = /^(INSERT|UPDATE|DELETE|CREATE TABLE|DROP TABLE|ALTER TABLE)/i;
  const client = getTursoClient();
  try {
    // Split by ;, trim, and filter out comments/blank lines
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    if (statements.length === 0) {
      return res.status(400).json({ error: 'Tidak ada statement SQL ditemukan.' });
    }
    for (const stmt of statements) {
      if (!allowed.test(stmt)) {
        return res.status(400).json({ error: 'Statement tidak didukung: ' + stmt.slice(0, 40) });
      }
      try {
        await client.execute(stmt);
      } catch (err) {
        return res.status(400).json({ error: 'Error pada statement: ' + stmt.slice(0, 40) + ' - ' + (err.message || err) });
      }
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Restore failed' });
  }
}
