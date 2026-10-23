import { describe, test, expect, beforeEach, vi } from 'vitest';

// Simulasi server: pengaturan global disimpan di variabel modul, BUKAN di
// localStorage — meniru database yang dipakai bersama semua user.
const serverSettings = vi.hoisted(() => ({ value: null }));

vi.mock('../apiClient.js', () => ({
  getAppSetting: vi.fn(async (key) => ({
    settings: { [key]: serverSettings.value },
  })),
  saveAppSetting: vi.fn(async (key, value) => {
    // Grup keyword = array; grup alias = objek alias→kanonik. Keduanya sah
    // dan harus dipertahankan (server melakukan hal yang sama).
    serverSettings.value = Object.fromEntries(
      Object.entries(value).filter(([, list]) => (
        Array.isArray(list) ? list.length : Boolean(list && Object.keys(list).length)
      )),
    );
    return { saved: true, setting: { key, value: serverSettings.value } };
  }),
  // Reset SATU grup: hanya kunci itu yang dibuang (meniru PATCH handler).
  resetAppSettingGroup: vi.fn(async (key, groupId) => {
    const next = { ...(serverSettings.value || {}) };
    const removed = next[groupId] || [];
    delete next[groupId];
    serverSettings.value = Object.keys(next).length ? next : null;
    return {
      resetGroup: groupId,
      removed,
      setting: { key, value: serverSettings.value },
    };
  }),
  deleteAppSetting: vi.fn(async () => {
    serverSettings.value = null;
    return { deleted: true };
  }),
}));
import {
  CHORD_DISPLAY_TAG_GROUPS,
  formatKeywordList,
  formatSectionAliases,
  getTagGroup,
  parseKeywordList,
  parseSectionAliases,
  validateKeyword,
} from '../config/chordDisplayTagGroups.js';
import {
  clearChordDisplayTagsCache,
  getChordDisplayTags,
  getOverriddenGroupIds,
  loadChordDisplayTags,
  resetAllTagGroups,
  resetTagGroup,
  setTagGroupKeywords,
  summarizeActiveTags,
} from '../utils/chord/chordDisplayTags.js';
import {
  isChordLine,
  isMetadataLine,
  parseSection,
  parseLines,
  isNoChordToken,
  isInstrumentKeywordWord,
  canonicalSection,
} from '../utils/chordUtils.js';
import { getLyricsCompletionOptions, lyricsCompletionOptions } from '../utils/lyricsCompletion.js';
import { isSectionLine } from '../modules/bulk-lyrics/bulkLyricsParser.js';

/**
 * Administrator dapat mengatur kelompok tag yang dideteksi ChordDisplay
 * (halaman /admin -> Tag & Deteksi). Test ini memastikan pengaturan tersebut
 * benar-benar dibaca parser, autocomplete, dan bulk import — bukan hanya
 * tersimpan di localStorage.
 */
describe('pengaturan tag ChordDisplay oleh admin', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    serverSettings.value = null;
    clearChordDisplayTagsCache();
    await resetAllTagGroups();
  });

  test('setiap grup punya id unik dan fallback tidak kosong', () => {
    const ids = CHORD_DISPLAY_TAG_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of CHORD_DISPLAY_TAG_GROUPS) {
      // Grup alias menyimpan objek alias→kanonik, grup lain daftar keyword.
      const size = group.kind === 'aliasMap'
        ? Object.keys(group.fallback || {}).length
        : group.fallback.length;
      expect(size, group.id).toBeGreaterThan(0);
      // Penyimpanan global memakai id grup (app_settings), bukan key
      // localStorage per grup seperti versi lama.
      expect(group.storageKey).toBeUndefined();
    }
  });

  test('pengaturan disimpan di server (global), bukan per browser', async () => {
    await setTagGroupKeywords('instruments', ['gitar', 'bass']);

    expect(serverSettings.value.instruments).toEqual(['gitar', 'bass']);

    // Perangkat lain: cache lokal kosong, lalu memuat dari server.
    window.localStorage.clear();
    clearChordDisplayTagsCache();
    await loadChordDisplayTags();

    expect(getChordDisplayTags().INSTRUMENT_KEYWORDS).toEqual(['gitar', 'bass']);
    expect(isInstrumentKeywordWord('suling')).toBe(false);
  });

  test('reset dan simpan mengembalikan status ok/gagal yang bisa ditampilkan', async () => {
    const saved = await setTagGroupKeywords('noChord', ['tanpa chord']);
    expect(saved.ok).toBe(true);

    const empty = await setTagGroupKeywords('noChord', []);
    expect(empty).toMatchObject({ ok: false });

    const reset = await resetTagGroup('noChord');
    expect(reset.ok).toBe(true);
    expect(getChordDisplayTags().NO_CHORD_TOKENS).toContain('n.c.');
  });

  test('keyword baru untuk section langsung dikenali parser dan autocomplete', async () => {
    // "Gitar Elektrik" tidak memuat keyword seksi bawaan apa pun ("solo" dsb).
    expect(parseSection('[Gitar Elektrik]')).toBeNull();

    await setTagGroupKeywords('sections', [...getTagDisplaySectionKeywords(), 'gitar elektrik']);

    expect(parseSection('[Gitar Elektrik]')).toMatchObject({ type: 'structure' });
    expect(canonicalSection('Gitar Elektrik')).toBe('gitar elektrik');

    // `lyricsCompletionOptions` dievaluasi saat modul dimuat (sebelum editan
    // admin); editor memakai getter agar pilihan selalu terbaru.
    const labels = getLyricsCompletionOptions().map((option) => option.label);
    expect(labels).toContain('[Gitar Elektrik]');
    expect(lyricsCompletionOptions.length).toBeGreaterThan(0);
  });

  test('keyword seksi yang dihapus tidak lagi dikenali', async () => {
    await setTagGroupKeywords('sections', getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS
      .filter((keyword) => keyword !== 'bridge'));

    expect(parseSection('[Bridge]')).toBeNull();
    expect(isSectionLine('Bridge 2')).toBe(false);
    expect(isSectionLine('[Intro]')).toBe(true);
  });

  test('alias seksi ikut mati saat kata alias dihapus', async () => {
    const before = getChordDisplayTags().SECTION_NAME_ALIASES;
    expect(before.bait).toBe('verse');

    await setTagGroupKeywords('sections', getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS
      .filter((keyword) => keyword !== 'bait'));

    expect(getChordDisplayTags().SECTION_NAME_ALIASES.bait).toBeUndefined();
    expect(canonicalSection('Bait 2')).toBeNull();
  });

  test('instrumen tambahan dibaca parser, cue mark kini metadata', async () => {
    expect(isInstrumentKeywordWord('angklung')).toBe(true);
    expect(isInstrumentKeywordWord('kolintang')).toBe(false);

    await setTagGroupKeywords('instruments', [...getChordDisplayTags().INSTRUMENT_KEYWORDS, 'kolintang']);

    expect(isInstrumentKeywordWord('Kolintang')).toBe(true);

    // Cue mark tidak lagi punya parser: baris ber-braket dibaca metadata.
    expect(isMetadataLine('[Breakdown]')).toBe(false);
    expect(isMetadataLine('[Stop]')).toBe(true);

    // Menambahkan keyword cue ke grup metadata membuatnya ikut dikenali.
    await setTagGroupKeywords('metadata', [...getChordDisplayTags().METADATA_KEYS, 'breakdown']);
    expect(isMetadataLine('[Breakdown]')).toBe(true);
    expect(parseLines(['[Breakdown]'], 0)[0]).toMatchObject({ type: 'metadata' });

    // Label instrumen dikenali bila diikuti keterangan ("[Nama: Detail]").
    const token = parseLines(['[Kolintang: Akustik]'], 0)[0];
    expect(token).toMatchObject({ type: 'instrument' });
  });

  test('metadata tambahan dikenali dan modulasi kini metadata biasa', async () => {
    expect(isMetadataLine('[Capo: 2]')).toBe(false);
    expect(isMetadataLine('[Modulation: D]')).toBe(true);

    await setTagGroupKeywords('metadata', [...getChordDisplayTags().METADATA_KEYS, 'capo']);

    expect(isMetadataLine('[Capo: 2]')).toBe(true);
    expect(parseSection('[Naik Nada: D]')).toBeNull();
  });

  test('token No Chord dapat diubah admin', async () => {
    expect(isNoChordToken('n.c.')).toBe(true);
    await setTagGroupKeywords('noChord', ['tanpa chord']);

    expect(isNoChordToken('Tanpa Chord')).toBe(true);
    expect(isNoChordToken('nc')).toBe(false);
  });

  test('menghapus semua keyword seksi membuat baris seksi tidak lagi terdeteksi', async () => {
    await setTagGroupKeywords('sections', ['lagu']);
    expect(parseSection('[Intro]')).toBeNull();
    expect(parseSection('[Lagu]')).toMatchObject({ type: 'structure' });
  });

  test('reset grup mengembalikan bawaan dan menandai override hilang', async () => {
    await setTagGroupKeywords('instruments', ['gitar']);
    expect(getOverriddenGroupIds()).toContain('instruments');

    await resetTagGroup('instruments');

    expect(getOverriddenGroupIds()).not.toContain('instruments');
    expect(isInstrumentKeywordWord('suling')).toBe(true);
  });

  test('reset satu grup tidak mengubah grup lain', async () => {
    await setTagGroupKeywords('instruments', ['gitar']);
    await setTagGroupKeywords('noChord', ['tanpa chord']);
    expect(getOverriddenGroupIds().sort()).toEqual(['instruments', 'noChord']);

    const result = await resetTagGroup('instruments');

    expect(result.ok).toBe(true);
    expect(result.removed).toEqual(['gitar']);
    // noChord tetap memakai pengaturan admin — inilah bug yang diperbaiki.
    expect(getOverriddenGroupIds()).toEqual(['noChord']);
    expect(isNoChordToken('Tanpa Chord')).toBe(true);
  });

  test('ringkasan menghitung daftar aktif', async () => {
    const summary = summarizeActiveTags();
    expect(summary.sections).toBe(getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS.length);
    expect(summary.metadata).toBeGreaterThan(0);
    expect(summary.instruments).toBeGreaterThan(0);

    await setTagGroupKeywords('instruments', ['gitar', 'bass']);
    expect(summarizeActiveTags().instruments).toBe(2);
  });

  test('validasi keyword menolak karakter berbahaya untuk regex', () => {
    expect(validateKeyword('(verse)')).toMatchObject({ ok: false });
    expect(validateKeyword('pre-chorus')).toMatchObject({ ok: true, value: 'pre-chorus' });
    expect(validateKeyword('')).toMatchObject({ ok: false });

    const parsed = parseKeywordList('# komentar\nIntro, Chorus\nverse_1\n');
    expect(parsed.filter((row) => !row.reason).map((row) => row.value)).toEqual(['intro', 'chorus', 'verse_1']);
  });

  test('format daftar untuk editor memakai satu kata kunci per baris', () => {
    const group = getTagGroup('metadata');
    expect(formatKeywordList(group.fallback)).toBe(group.fallback.join('\n'));
  });

  test('format & parse alias seksi memakai bentuk alias=kanonik', () => {
    const text = formatSectionAliases({ 'ulangan besar': 'chorus', bait: 'verse' });
    expect(text).toBe('ulangan besar=chorus\nbait=verse');

    const parsed = parseSectionAliases(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.aliases).toEqual({ 'ulangan besar': 'chorus', bait: 'verse' });
  });

  test('parse alias menolak baris tanpa =, kosong, dan alias yang sama dengan kanonik', () => {
    const parsed = parseSectionAliases('tanpa-separator\n=intro\nbait=\nchorus=chorus\n# komentar');

    expect(parsed.aliases).toEqual({});
    expect(parsed.errors).toHaveLength(4);
    expect(parsed.errors.map((row) => row.reason)).toContain('Alias dan kanonik tidak boleh sama');
  });

  test('baris chord tetap terdeteksi walau daftar tag diubah', async () => {
    await setTagGroupKeywords('instruments', ['gitar']);
    expect(isChordLine('| C | G | Am | F |')).toBe(true);
  });

  test('alias seksi diatur admin dan langsung dipakai parser', async () => {
    // "ulangan besar" belum ada di daftar seksi bawaan dan tidak memuat kata
    // kunci seksi/instrumen mana pun ("jembatan" ditolak karena nama instrumen).
    expect(canonicalSection('Ulangan Besar')).not.toBe('chorus');

    await setTagGroupKeywords('sections', [
      ...getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS,
      'ulangan besar',
    ]);
    const saved = await setTagGroupKeywords('sectionAliases', { 'ulangan besar': 'chorus' });

    expect(saved.ok).toBe(true);
    expect(getChordDisplayTags().SECTION_NAME_ALIASES['ulangan besar']).toBe('chorus');
    // Label lengkap memakai alias kata pertama; nomor seksi dipertahankan
    // pemanggil karena canonicalSection mengembalikan bentuk kanonik.
    expect(canonicalSection('Ulangan Besar')).toBe('chorus');
    expect(getOverriddenGroupIds()).toContain('sectionAliases');
  });

  test('alias yang bentuk kanoniknya tidak ada di seksi diabaikan', async () => {
    await setTagGroupKeywords('sections', [
      ...getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS,
      'ulangan besar',
    ]);
    await setTagGroupKeywords('sectionAliases', { 'ulangan besar': 'chorus', aneh: 'tidak ada' });

    // Hanya alias yang kedua katanya terdaftar sebagai seksi yang aktif.
    expect(getChordDisplayTags().SECTION_NAME_ALIASES['ulangan besar']).toBe('chorus');
    expect(getChordDisplayTags().SECTION_NAME_ALIASES.aneh).toBeUndefined();
  });

  test('reset grup alias mengembalikan alias bawaan', async () => {
    // Alias hanya aktif bila kedua katanya ada di daftar seksi, jadi daftar
    // seksi ditambah lebih dulu seperti langkah admin di panel.
    await setTagGroupKeywords('sections', [
      ...getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS,
      'ulangan besar',
    ]);
    await setTagGroupKeywords('sectionAliases', { 'ulangan besar': 'chorus' });
    expect(getChordDisplayTags().SECTION_NAME_ALIASES['ulangan besar']).toBe('chorus');

    const result = await resetTagGroup('sectionAliases');

    expect(result.ok).toBe(true);
    expect(getChordDisplayTags().SECTION_NAME_ALIASES['ulangan besar']).toBeUndefined();
    expect(getChordDisplayTags().SECTION_NAME_ALIASES.bait).toBe('verse');
  });
});

/** Salinan daftar seksi aktif (fallback) agar test tidak bergantung pada var. */
function getTagDisplaySectionKeywords() {
  return [...getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS];
}
