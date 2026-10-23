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

/**
 * Id grup tag yang dikenal server. Daftar ini SENGAJA diduplikasi dari
 * src/config/chordDisplayTagGroups.js (bukan diimpor) dengan alasan yang sama
 * seperti server/_audit.js: bundle serverless tidak boleh bergantung pada src/.
 * `getGroupKeywordConflicts` memakai daftar ini untuk membedakan "grup ini baru
 * untuk server lama" dari "grup ini baru untuk admin yang masih pakai bundle
 * lama" — keduanya tidak boleh menolak penyimpanan.
 */
export const KNOWN_TAG_GROUP_IDS = ['sections', 'metadata', 'instruments', 'noChord', 'midiKeys', 'sectionAliases'];

/** Grup yang nilainya objek alias→kanonik, bukan daftar keyword. */
export const ALIAS_MAP_GROUP_IDS = ['sectionAliases'];

/** Aksi audit khusus perubahan tag (lihat server/_audit.js & auditLogger.js). */
export const TAG_AUDIT_ACTIONS = {
  save: 'TAG_DETECTION_UPDATED',
  resetOne: 'TAG_DETECTION_GROUP_RESET',
  resetAll: 'TAG_DETECTION_RESET',
};

/** Key pengaturan dari URL: /api/settings/:key (catch-all tak mengisi req.params). */
const settingKeyFromRequest = (req = {}) => {
  if (req.query?.key) return String(req.query.key).trim();
  if (req.params?.key) return String(req.params.key).trim();
  const segments = Array.isArray(req.__segments) ? req.__segments : [];
  const index = segments.indexOf('settings');
  return index >= 0 ? String(segments[index + 1] || '').trim() : '';
};

const isAdmin = (user) => Boolean(user && ADMIN_ROLES.includes(user.role));

/**
 * Keyword yang terdaftar di lebih dari satu grup.
 *
 * Urutan grup menentukan hasil deteksi (grup yang dicek lebih dulu menang),
 * jadi keyword ganda adalah sumber bug yang sulit terlihat: admin menambah
 * `keys` ke instrumen padahal MIDI juga memakainya. Server memberi peringatan
 * (tidak menolak) karena konflik hanya bisa diputuskan oleh admin.
 *
 * @returns {{keyword: string, groups: string[]}[]}
 */
export function getKeywordConflicts(groups) {
  const owners = new Map();
  for (const [groupId, list] of Object.entries(groups || {})) {
    // Grup aliasMap bukan daftar keyword: melewatinya mencegah konflik palsu
    // seperti "opening" dianggap bentrok karena nilai kanoniknya.
    if (Array.isArray(list)) {
      for (const keyword of list) {
        const key = String(keyword || '').trim().toLowerCase();
        if (!key) continue;
        if (!owners.has(key)) owners.set(key, []);
        const ids = owners.get(key);
        if (!ids.includes(groupId)) ids.push(groupId);
      }
    }
  }
  return [...owners.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([keyword, ids]) => ({ keyword, groups: ids }));
}

/**
 * Selisih antara daftar lama dan baru satu grup, untuk audit log.
 * Disimpan per-aksi (bukan seluruh daftar) karena audit log adalah riwayat —
 * menyimpan 100 keyword penuh membuat drawer detail sulit dibaca.
 * Dibatasi 40 entri agar satu baris audit tidak membengkak.
 */
export function diffKeywordLists(previous, next) {
  const before = Array.isArray(previous) ? previous : [];
  const after = Array.isArray(next) ? next : [];
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((keyword) => !beforeSet.has(keyword));
  const removed = before.filter((keyword) => !afterSet.has(keyword));
  const LIMIT = 40;
  return {
    before: before.length,
    after: after.length,
    added: added.slice(0, LIMIT),
    removed: removed.slice(0, LIMIT),
    addedCount: added.length,
    removedCount: removed.length,
    truncated: added.length > LIMIT || removed.length > LIMIT,
  };
}

/**
 * Ringkasan perubahan seluruh grup untuk deskripsi audit log.
 * @returns {{groupId: string, diff: object}[]}
 */
export function diffTagGroups(previous, next) {
  const keys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);
  const changes = [];
  for (const groupId of keys) {
    const diff = diffKeywordLists(previous?.[groupId], next?.[groupId]);
    if (diff.addedCount || diff.removedCount) changes.push({ groupId, diff });
  }
  return changes;
}

/** "3 grup: sections (+2/-1), instruments (+0/-4)" — ringkas untuk tabel audit. */
export function describeTagChanges(changes) {
  if (!Array.isArray(changes) || !changes.length) return 'tanpa perubahan kata kunci';
  return changes
    .map(({ groupId, diff }) => `${groupId} (+${diff.addedCount}/-${diff.removedCount})`)
    .join(', ');
}

/** Validasi isi pengaturan. Daftar keyword dibatasi bentuk aman untuk regex. */
function validateChordDisplayTags(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Format pengaturan harus berupa objek per grup' };
  }

  const cleaned = {};
  for (const [groupId, list] of Object.entries(value)) {
    if (ALIAS_MAP_GROUP_IDS.includes(groupId)) {
      if (!list || typeof list !== 'object' || Array.isArray(list)) {
        return { ok: false, error: `Grup "${groupId}" harus berupa objek alias=seksi` };
      }
      const aliases = {};
      for (const [rawAlias, rawCanonical] of Object.entries(list)) {
        const alias = String(rawAlias).trim().toLowerCase().split(' ').filter(Boolean).join(' ');
        const canonical = String(rawCanonical || '').trim().toLowerCase().split(' ').filter(Boolean).join(' ');
        if (!alias || !canonical) continue;
        if (!/^[a-z0-9][a-z0-9 ._'-/]*$/.test(alias) || !/^[a-z0-9][a-z0-9 ._'-/]*$/.test(canonical)) {
          return { ok: false, error: `Alias "${alias}" mengandung karakter yang tidak diizinkan` };
        }
        if (alias === canonical) continue;
        aliases[alias] = canonical;
      }
      if (Object.keys(aliases).length) cleaned[groupId] = aliases;
      continue;
    }

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
    // PATCH dengan body { resetGroup } = kembalikan SATU grup ke bawaan tanpa
    // menyentuh grup lain. Tanpa cabang ini, "Reset ke bawaan" di satu kartu
    // akan menghapus pengaturan seluruh grup (semua grup kembali ke bawaan).
    const resetGroupId = req.body && typeof req.body === 'object' ? req.body.resetGroup : undefined;
    if (resetGroupId !== undefined) {
      if (key !== CHORD_DISPLAY_TAGS_KEY) {
        return res.status(400).json({ error: 'Reset per grup hanya tersedia untuk pengaturan tag' });
      }
      const groupId = String(resetGroupId || '').trim();
      if (!groupId) return res.status(400).json({ error: 'Grup yang akan direset wajib diisi' });
      if (!KNOWN_TAG_GROUP_IDS.includes(groupId)) {
        return res.status(400).json({ error: `Grup tag "${groupId}" tidak dikenal` });
      }

      const stored = (await readSetting(client, key, { fallback: null })) || {};
      if (!stored[groupId]) {
        // Grup itu memang memakai bawaan: tidak ada yang perlu diubah, dan
        // riwayat tidak perlu dipenuhi entri "reset" kosong.
        return res.status(200).json({
          setting: { key, value: stored },
          resetGroup: groupId,
          unchanged: true,
        });
      }

      const removedList = stored[groupId];
      const next = { ...stored };
      delete next[groupId];

      try {
        // Tidak ada grup yang diatur lagi → baris pengaturan dihapus, sama
        // seperti perilaku klien (resetAllTagGroups).
        if (!Object.keys(next).length) {
          await deleteSetting(client, key);
        } else {
          await writeSetting(client, key, next, { updatedBy: actorId });
        }
      } catch (error) {
        console.error(`Reset grup tag "${groupId}" gagal:`, error);
        return res.status(500).json({ error: 'Gagal mereset grup tag', message: error?.message });
      }

      // Yang dicatat adalah daftar yang DIHAPUS (nilai yang sebelumnya diatur
      // admin). Daftar bawaan tidak disimpan server, jadi tidak bisa dibandingkan
      // di sini — klien sudah tahu bawaannya dan hanya butuh jejak perubahan.
      await writeAuditLog(client, {
        action: TAG_AUDIT_ACTIONS.resetOne,
        userId: actorId,
        resourceType: 'app_settings',
        resourceId: key,
        description: `Tag deteksi ChordDisplay: grup "${groupId}" dikembalikan ke bawaan (${removedList.length} kata kunci dihapus)`,
        changes: {
          groupId,
          tagGroups: [{
            groupId,
            diff: { removed: removedList.slice(0, 40), removedCount: removedList.length },
          }],
        },
        ...meta,
      });

      return res.status(200).json({
        setting: { key, value: next },
        resetGroup: groupId,
        removed: removedList,
      });
    }

    const result = validator(req.body);
    if (!result.ok) return res.status(400).json({ error: result.error });

    // Dibaca SEBELUM menyimpan: audit log butuh daftar lama untuk membuat diff.
    const previous = (await readSetting(client, key, { fallback: null })) || {};

    try {
      await writeSetting(client, key, result.value, { updatedBy: actorId });
    } catch (error) {
      console.error(`Simpan pengaturan "${key}" gagal:`, error);
      return res.status(500).json({ error: 'Gagal menyimpan pengaturan global', message: error?.message });
    }

    const conflicts = getKeywordConflicts(result.value);
    const changesForAudit = key === CHORD_DISPLAY_TAGS_KEY
      ? diffTagGroups(previous, result.value)
      : [];

    // Aksi khusus tag membuat riwayat tag bisa difilter di modul Audit Log;
    // key lain tetap memakai aksi umum SETTINGS_UPDATED.
    const isTags = key === CHORD_DISPLAY_TAGS_KEY;
    await writeAuditLog(client, {
      action: isTags ? TAG_AUDIT_ACTIONS.save : 'SETTINGS_UPDATED',
      userId: actorId,
      resourceType: 'app_settings',
      resourceId: key,
      description: isTags
        ? `Tag deteksi ChordDisplay diubah: ${describeTagChanges(changesForAudit)}`
        : `Pengaturan global "${key}" diperbarui`,
      changes: {
        groups: Object.fromEntries(
          Object.entries(result.value).map(([groupId, list]) => [groupId, list.length]),
        ),
        // Diff per grup: ingin, dihapus, serta konflik antar grup.
        tagGroups: changesForAudit,
        conflicts,
      },
      ...meta,
    });

    return res.status(200).json({
      setting: { key, value: result.value },
      saved: true,
      // Peringatan (bukan penolakan): admin tetap boleh menyimpan daftar yang
      // konflik, lalu memutuskan sendiri grup mana yang benar.
      warnings: conflicts.length
        ? [{
          type: 'keyword-conflict',
          message: `${conflicts.length} kata kunci terdaftar di lebih dari satu grup`,
          conflicts,
        }]
        : [],
    });
  }

  if (req.method === 'DELETE') {
    try {
      await deleteSetting(client, key);
    } catch (error) {
      console.error(`Hapus pengaturan "${key}" gagal:`, error);
      return res.status(500).json({ error: 'Gagal menghapus pengaturan global', message: error?.message });
    }

    await writeAuditLog(client, {
      action: key === CHORD_DISPLAY_TAGS_KEY ? TAG_AUDIT_ACTIONS.resetAll : 'SETTINGS_RESET',
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
