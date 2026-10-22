/**
 * textKeywords.js
 *
 * Helper pencocokan kata kunci berbasis teks, dipakai bersama oleh seluruh
 * modul di folder src/utils/chord/.
 *
 * Semua kata kunci (seksi, metadata, cue mark, instrumen, modulasi, N.C.)
 * berasal dari src/config/chordDisplayConfig.js dan dicocokkan sebagai KATA
 * UTUH, bukan substring: "Interlude" cocok, "Soloist" tidak.
 */
import { METADATA_KEYS } from '../../config/chordDisplayConfig.js';

/** Set kata kunci metadata, semuanya lowercase. */
export const metadataKeys = new Set(METADATA_KEYS.map((key) => key.toLowerCase()));

/** Escape karakter khusus regex pada sebuah string. */
export const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Kata kunci -> regex batas kata (spasi/underscore/hyphen dianggap pemisah kata).
 * Regex dibuat sekali per pemanggilan; gunakan cache di pemanggil bila hot path.
 */
export const createKeywordPattern = (keyword, separator = '[\\s_-]+') => (
  new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword).replace(/\s+/g, separator)}($|[^a-z0-9])`, 'i')
);

/** Alias ringkas untuk pola kata utuh dengan pemisah default. */
export const matchKeywordPattern = (keyword = '') => createKeywordPattern(keyword);

/**
 * Ganti spasi di dalam kata kunci dengan pola pemisah (mis. '\\s+' atau '[\\s_-]+').
 * Dipakai saat menyusun regex alternative dari daftar kata kunci.
 */
export const escapeKeywordAlternation = (keyword, separator = '[\\s_-]+') => (
  escapeRegex(keyword).replace(/\s+/g, separator)
);

/**
 * Gabungkan daftar kata kunci menjadi satu alternation regex.
 * Contoh: buildKeywordAlternation(['no chord', 'nc']) -> 'no\\s*chord|nc'.
 */
export const buildKeywordAlternation = (keywords = [], separator = '[\\s_-]+') => (
  keywords.map((keyword) => escapeKeywordAlternation(keyword, separator)).join('|')
);
