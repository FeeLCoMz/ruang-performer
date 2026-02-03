/**
 * Consolidated songs handler
 * Handles: GET/POST /api/songs, GET/PUT/DELETE /api/songs/:id
 */

import songsIndexHandler from './songs/index.js';
import songsIdHandler from './songs/[id].js';

export default async function consolidatedSongsHandler(req, res) {
  const pathParts = req.url.split('/').filter(Boolean);
  const songId = pathParts[2]; // api/songs/:id

  if (songId) {
    // Route to [id].js handler
    return songsIdHandler(req, res);
  } else {
    // Route to index.js handler
    return songsIndexHandler(req, res);
  }
}
