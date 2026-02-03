/**
 * Consolidated Resources Router
 * Handles practice sessions and gigs to reduce function count
 */

import practiceIndexHandler from './practice/index.js';
import practiceIdHandler from './practice/[id].js';
import gigsIndexHandler from './gigs/index.js';
import gigsIdHandler from './gigs/[id].js';

export default async function handler(req, res) {
  // When using app.use(), req.baseUrl is the mount point and req.path is relative
  // For /api/practice -> baseUrl='/api/practice', path='/'
  // For /api/practice/123 -> baseUrl='/api/practice', path='/123'
  
  const baseUrl = req.baseUrl || '';
  const path = req.path || '/';
  
  let resource, id;
  
  if (baseUrl.includes('/practice')) {
    resource = 'practice';
    // Extract ID from path if present (path would be /123 or just /)
    if (path !== '/' && path) {
      id = path.replace(/^\//, '');
    }
  } else if (baseUrl.includes('/gigs')) {
    resource = 'gigs';
    // Extract ID from path if present
    if (path !== '/' && path) {
      id = path.replace(/^\//, '');
    }
  } else {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  // Route to appropriate handler
  if (resource === 'practice') {
    if (id) {
      req.params.id = id;
      return practiceIdHandler(req, res);
    } else {
      return practiceIndexHandler(req, res);
    }
  }
  
  if (resource === 'gigs') {
    if (id) {
      req.params.id = id;
      return gigsIdHandler(req, res);
    } else {
      return gigsIndexHandler(req, res);
    }
  }
  
  res.status(404).json({ error: 'Resource not found' });
}
