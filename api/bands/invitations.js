import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import nodemailer from 'nodemailer';
import { createRateLimiter, RATE_LIMITS } from '../middleware/rateLimiter.js';

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

// Configure email (update these for your email service)
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
export default async function handler(req, res) {
  await rateLimiter(req, res, () => {});
  try {
    // Verify JWT token first
    if (!verifyToken(req, res)) {
      return;
    }

    const client = getTursoClient();
    const userId = req.user?.userId;
    const bandId = req.params?.id || req.url?.split('/').pop();

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create tables if not exist
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
    } catch (e) {
      // Table may already exist
    }

    // GET - Fetch invitations for a band
    if (req.method === 'GET') {
      // Check if user is band owner/admin
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

    // POST - Send invitation
    if (req.method === 'POST') {
      const body = await readJson(req);
      const { email, role = 'member' } = body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if user is band owner
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

      // Check if user already a member
      const existingMember = await client.execute(`
        SELECT id FROM band_members
        WHERE bandId = ? AND userId IN (
          SELECT id FROM users WHERE LOWER(email) = LOWER(?)
        )
      `, [bandId, email]);

      if (existingMember.rows && existingMember.rows.length > 0) {
        return res.status(409).json({ error: 'User already a band member' });
      }

      // Check if invitation already exists
      const existingInv = await client.execute(
        'SELECT id, status FROM band_invitations WHERE bandId = ? AND LOWER(email) = LOWER(?)',
        [bandId, email]
      );

      if (existingInv.rows && existingInv.rows.length > 0) {
        if (existingInv.rows[0].status === 'pending') {
          return res.status(409).json({ error: 'Invitation already sent to this email' });
        }
      }

      // Create invitation
      const invId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      await client.execute(`
        INSERT INTO band_invitations (id, bandId, email, role, invitedBy, status, createdAt, expiresAt)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `, [invId, bandId, email, role, userId, now, expiresAt]);

      // Send email invitation (if configured)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        const acceptLink = `${process.env.APP_URL || 'http://localhost:5173'}/invitations/${invId}/accept`;
        const rejectLink = `${process.env.APP_URL || 'http://localhost:5173'}/invitations/${invId}/reject`;

        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: `Join ${bandResult.rows[0].name} on PerformerHub`,
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
          // Continue even if email fails
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

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Invitations handler error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
