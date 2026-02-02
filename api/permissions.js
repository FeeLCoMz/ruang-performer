import { hasPermission } from '../../../src/utils/permissionUtils.js';
import { getTursoClient } from './\_turso.js';

/**
 * Middleware to check if user has permission for a band action
 * @param {string} permission - Permission to check
 * @returns {function} Express middleware
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const bandId = req.params?.id || req.params?.bandId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!bandId) {
        return res.status(400).json({ error: 'Band ID required' });
      }

      const client = getTursoClient();

      // Get user's role in the band
      const result = await client.execute(
        'SELECT role FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, userId]
      );

      // Also check if user is band owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      const isOwner = bandResult.rows[0].createdBy === userId;
      const userRole = isOwner ? 'owner' : (result.rows?.[0]?.role || null);

      if (!userRole) {
        return res.status(403).json({ error: 'You are not a member of this band' });
      }

      // Check permission
      if (!hasPermission(userRole, permission)) {
        return res.status(403).json({ 
          error: `You don't have permission: ${permission}`,
          requiredPermission: permission,
          userRole
        });
      }

      // Attach user info to request
      req.userRole = userRole;
      req.isOwner = isOwner;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Failed to check permissions' });
    }
  };
}

/**
 * Middleware to check if user is band owner
 * @returns {function} Express middleware
 */
export function requireOwner() {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const bandId = req.params?.id || req.params?.bandId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!bandId) {
        return res.status(400).json({ error: 'Band ID required' });
      }

      const client = getTursoClient();

      // Check if user is band owner
      const result = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      if (result.rows[0].createdBy !== userId) {
        return res.status(403).json({ error: 'Only band owner can perform this action' });
      }

      req.isOwner = true;
      next();
    } catch (error) {
      console.error('Owner check error:', error);
      res.status(500).json({ error: 'Failed to check owner status' });
    }
  };
}

/**
 * Middleware to check if user is band owner or admin
 * @returns {function} Express middleware
 */
export function requireAdmin() {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const bandId = req.params?.id || req.params?.bandId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!bandId) {
        return res.status(400).json({ error: 'Band ID required' });
      }

      const client = getTursoClient();

      // Check if user is owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (!bandResult.rows || bandResult.rows.length === 0) {
        return res.status(404).json({ error: 'Band not found' });
      }

      const isOwner = bandResult.rows[0].createdBy === userId;

      if (isOwner) {
        req.isOwner = true;
        req.userRole = 'owner';
        return next();
      }

      // Check if user is admin
      const memberResult = await client.execute(
        'SELECT role FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, userId]
      );

      if (!memberResult.rows || memberResult.rows.length === 0) {
        return res.status(403).json({ error: 'You are not a member of this band' });
      }

      if (memberResult.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Only admin or owner can perform this action' });
      }

      req.isAdmin = true;
      req.userRole = 'admin';
      next();
    } catch (error) {
      console.error('Admin check error:', error);
      res.status(500).json({ error: 'Failed to check admin status' });
    }
  };
}

/**
 * Middleware to load user's role for current band
 * @returns {function} Express middleware
 */
export function loadUserRole() {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const bandId = req.params?.id || req.params?.bandId;

      if (!userId || !bandId) {
        return next();
      }

      const client = getTursoClient();

      // Get band owner
      const bandResult = await client.execute(
        'SELECT createdBy FROM bands WHERE id = ?',
        [bandId]
      );

      if (bandResult.rows && bandResult.rows.length > 0) {
        if (bandResult.rows[0].createdBy === userId) {
          req.userRole = 'owner';
          req.isOwner = true;
          return next();
        }
      }

      // Get member role
      const memberResult = await client.execute(
        'SELECT role FROM band_members WHERE bandId = ? AND userId = ?',
        [bandId, userId]
      );

      if (memberResult.rows && memberResult.rows.length > 0) {
        req.userRole = memberResult.rows[0].role;
      }

      next();
    } catch (error) {
      console.error('Load user role error:', error);
      next();
    }
  };
}
