/**
 * Stub `server/_auth.js` untuk check-setlist-write-batch.mjs: token dianggap
 * valid dan user diambil dari header palsu.
 */
export function verifyToken(req) {
  req.user = req.user || { userId: 'user-1' };
  return true;
}
