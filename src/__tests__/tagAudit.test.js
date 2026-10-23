import { describe, test, expect } from 'vitest';
import {
  diffKeywordLists,
  diffGroupDraft,
  hasDiff,
  describeDiff,
  findKeywordConflicts,
  findGroupConflicts,
  keywordsFromDraft,
  findNewConflicts,
  addKeywordToDraft,
  removeKeywordFromDraft,
} from '../pages/admin/tag-detection/tagAudit.js';
import { parseKeywordList, getTagGroups } from '../config/chordDisplayTagGroups.js';
import {
  getActionCategory,
  getActionSeverity,
  formatActionName,
  AUDIT_ACTIONS,
} from '../utils/auditLogger.js';

/**
 * Helper audit & konflik untuk tab "Tag & Deteksi".
 * Fungsi-fungsi ini murni (tanpa React / jaringan), sehingga logika
 * "apa yang berubah" dan "kata kunci mana yang bentrok" bisa diuji terpisah
 * dari panel admin.
 */
describe('tag detection audit helpers', () => {
  test('diffKeywordLists mencatat penambahan dan penghapusan', () => {
    const diff = diffKeywordLists(['intro', 'verse', 'chorus'], ['intro', 'chorus', 'bridge']);

    expect(diff.added).toEqual(['bridge']);
    expect(diff.removed).toEqual(['verse']);
    expect(diff).toMatchObject({ addedCount: 1, removedCount: 1 });
  });

  test('diffKeywordLists menormalkan huruf & duplikat', () => {
    const diff = diffKeywordLists(['Intro'], ['INTRO', 'intro', 'Chorus']);

    expect(diff.added).toEqual(['chorus']);
    // "Intro" dan "INTRO" adalah keyword yang sama setelah normalisasi.
    expect(diff.removed).toEqual([]);
  });

  test('diffGroupDraft mengabaikan baris yang tidak valid', () => {
    const diff = diffGroupDraft('intro\n(verse)\nchorus', ['intro'], parseKeywordList);

    // "(verse)" gagal validasi → tombol simpan mati, jadi bukan bagian diff.
    expect(diff.added).toEqual(['chorus']);
    expect(diff.removed).toEqual([]);
  });

  test('hasDiff dan describeDiff meringkas perubahan untuk tombol simpan', () => {
    expect(hasDiff(diffKeywordLists(['a'], ['a']))).toBe(false);
    expect(describeDiff(diffKeywordLists(['a'], ['a']))).toBe('');
    expect(describeDiff(diffKeywordLists(['a'], ['b', 'c']))).toBe('+2 −1');
  });

  test('findKeywordConflicts menemukan keyword di lebih dari satu grup', () => {
    const conflicts = findKeywordConflicts({
      sections: ['intro', 'verse'],
      metadata: ['intro'],
      instruments: ['gitar'],
    });

    expect(conflicts).toEqual([{ keyword: 'intro', groups: ['sections', 'metadata'] }]);
  });

  test('findGroupConflicts menyaring konflik milik satu grup', () => {
    const groups = {
      sections: ['intro'],
      metadata: ['intro', 'key'],
      instruments: ['gitar'],
    };

    expect(findGroupConflicts('instruments', groups)).toEqual([]);
    expect(findGroupConflicts('sections', groups)).toHaveLength(1);
    expect(findGroupConflicts('metadata', groups)[0].keyword).toBe('intro');
  });

  test('findNewConflicts mengabaikan konflik yang sudah ada sejak bawaan', () => {
    const fallbacks = { sections: ['intro'], metadata: ['intro'] };
    const current = { sections: ['intro'], metadata: ['intro', 'capo'], instruments: ['capo'] };

    // "intro" sudah bentrok di bawaan → bukan masalah baru.
    expect(findNewConflicts(fallbacks, fallbacks).map((item) => item.keyword)).toEqual([]);
    expect(findNewConflicts(current, fallbacks).map((item) => item.keyword)).toEqual(['capo']);
  });

  test('keywordsFromDraft hanya mengembalikan baris valid', () => {
    expect(keywordsFromDraft('Intro, (bad)\nchorus', parseKeywordList)).toEqual([
      'intro',
      'chorus',
    ]);
  });

  test('daftar bawaan grup masuk akal untuk panel', () => {
    const active = Object.fromEntries(getTagGroups().map((group) => [group.id, group.fallback]));
    expect(getTagGroups().length).toBeGreaterThanOrEqual(5);
    // Helper harus aman walau daftar bawaan sendiri memuat keyword ganda.
    expect(() => findKeywordConflicts(active)).not.toThrow();
  });

  test('aksi audit tag punya kategori, severity, dan nama tampilan', () => {
    expect(getActionCategory(AUDIT_ACTIONS.TAG_DETECTION_UPDATED)).toBe('TAG');
    expect(getActionSeverity(AUDIT_ACTIONS.TAG_DETECTION_UPDATED)).toBe('medium');
    // Reset menghapus kata kunci global → berisiko tinggi, bukan low.
    expect(getActionSeverity(AUDIT_ACTIONS.TAG_DETECTION_RESET)).toBe('high');
    expect(getActionSeverity(AUDIT_ACTIONS.TAG_DETECTION_GROUP_RESET)).toBe('high');
    expect(formatActionName(AUDIT_ACTIONS.TAG_DETECTION_UPDATED)).toBe('Tag Deteksi Diubah');
  });
});

/**
 * Tambah/hapus SATU keyword lewat chip (bukan textarea). Yang penting:
 * baris lain tidak berubah, karena itu justru risiko yang ingin dihindari.
 */
describe('tambah & hapus keyword lewat chip', () => {
  test('addKeywordToDraft menambahkan keyword ternormalisasi di baris baru', () => {
    const result = addKeywordToDraft('intro\nverse', '  Pre Chorus  ', parseKeywordList);

    expect(result).toEqual({ ok: true, draft: 'intro\nverse\npre chorus' });
  });

  test('addKeywordToDraft mempertahankan komentar dan baris lain', () => {
    const draft = '# seksi lagu\nintro\n\nverse';
    const result = addKeywordToDraft(draft, 'bridge', parseKeywordList);

    expect(result.draft).toBe('# seksi lagu\nintro\n\nverse\nbridge');
  });

  test('addKeywordToDraft menolak keyword kosong, tidak valid, dan duplikat', () => {
    expect(addKeywordToDraft('intro', '   ', parseKeywordList))
      .toMatchObject({ ok: false, reason: 'Kata kunci masih kosong' });
    expect(addKeywordToDraft('intro', '(verse)', parseKeywordList))
      .toMatchObject({ ok: false });
    // Duplikat dikenali walau beda kapitalisasi.
    expect(addKeywordToDraft('intro', 'INTRO', parseKeywordList))
      .toMatchObject({ ok: false, reason: 'Kata kunci sudah ada di daftar' });
  });

  test('addKeywordToDraft mengisi daftar kosong tanpa baris kosong di awal', () => {
    expect(addKeywordToDraft('', 'intro', parseKeywordList)).toEqual({ ok: true, draft: 'intro' });
  });

  test('removeKeywordFromDraft menghapus satu keyword saja', () => {
    const draft = 'intro\nverse\nchorus';

    expect(removeKeywordFromDraft(draft, 'verse', parseKeywordList)).toBe('intro\nchorus');
    // Pencocokan memakai bentuk ternormalisasi.
    expect(removeKeywordFromDraft(draft, '  VERSE ', parseKeywordList)).toBe('intro\nchorus');
  });

  test('removeKeywordFromDraft tidak menghapus baris komentar atau baris tidak valid', () => {
    const draft = '# intro\nintro\n(bad)'; // komentar memuat "intro", dan ada baris invalid
    const result = removeKeywordFromDraft(draft, 'intro', parseKeywordList);

    expect(result).toBe('# intro\n(bad)');
  });

  test('removeKeywordFromDraft memisahkan baris berisi beberapa keyword', () => {
    const result = removeKeywordFromDraft('intro, verse, chorus', 'verse', parseKeywordList);

    expect(result).toBe('intro, chorus');
  });
});
