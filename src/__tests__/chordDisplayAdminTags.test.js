import { describe, test, expect, beforeEach, vi } from 'vitest';

// Simulasi server: pengaturan global disimpan di variabel modul, BUKAN di
// localStorage — meniru database yang dipakai bersama semua user.
const serverSettings = vi.hoisted(() => ({ value: null }));

vi.mock('../apiClient.js', () => ({
  getAppSetting: vi.fn(async (key) => ({
    settings: { [key]: serverSettings.value },
  })),
  saveAppSetting: vi.fn(async (key, value) => {
    serverSettings.value = Object.fromEntries(
      Object.entries(value).filter(([, list]) => Array.isArray(list) && list.length),
    );
    return { saved: true, setting: { key, value: serverSettings.value } };
  }),
  deleteAppSetting: vi.fn(async () => {
    serverSettings.value = null;
    return { deleted: true };
  }),
}));
import {
  CHORD_DISPLAY_TAG_GROUPS,
  formatKeywordList,
  getTagGroup,
  parseKeywordList,
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
  isCueMarkKeyword,
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

  test('setiap grup punya key pengaturan unik dan fallback tidak kosong', () => {
    const keys = CHORD_DISPLAY_TAG_GROUPS.map((group) => group.storageKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const group of CHORD_DISPLAY_TAG_GROUPS) {
      expect(group.fallback.length, group.id).toBeGreaterThan(0);
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

  test('instrumen dan cue mark tambahan dibaca parser', async () => {
    expect(isInstrumentKeywordWord('angklung')).toBe(true);
    expect(isInstrumentKeywordWord('kolintang')).toBe(false);

    await setTagGroupKeywords('instruments', [...getChordDisplayTags().INSTRUMENT_KEYWORDS, 'kolintang']);
    await setTagGroupKeywords('cueMarks', [...getChordDisplayTags().CUE_MARK_KEYWORDS, 'breakdown']);

    expect(isInstrumentKeywordWord('Kolintang')).toBe(true);
    expect(isCueMarkKeyword('[Breakdown]')).toBe(true);

    // Label instrumen dikenali bila diikuti keterangan ("[Nama: Detail]").
    const token = parseLines(['[Kolintang: Akustik]'], 0)[0];
    expect(token).toMatchObject({ type: 'instrument' });
  });

  test('metadata dan modulasi tambahan dikenali', async () => {
    expect(isMetadataLine('[Capo: 2]')).toBe(false);

    await setTagGroupKeywords('metadata', [...getChordDisplayTags().METADATA_KEYS, 'capo']);
    await setTagGroupKeywords('modulation', [...getChordDisplayTags().MODULATION_KEYWORDS, 'naik nada']);

    expect(isMetadataLine('[Capo: 2]')).toBe(true);
    expect(parseSection('[Naik Nada: D]')).toMatchObject({ type: 'modulation', label: 'D' });
  });

  test('token No Chord dapat diubah admin', async () => {
    expect(isNoChordToken('n.c.')).toBe(true);
    await setTagGroupKeywords('noChord', ['tanpa chord']);

    expect(isNoChordToken('Tanpa Chord')).toBe(true);
    expect(isNoChordToken('nc')).toBe(false);
  });

  test('menghapus semua keyword seksi membuat baris seksi tidak lagi terdeteksi', async () => {
    await setTagGroupKeywords('sections', ['lagu']);
    await setTagGroupKeywords('modulation', ['modulasi']);
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
    const group = getTagGroup('cueMarks');
    expect(formatKeywordList(group.fallback)).toBe(group.fallback.join('\n'));
  });

  test('baris chord tetap terdeteksi walau daftar tag diubah', async () => {
    await setTagGroupKeywords('instruments', ['gitar']);
    expect(isChordLine('| C | G | Am | F |')).toBe(true);
  });
});

/** Salinan daftar seksi aktif (fallback) agar test tidak bergantung pada var. */
function getTagDisplaySectionKeywords() {
  return [...getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS];
}
