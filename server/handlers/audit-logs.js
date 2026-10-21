/**
 * audit-logs.js
 *
 * Daftar audit log seluruh user — khusus Owner.
 *
 * GET /api/audit-logs?limit=200
 *
 * Menggabungkan tabel audit_logs dengan username pemiliknya (kolom opsional,
 * aman bila skema lama tidak punya). Bila tabel belum ada, mengembalikan
 * daftar kosong agar halaman modul tetap bisa tampil.
 */
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { ensureAuditLogTable } from '../_audit.js';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya administrator yang dapat mengakses audit log' });
  }

  const requested = parseInt(req.query?.limit, 10);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const client = getTursoClient();

  try {
    // Database lama belum punya tabel audit_logs → buat sebelum dibaca.
    await ensureAuditLogTable(client);

    const result = await client.execute({
      sql: `
        SELECT
          al.id, al.userId, al.action, al.category, al.severity, al.status,
          al.bandId, al.description, al.details, al.ipAddress, al.userAgent,
          al.changes, al.createdAt, u.username
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.userId
        ORDER BY al.createdAt DESC
        LIMIT ?
      `,
      args: [limit],
    });

    return res.status(200).json({ success: true, logs: result.rows });
  } catch (error) {
    // Tabel belum dibuat / kolom belum dimigrasi: halaman tetap tampil kosong.
    console.error('Get audit logs error:', error);
    const message = String(error?.message || '');
    if (/no such table|no such column/i.test(message)) {
      return res.status(200).json({ success: true, logs: [], warning: message });
    }
    return res.status(500).json({ error: message || 'Gagal mengambil audit log' });
  }
}
