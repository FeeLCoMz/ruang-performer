import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getTursoClient } from '../_turso.js';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/**
 * POST /api/auth/forgot-password
 * Request password reset token via email
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const client = getTursoClient();

    // Find user by email
    const userResult = await client.execute(
      'SELECT id, username FROM users WHERE email = ?',
      [email]
    );

    // Always return success message (security: don't reveal if email exists)
    if (!userResult.rows || userResult.rows.length === 0) {
      // Log attempt but don't reveal account doesn't exist
      return res.status(200).json({
        message: 'If an account exists with this email, a reset link has been sent'
      });
    }

    const userId = userResult.rows[0].id;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store token in database
    await client.execute(
      `INSERT INTO password_reset_tokens 
       (userId, tokenHash, expiresAt, createdAt) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, tokenHash, expiresAt.toISOString()]
    );

    // Send email with reset link
    const resetLink = `${APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: SMTP_USER,
        to: email,
        subject: 'PerformerHub - Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Password Reset Request</h2>
            <p>Hi ${userResult.rows[0].username},</p>
            <p>We received a request to reset your password. Click the link below to create a new password:</p>
            <p style="margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p>Or copy and paste this link:</p>
            <p style="word-break: break-all; color: #666;">${resetLink}</p>
            <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
            <p style="color: #999; font-size: 12px;">
              If you didn't request this reset, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `
          Password Reset Request

          Hi ${userResult.rows[0].username},

          Click the link below to reset your password:
          ${resetLink}

          This link expires in 1 hour.

          If you didn't request this reset, you can safely ignore this email.
        `
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    return res.status(200).json({
      message: 'If an account exists with this email, a reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
}
