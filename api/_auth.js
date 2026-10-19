import jwt from 'jsonwebtoken';
import { getReqEnv, isTestEnv } from './_core/env.js';

const DEFAULT_SECRET = 'your-secret-key-change-in-production';

// Read per request: Cloudflare bindings only exist inside the request scope.
function getSecret(req) {
  return getReqEnv(req, 'JWT_SECRET') || DEFAULT_SECRET;
}

/**
 * Verify JWT token from request headers
 * Sets req.user with decoded token data
 * @param {object} req - Node/Vercel request object
 * @param {object} res - Node/Vercel response object
 * @returns {boolean} - true if valid, false if invalid
 */
export function verifyToken(req, res) {
  // Bypass JWT auth in test environment
  if (isTestEnv(req)) {
    req.user = { id: 'test-user', userId: 'test-user', email: 'test@example.com', role: 'owner' };
    return true;
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'No authorization token provided' });
    return false;
  }

  try {
    const decoded = jwt.verify(token, getSecret(req));
    req.user = decoded;
    return true;
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return false;
  }
}
