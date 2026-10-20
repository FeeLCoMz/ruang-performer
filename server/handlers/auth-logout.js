/**
 * auth-logout.js
 *
 * POST /api/auth/logout — catat USER_LOGOUT lalu selesai.
 *
 * JWT bersifat stateless: tidak ada sesi yang perlu dicabut di server. Endpoint
 * ini ada supaya logout tercatat di audit_logs (modul Audit Log). Token tetap
 * dibuang di sisi klien setelah respons ini.
 *
 * Bersifat best-effort di sisi klien: kegagalan endpoint tidak boleh menahan
 * user di aplikasi, jadi frontend tidak menunggu terlalu lama.
 */
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { writeAuditLog, getRequestMeta } from '../_audit.js';

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user?.userId || req.user?.id;
  const { ipAddress, userAgent } = getRequestMeta(req);

  try {
    const client = getTursoClient();
    await writeAuditLog(client, {
      action: 'USER_LOGOUT',
      userId,
      description: 'Logout',
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Tanpa kredensial DB pun logout di klien tetap harus berhasil.
    console.warn('Logout audit skipped:', error?.message || error);
  }

  return res.status(200).json({ success: true });
}
