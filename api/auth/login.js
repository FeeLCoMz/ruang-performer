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

const rateLimiter = createRateLimiter({ ...RATE_LIMITS.AUTH_LOGIN });
export default async function handler(req, res) {
  // The limiter only calls the continuation when the request is allowed;
  // if it denies, it responds 429 itself and never invokes the callback.
  let allowed = false;
  await rateLimiter(req, res, () => { allowed = true; });
  // If rate limiter already sent a response, stop handler
  if (res.headersSent) return;
  if (!allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Terlalu banyak percobaan login. Coba lagi nanti.'
    });
  }
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
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }


    // Find user (fetch role as well)
    const result = await client.execute(
      'SELECT id, email, username, passwordHash, role FROM users WHERE email = ?',
      [email]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token with role
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    });

  } catch (error) {
    console.error('Login handler error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
}
