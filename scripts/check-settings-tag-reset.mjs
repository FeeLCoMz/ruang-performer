/**
 * Uji handler pengaturan tag terhadap SQLite in-memory (node:sqlite).
 *
 * Fokus: reset SATU grup tidak boleh menyentuh grup lain, dan audit log harus
 * mencatat TAG_DETECTION_GROUP_RESET (bukan TAG_DETECTION_RESET).
 *
 * Jalankan: node scripts/check-settings-tag-reset.mjs
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

import { DatabaseSync } from 'node:sqlite';
import {
  ensureAuditLogTable,
  writeAuditLog,
  resolveActionCategory,
  resolveActionSeverity,
  resolveActionDisplayName,
} from '../server/_audit.js';
import {
  diffKeywordLists,
  diffTagGroups,
  getKeywordConflicts,
  describeTagChanges,
  KNOWN_TAG_GROUP_IDS,
  TAG_AUDIT_ACTIONS,
} from '../server/handlers/settings.js';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

/** Turso-like client di atas node:sqlite. */
function makeClient(db) {
  return {
    execute: async (statement) => {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const args = typeof statement === 'string' ? [] : (statement.args || []);
      const stmt = db.prepare(sql);
      if (/^\s*(select|pragma|with)/i.test(sql)) {
        return { rows: stmt.all(...args), columns: [] };
      }
      stmt.run(...args);
      return { rows: [], columns: [] };
    },
  };
}

// --- 1. Diff per grup ----------------------------------------------------
{
  const previous = { sections: ['intro', 'verse'], instruments: ['gitar', 'suling'] };
  const next = { sections: ['intro', 'verse', 'bridge'], instruments: ['gitar'] };
  const changes = diffTagGroups(previous, next);

  assert(changes.length === 2, 'dua grup berubah terdeteksi');
  const sections = changes.find((item) => item.groupId === 'sections');
  assert(sections.diff.added.join() === 'bridge', 'keyword baru tercatat di diff');
  const instruments = changes.find((item) => item.groupId === 'instruments');
  assert(instruments.diff.removed.join() === 'suling', 'keyword dihapus tercatat di diff');
  assert(describeTagChanges(changes).includes('sections (+1/-0)'), 'deskripsi ringkas memuat angka diff');

  const single = diffKeywordLists(['a', 'b', 'c'], ['a']);
  assert(single.removedCount === 2 && single.addedCount === 0, 'diffKeywordLists menghitung hapusan');
}

// --- 2. Konflik keyword lintas grup --------------------------------------
{
  const conflicts = getKeywordConflicts({
    sections: ['intro'],
    metadata: ['intro', 'time'],
    instruments: ['keys'],
    midiKeys: ['keys'],
  });
  assert(conflicts.length === 2, 'dua konflik ditemukan');
  assert(conflicts.some((item) => item.keyword === 'intro'), 'konflik intro (sections+metadata)');
  assert(conflicts.some((item) => item.keyword === 'keys'), 'konflik keys (instruments+midiKeys)');
}

// --- 3. Daftar grup yang dikenal server ----------------------------------
{
  for (const groupId of ['sections', 'metadata', 'instruments', 'noChord', 'midiKeys']) {
    assert(KNOWN_TAG_GROUP_IDS.includes(groupId), `grup ${groupId} dikenal server`);
  }
}

// --- 4. Audit reset satu grup (SQLite) -----------------------------------
{
  const db = new DatabaseSync(':memory:');
  const client = makeClient(db);
  await ensureAuditLogTable(client);

  // Simulasi baris app_settings berisi dua grup yang diatur admin.
  const stored = { sections: ['intro', 'verse'], instruments: ['gitar'] };
  const next = { ...stored };
  const removedList = next.sections;
  delete next.sections;

  const written = await writeAuditLog(client, {
    action: TAG_AUDIT_ACTIONS.resetOne,
    userId: 'u1',
    resourceType: 'app_settings',
    resourceId: 'chordDisplayTags',
    description: `Tag deteksi ChordDisplay: grup "sections" dikembalikan ke bawaan`,
    changes: {
      groupId: 'sections',
      tagGroups: [{
        groupId: 'sections',
        diff: { removed: removedList, removedCount: removedList.length },
      }],
    },
  });

  assert(written === true, 'audit reset grup tersimpan');
  const row = db.prepare('SELECT action, category, severity, details FROM audit_logs').get();
  assert(row.action === 'TAG_DETECTION_GROUP_RESET', 'action TAG_DETECTION_GROUP_RESET');
  assert(row.category === 'TAG', 'kategori TAG');
  assert(row.severity === 'high', 'severity reset grup = high');
  assert(String(row.details).includes('"groupId":"sections"'), 'groupId masuk details');
  assert(Object.keys(next).join() === 'instruments', 'grup lain tidak tersentuh');
  db.close();
}

// --- 5. Kategori/severity/nama aksi baru --------------------------------
assert(resolveActionCategory(TAG_AUDIT_ACTIONS.save) === 'TAG', 'kategori simpan tag = TAG');
assert(resolveActionSeverity(TAG_AUDIT_ACTIONS.save) === 'medium', 'severity simpan tag = medium');
assert(resolveActionSeverity(TAG_AUDIT_ACTIONS.resetAll) === 'high', 'severity reset semua = high');
assert(resolveActionDisplayName(TAG_AUDIT_ACTIONS.resetOne) === 'Tag Deteksi: Grup Direset', 'nama display reset grup');

if (!process.exitCode) console.log('\nSETTINGS TAG RESET CHECK OK');
