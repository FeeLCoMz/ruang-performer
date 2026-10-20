/**
 * Songs API — Vercel entry point.
 *
 * Vercel Hobby hanya mengizinkan 12 Serverless Functions per deployment, jadi
 * endpoint bulk TIDAK boleh berupa file function sendiri (api/songs/bulk.js).
 * Router internal `api/songs/index.js` sudah menangani segmen "bulk", dan
 * file ini menjadi satu-satunya function untuk seluruh /api/songs/*.
 */
import songsHandler from './index.js';

export default songsHandler;
