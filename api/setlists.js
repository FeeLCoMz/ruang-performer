/**
 * Consolidated setlists handler
 * Handles: GET/POST /api/setlists, GET/PUT/DELETE /api/setlists/:id
 */

import setlistsIndexHandler from './setlists/index.js';
import setlistsIdHandler from './setlists/[id].js';

export default async function consolidatedSetlistsHandler(req, res) {
  const pathParts = req.url.split('/').filter(Boolean);
  const setlistId = pathParts[2]; // api/setlists/:id

  if (setlistId) {
    // Route to [id].js handler
    return setlistsIdHandler(req, res);
  } else {
    // Route to index.js handler
    return setlistsIndexHandler(req, res);
  }
}
