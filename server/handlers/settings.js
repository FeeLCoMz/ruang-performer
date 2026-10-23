/**
 * settings.js
 *
 * GET  /api/settings           — pengaturan aplikasi global (semua user login)
 * PUT  /api/settings/:key      — simpan pengaturan (owner/admin saja)
 * DELETE /api/settings/:key    — hapus pengaturan, kembali ke bawaan
 *
 * Nilai disimpan sebagai JSON di tabel app_settings (server/_appSettings.js),
 * sehingga berlaku untuk SEMUA user di SEMUA perangkat — bukan hanya browser
 * tempat admin mengubahnya.
 *
 * Saat ini satu-satunya key adalah `chordDisplayTags`
 * (lihat src/utils/chord/chordDisplayTags.js):
 *   { sections: string[], modulation: string[], metadata: string[],
 *     performance: string[], cueMarks: string[], instruments: string[],
 *     noChord: string[], midiKeys: string[] }
 */
import { getTursoClient } from '../_turso.js';
import { verifyToken } from '../_auth.js';
import { writeAuditLog, getRequestMeta } from '../_audit.js';
import { deleteSetting, readSetting, writeSetting } from '../_appSettings.js';

export const CHORD_DISPLAY_TAGS_KEY = 'chordDisplayTags';
export const SETTINGS_KEYS = [CHORD_DISPLAY_TAGS_KEY];

const ADMIN_ROLES = ['owner', 'admin'];

/** Key pengaturan dari URL: /api/settings/:key (catch-all tak mengisi req.params). */
const settingKeyFromRequest = (req = {}) => {
  if (req.query?.key) return String(req.query.key).trim();
  if (req.params?.key) return String(req.params.key).trim();
  const segments = Array.isArray(req.__segments) ? req.__segments : [];
  const index = segments.indexOf('settings');
  return index >= 0 ? String(segments[index + 1] || '').trim() : '';
};

const isAdmin = (user) => Boolean(user && ADMIN_ROLES.includes(user.role));

/** Validasi isi pengaturan. Daftar keyword dibatasi bentuk aman untuk regex. */
function validateChordDisplayTags(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Format pengaturan harus berupa objek per grup' };
  }

  const cleaned = {};
  for (const [groupId, list] of Object.entries(value)) {
    if (!Array.isArray(list)) {
      return { ok: false, error: `Grup "${groupId}" harus berupa daftar keyword` };
    }
    if (list.length > 500) {
      return { ok: false, error: `Grup "${groupId}" berisi lebih dari 500 keyword` };
    }
    const keywords = [];
    for (const raw of list) {
      if (typeof raw !== 'string') {
        return { ok: false, error: `Grup "${groupId}" berisi nilai yang bukan teks` };
      }
      const keyword = raw.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!keyword) continue;
      if (keyword.length > 40) {
        return { ok: false, error: `Keyword "${keyword}" lebih dari 40 karakter` };
      }
      if (!/^[a-z0-9][a-z0-9 ._'-/]*$/.test(keyword)) {
        return { ok: false, error: `Keyword "${keyword}" mengandung karakter yang tidak diizinkan` };
      }
      keywords.push(keyword);
    }
    cleaned[groupId] = [...new Set(keywords)];
  }

  return { ok: true, value: cleaned };
}

const VALIDATORS = {
  [CHORD_DISPLAY_TAGS_KEY]: validateChordDisplayTags,
};

export default async function handler(req, res) {
  if (!verifyToken(req, res)) return;
  const client = getTursoClient();

  // ---- Baca (semua user login): aplikasi perlu daftar tag saat memuat lirik
  if (req.method === 'GET') {
    const key = settingKeyFromRequest(req);
    const keys = key ? [key] : SETTINGS_KEYS;

    const settings = {};
    for (const current of keys) {
      // eslint-disable-next-line no-await-in-loop
      settings[current] = await readSetting(client, current, { fallback: null });
    }

    return res.status(200).json({ settings });
  }

  // ---- Tulis / hapus: hanya administrator aplikasi
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Hanya administrator yang dapat mengubah pengaturan global' });
  }

  const key = settingKeyFromRequest(req);
  if (!key) return res.status(400).json({ error: 'Key pengaturan wajib diisi' });
  const validator = VALIDATORS[key];
  if (!validator) return res.status(400).json({ error: `Pengaturan "${key}" tidak dikenal` });

  const actorId = req.user?.userId || req.user?.id || req.user?.email || null;
  const meta = getRequestMeta(req);

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const result = validator(req.body);
    if (!result.ok) return res.status(400).json({ error: result.error });

    try {
      await writeSetting(client, key, result.value, { updatedBy: actorId });
    } catch (error) {
      console.error(`Simpan pengaturan "${key}" gagal:`, error);
      return res.status(500).json({ error: 'Gagal menyimpan pengaturan global', message: error?.message });
    }

    await writeAuditLog(client, {
      action: 'SETTINGS_UPDATED',
      userId: actorId,
      resourceType: 'app_settings',
      resourceId: key,
      description: `Pengaturan global "${key}" diperbarui`,
      changes: {
        groups: Object.fromEntries(
          Object.entries(result.value).map(([groupId, list]) => [groupId, list.length]),
        ),
      },
      ...meta,
    });

    return res.status(200).json({ setting: { key, value: result.value }, saved: true });
  }

  if (req.method === 'DELETE') {
    try {
      await deleteSetting(client, key);
    } catch (error) {
      console.error(`Hapus pengaturan "${key}" gagal:`, error);
      return res.status(500).json({ error: 'Gagal menghapus pengaturan global', message: error?.message });
    }

    await writeAuditLog(client, {
      action: 'SETTINGS_RESET',
      userId: actorId,
      resourceType: 'app_settings',
      resourceId: key,
      description: `Pengaturan global "${key}" dikembalikan ke bawaan`,
      ...meta,
    });

    return res.status(200).json({ deleted: true, key });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
