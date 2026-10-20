import jwt from 'jsonwebtoken';
import { getTursoClient } from '../_turso.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const client = getTursoClient();
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = decoded.userId;
    // Ambil audit log user
    const result = await client.execute(
      `SELECT id, action, category, severity, status, bandId, description, details, ipAddress, userAgent, changes, createdAt
       FROM audit_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT 20`,
      [userId]
    );
    return res.status(200).json({ success: true, logs: result.rows });
  } catch (error) {
    console.error('Get user audit logs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get audit logs' });
  }
}
