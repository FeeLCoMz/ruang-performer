import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getTursoClient } from '../_turso.js';
import { createRateLimiter, RATE_LIMITS } from '../middleware/rateLimiter.js';

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

const rateLimiter = createRateLimiter({ ...RATE_LIMITS.AUTH_REGISTER });
export default async function handler(req, res) {
  await rateLimiter(req, res, () => {});
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const client = getTursoClient();

    // Create users table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT
      )
    `);

    const body = await readJson(req);
    const { email, username, password } = body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password required' });
    }

    // Check if email already exists
    const existing = await client.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if username already exists
    const usernameExists = await client.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (usernameExists.rows && usernameExists.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert user
    await client.execute(
      'INSERT INTO users (id, email, username, passwordHash) VALUES (?, ?, ?, ?)',
      [userId, email, username, passwordHash]
    );

    // Generate token
    const token = jwt.sign(
      { userId, email, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: userId, email, username }
    });

  } catch (error) {
    console.error('Register handler error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
}
