import jwt from 'jsonwebtoken';
import { getTursoClient } from '../_turso.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';


export default async function handler(req, res) {
  try {
    const client = getTursoClient();

    if (req.method === 'GET') {
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
      // Fetch user from database
      const result = await client.execute(
        'SELECT id, email, username, createdAt, displayName, bio, profilePicture, instrument, experience, genres, location FROM users WHERE id = ?',
        [decoded.userId]
      );
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = result.rows[0];
      // Parse genres if present
      if (user.genres && typeof user.genres === 'string') {
        try { user.genres = JSON.parse(user.genres); } catch {}
      }

      // Fetch bands where user is a member
      const bandsResult = await client.execute(
        `SELECT b.id, b.name, b.genre, b.description, bm.role
         FROM band_members bm
         JOIN bands b ON bm.bandId = b.id
         WHERE bm.userId = ? AND bm.status = 'active' AND b.deletedAt IS NULL`,
        [user.id]
      );
      user.bands = bandsResult.rows || [];

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          displayName: user.displayName,
          bio: user.bio,
          profilePicture: user.profilePicture,
          instrument: user.instrument,
          experience: user.experience,
          genres: user.genres,
          location: user.location,
          createdAt: user.createdAt,
          bands: user.bands
        }
      });
    }

    if (req.method === 'PUT') {
      // Update profile
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
      const body = req.body || await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
          try { resolve(data ? JSON.parse(data) : {}); }
          catch (e) { reject(e); }
        });
        req.on('error', reject);
      });
      const fields = {};
      if (body.displayName) fields.displayName = body.displayName;
      if (body.bio) fields.bio = body.bio;
      if (body.profilePicture) fields.profilePicture = body.profilePicture;
      if (body.instrument) fields.instrument = body.instrument;
      if (body.experience) fields.experience = body.experience;
      if (body.genres) fields.genres = JSON.stringify(body.genres);
      if (body.location) fields.location = body.location;
      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'No profile fields to update' });
      }
      // Build SQL
      const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
      const values = Object.values(fields);
      values.push(userId);
      await client.execute(
        `UPDATE users SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
      return res.status(200).json({ success: true, message: 'Profile updated' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Get user handler error:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
}
