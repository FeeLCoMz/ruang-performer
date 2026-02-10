import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { PERMISSIONS, hasPermission } from '../../src/utils/permissionUtils.js';
import bandIdHandler from './[id].js';
import nodemailer from 'nodemailer';
import { createRateLimiter, RATE_LIMITS } from '../middleware/rateLimiter.js';
// Invitations email setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
const rateLimiter = createRateLimiter({ ...RATE_LIMITS.API_WRITE });

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
  // Invitations subroute: /api/bands/invitations/:id
  const path = req.path || req.url.split('?')[0];

  // Handle GET /api/invitations/pending (for vercel route)
  if (path === '/api/invitations/pending' && req.method === 'GET') {
    try {
      if (!verifyToken(req, res)) return;
      const client = getTursoClient();
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      // Get user's email
      const userResult = await client.execute(
        'SELECT email FROM users WHERE id = ?',
        [userId]
      );
      if (!userResult.rows || userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const userEmail = userResult.rows[0].email;
      // Get pending invitations for this user (case-insensitive email match)
      const invResult = await client.execute(
        `SELECT i.id, i.bandId, i.email, i.role, i.invitedBy, i.status, i.createdAt, i.expiresAt,
                b.name as bandName, u.username as invitedByName
         FROM band_invitations i
         LEFT JOIN bands b ON i.bandId = b.id
         LEFT JOIN users u ON i.invitedBy = u.id
         WHERE LOWER(i.email) = LOWER(?) AND i.status = 'pending' AND datetime(i.expiresAt) > datetime('now')
         ORDER BY datetime(i.createdAt) DESC`,
        [userEmail]
      );
      res.status(200).json(invResult.rows || []);
      return;
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch pending invitations' });
      return;
    }
  }
  // Accept/reject invitation: /api/bands/invitations/:id/accept atau /reject
  const invitationAcceptMatch = path.match(/^\/api\/bands\/invitations\/([^/]+)\/(accept|reject)$/);
  if (invitationAcceptMatch && req.method === 'PATCH') {
    await rateLimiter(req, res, () => {});
    try {
      if (!verifyToken(req, res)) return;
      const client = getTursoClient();
      const userId = req.user?.userId;
      const invitationId = invitationAcceptMatch[1];
      const action = invitationAcceptMatch[2];
      // Get invitation
      const invRes = await client.execute('SELECT * FROM band_invitations WHERE id = ?', [invitationId]);
      if (!invRes.rows || invRes.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found' });
      }
      const invitation = invRes.rows[0];
      // Get user email
      const userRes = await client.execute('SELECT email FROM users WHERE id = ?', [userId]);
      if (!userRes.rows || userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userEmail = userRes.rows[0].email;
      if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({ error: 'You are not authorized for this invitation' });
      }
      if (action === 'accept') {
        // Add to band_members if not already
        const memberRes = await client.execute('SELECT id FROM band_members WHERE bandId = ? AND userId = ?', [invitation.bandId, userId]);
        if (!memberRes.rows || memberRes.rows.length === 0) {
          await client.execute('INSERT INTO band_members (bandId, userId, role, joinedAt) VALUES (?, ?, ?, ?)', [invitation.bandId, userId, invitation.role, new Date().toISOString()]);
        }
        await client.execute('UPDATE band_invitations SET status = ?, acceptedAt = ? WHERE id = ?', ['accepted', new Date().toISOString(), invitationId]);
        return res.status(200).json({ success: true, message: 'Invitation accepted' });
      } else if (action === 'reject') {
        await client.execute('UPDATE band_invitations SET status = ? WHERE id = ?', ['rejected', invitationId]);
        return res.status(200).json({ success: true, message: 'Invitation rejected' });
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Invitation accept/reject error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
  if (/^\/api\/bands\/invitations(\/|$)/.test(path)) {
    await rateLimiter(req, res, () => {});
    try {
      if (!verifyToken(req, res)) return;
      const client = getTursoClient();
      const userId = req.user?.userId;
      // Extract invitation id or band id
      const parts = path.split('/');
      const bandId = req.params?.id || parts[parts.length - 1];
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      // Create table if not exist
      try {
        await client.execute(`
          CREATE TABLE IF NOT EXISTS band_invitations (
            id TEXT PRIMARY KEY,
            bandId TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            invitedBy TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt TEXT DEFAULT (datetime('now')),
            expiresAt TEXT,
            acceptedAt TEXT,
            UNIQUE(bandId, email)
          )
        `);
      } catch (e) {}
      if (req.method === 'GET') {
        const bandResult = await client.execute(
          'SELECT createdBy FROM bands WHERE id = ?',
          [bandId]
        );
        if (!bandResult.rows || bandResult.rows.length === 0) {
          return res.status(404).json({ error: 'Band not found' });
        }
        const isOwner = bandResult.rows[0].createdBy === userId;
        if (!isOwner) {
          return res.status(403).json({ error: 'Only band owner can view invitations' });
        }
        const result = await client.execute(`
          SELECT id, email, role, invitedBy, status, createdAt, expiresAt, acceptedAt
          FROM band_invitations
          WHERE bandId = ?
          ORDER BY createdAt DESC
        `, [bandId]);
        return res.status(200).json(result.rows || []);
      }
      if (req.method === 'POST') {
        const body = req.body || await (async function(req){
          return await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => {
              try { resolve(data ? JSON.parse(data) : {}); }
              catch (e) { reject(e); }
            });
            req.on('error', reject);
          });
        })(req);
        const { email, role = 'member' } = body;
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        const bandResult = await client.execute(
          'SELECT name, createdBy FROM bands WHERE id = ?',
          [bandId]
        );
        if (!bandResult.rows || bandResult.rows.length === 0) {
          return res.status(404).json({ error: 'Band not found' });
        }
        if (bandResult.rows[0].createdBy !== userId) {
          return res.status(403).json({ error: 'Only band owner can send invitations' });
        }
        const existingMember = await client.execute(`
          SELECT id FROM band_members
          WHERE bandId = ? AND userId IN (
            SELECT id FROM users WHERE LOWER(email) = LOWER(?)
          )
        `, [bandId, email]);
        if (existingMember.rows && existingMember.rows.length > 0) {
          return res.status(409).json({ error: 'User already a band member' });
        }
        const existingInv = await client.execute(
          'SELECT id, status FROM band_invitations WHERE bandId = ? AND LOWER(email) = LOWER(?)',
          [bandId, email]
        );
        if (existingInv.rows && existingInv.rows.length > 0) {
          if (existingInv.rows[0].status === 'pending') {
            return res.status(409).json({ error: 'Invitation already sent to this email' });
          }
        }
        const invId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await client.execute(`
          INSERT INTO band_invitations (id, bandId, email, role, invitedBy, status, createdAt, expiresAt)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [invId, bandId, email, role, userId, now, expiresAt]);
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
          const acceptLink = `${process.env.APP_URL || 'http://localhost:5173'}/invitations/${invId}/accept`;
          const rejectLink = `${process.env.APP_URL || 'http://localhost:5173'}/invitations/${invId}/reject`;
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: email,
              subject: `Join ${bandResult.rows[0].name} on Ruang Performer`,
              html: `
                <h2>You're invited to join a band!</h2>
                <p>You've been invited to join <strong>${bandResult.rows[0].name}</strong> as a ${role}.</p>
                <p>
                  <a href="${acceptLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
                  &nbsp;
                  <a href="${rejectLink}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Decline</a>
                </p>
                <p>This invitation expires in 7 days.</p>
              `
            });
          } catch (emailError) {
            console.error('Email send error:', emailError);
          }
        }
        return res.status(201).json({
          id: invId,
          bandId,
          email,
          role,
          status: 'pending',
          createdAt: now,
          expiresAt
        });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
      console.error('Invitations handler error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
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
      // Permission constants
      const { BAND_CREATE } = PERMISSIONS;
      const userRole = req.user?.role;
      if (!hasPermission(userRole, BAND_CREATE)) {
        return res.status(403).json({ error: 'You do not have permission to create bands' });
      }
      const body = await readJson(req);
      function sanitize(str, maxLen = 100) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>"'`]/g, '').slice(0, maxLen);
      }
      const name = sanitize(body.name, 100);
      if (!name || name.length < 1) {
        return res.status(400).json({ error: 'Band name is required' });
      }
      const description = sanitize(body.description || '', 300);
      const genre = sanitize(body.genre || '', 50);
      const bandId = `band_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      await client.execute(
        'INSERT INTO bands (id, name, description, genre, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [bandId, name, description || null, genre || null, userId, now]
      );
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
