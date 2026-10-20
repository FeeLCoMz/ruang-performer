import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getTursoClient } from '../_turso.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
  // Auth check
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const userId = decoded.userId;
  const client = getTursoClient();

  if (req.method === 'POST') {
    // Change password
    const body = await readJson(req);
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    // Fetch user
    const result = await client.execute('SELECT passwordHash FROM users WHERE id = ?', [userId]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Old password incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await client.execute('UPDATE users SET passwordHash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, userId]);
    return res.status(200).json({ success: true, message: 'Password updated' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
