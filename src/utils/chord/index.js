/**
 * index.js — pintu masuk publik folder src/utils/chord/
 *
 * Modul dipecah berdasarkan tanggung jawab:
 *   textKeywords.js  — helper pencocokan kata kunci (escapeRegex, metadataKeys)
 *   chordTokens.js   — notasi chord: isChordLine, transposeChord, chordToNumber, dll.
 *   instruments.js   — deteksi label instrumen & cue mark
 *   sections.js      — deteksi seksi, modulasi, metadata
 *   timestamps.js    — parsing marker waktu ([mm:ss])
 *   parsing.js       — parseLines & deteksi instrumen per lagu
 *   barline.js       — rapikan barline & wrap bar per baris
 *   analysis.js      — parseChordPro, statistik chord, estimasi key, modulasi
 */
export {
  metadataKeys,
  escapeRegex,
  createKeywordPattern,
  matchKeywordPattern,
  escapeKeywordAlternation,
  buildKeywordAlternation,
} from './textKeywords.js';

export * from './chordTokens.js';
export * from './instruments.js';
export * from './sections.js';
export * from './timestamps.js';
export * from './parsing.js';
export * from './barline.js';
export * from './analysis.js';
