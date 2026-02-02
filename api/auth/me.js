import jwt from 'jsonwebtoken';
import { getTursoClient } from '../_turso.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const client = getTursoClient();

    // Fetch user from database
    const result = await client.execute(
      'SELECT id, email, username, createdAt FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user handler error:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
}
