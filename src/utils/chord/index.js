/**
 * index.js — pintu masuk publik folder src/utils/chord/
 *
 * Modul dipecah berdasarkan tanggung jawab:
 *   textKeywords.js  — helper pencocokan kata kunci (escapeRegex, buildKeywordAlternation)
 *   chordDisplayTags.js — daftar kata kunci AKTIF (bawaan + editan admin),
 *                      termasuk getMetadataKeySet() pengganti metadataKeys
 *   chordTokens.js   — notasi chord: isChordLine, transposeChord, chordToNumber, dll.
 *   instruments.js   — deteksi label instrumen & cue mark
 *   sections.js      — deteksi seksi, modulasi, metadata
 *   timestamps.js    — parsing marker waktu ([mm:ss])
 *   parsing.js       — parseLines & deteksi instrumen per lagu
 *   barline.js       — rapikan barline & wrap bar per baris
 *   analysis.js      — parseChordPro, statistik chord, estimasi key, modulasi
 */
export {
  escapeRegex,
  createKeywordPattern,
  matchKeywordPattern,
  escapeKeywordAlternation,
  buildKeywordAlternation,
} from './textKeywords.js';

// Daftar keyword kini dapat diubah admin (bukan lagi konstanta statis), jadi
// yang diekspor adalah fungsi pembaca, bukan `metadataKeys`.
export {
  getActiveMetadataKeys,
  getChordDisplayTags,
  getInstrumentSet,
  getMetadataKeySet,
  getSectionKeywordPatterns,
  getTagGroupFallback,
  resetAllTagGroups,
  resetTagGroup,
  setTagGroupKeywords,
  subscribeChordDisplayTags,
  summarizeActiveTags,
} from './chordDisplayTags.js';

export * from './chordTokens.js';
export * from './instruments.js';
export * from './sections.js';
export * from './timestamps.js';
export * from './parsing.js';
export * from './barline.js';
export * from './analysis.js';
