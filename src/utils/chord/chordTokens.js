/**
 * chordTokens.js
 *
 * Notasi chord: tokenisasi, normalisasi, transposisi, derajat angka (Nashville),
 * serta format ulang ke gaya jazz/simple.
 *
 * Deteksi chord mengabaikan barline (|, ||, |:, :|) dan mendukung compact chord
 * (D..Gm..Bb). Regex chord bersumber dari src/config/chordDisplayConfig.js.
 */
import { CHORD_REGEX_SOURCE, CHORD_TOKEN_REGEX_SOURCE, NO_CHORD_TOKENS } from '../../config/chordDisplayConfig.js';
import { buildKeywordAlternation } from './textKeywords.js';

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Pola barline (|, ||, |:, :|) — satu sumber untuk isChordLine & parseNumberLine. */
const BARLINE_TOKEN_GLOBAL_REGEX = /\|:|:\||\[\:|\:\]|\|\||\|/g;

/** Token chord yang dibungkus bracket/parentheses dan boleh berakhiran titik durasi. */
const WRAPPED_TOKEN_REGEX = /^([\(\[\{]?)(.+?)([\)\]\}]?)(\.{2,})?$/;

/**
 * Token chord pada baris chart — mendukung passing dash dan compact separator.
 * Sumber: src/config/chordDisplayConfig.js (CHORD_TOKEN_REGEX_SOURCE).
 */
const CHORD_REGEX_GLOBAL = new RegExp(CHORD_TOKEN_REGEX_SOURCE, 'g');

/** Token chord dibungkus bracket, titik durasi dibuang. */
export const normalizeChordToken = (token) => {
  if (typeof token !== 'string') return token;
  return token
    .trim()
    .replace(/^[\(\[\{]+/, '')
    .replace(/\.+$/, '')
    .replace(/[\)\]\}]+$/, '');
};

/** Buang passing dash lalu normalisasi token chord. */
export const toCleanChord = (chord) => normalizeChordToken(String(chord || '').replace(/^-/, ''));

// Global regex untuk deteksi chord (standar, konsisten di semua fungsi)
// Sumber regex: src/config/chordDisplayConfig.js (CHORD_REGEX_SOURCE)
const CHORD_REGEX = new RegExp(CHORD_REGEX_SOURCE, 'i');
const NO_CHORD_REGEX = new RegExp(
  `^(${buildKeywordAlternation(NO_CHORD_TOKENS, '\\s*')})$`,
  'i',
);

/**
 * Validasi apakah sebuah token adalah No Chord (N.C.).
 * @param {string} token - Token (misal: N.C., NC, No Chord)
 * @returns {boolean}
 */
export const isNoChordToken = (token) => {
  if (typeof token !== 'string') return false;
  return NO_CHORD_REGEX.test(token.trim());
};

/**
 * Validasi apakah sebuah token adalah chord valid.
 * @param {string} chord - Token chord (misal: Am, F#m7, Bbmaj7, G/B)
 * @returns {boolean}
 */
export function isValidChord(chord) {
  if (typeof chord !== 'string') return false;
  return CHORD_REGEX.test(chord.trim());
}

/**
 * Deteksi apakah sebuah baris adalah baris not angka (misal: 7534, 5317, dst)
 * Mengabaikan barline (|, ||, |:, :|, dst) dan token kosong.
 * Contoh baris yang terdeteksi:
 *   |: 7534 | .... | 5317 | .... :|
 *   1 2 3 4 5 6 7
 *   7. 6' 5 4
 *
 * Return: true jika mayoritas token adalah not angka (1-7, boleh ada titik/garis/aksen)
 */
export const isNumberNotationToken = (token) => {
  if (typeof token !== 'string') return false;
  const cleaned = token.trim();
  if (!cleaned) return false;

  const normalized = cleaned
    .replace(/^[\(\[]+/, '')
    .replace(/[\)\]]+$/g, '')
    .replace(/[’]/g, '\'');

  if (!normalized) return false;

  const numRegex = /^[1-7](?:[.']+)?$/;
  const dotRegex = /^\.{1,}$/;
  return numRegex.test(normalized) || dotRegex.test(normalized);
};

export function parseNumberLine(line) {
  // Hilangkan barline di awal/akhir/token
  const cleaned = line
    .replace(BARLINE_TOKEN_GLOBAL_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return false;
  // Tokenisasi per spasi
  let tokens = cleaned.split(/\s+/);
  if (!tokens.length) return false;
  // Hilangkan token pengulangan (2x, 3x, dst) saja
  tokens = tokens.filter(t => !/^\d+x$/i.test(t));
  if (!tokens.length) return false;

  const validCount = tokens.filter((t) => isNumberNotationToken(t) || /^\.{2,}$/.test(t)).length;
  return validCount > 0 && validCount >= tokens.length / 2;
}

export const isChordToken = (token) => {
  if (typeof token !== 'string') return false;
  if (isNoChordToken(token)) return true;
  const normalized = normalizeChordToken(token);
  return CHORD_REGEX.test(normalized);
};

export const isLeadingDashChordToken = (token) => {
  if (typeof token !== 'string' || !token.startsWith('-')) return false;
  return CHORD_REGEX.test(token.slice(1).trim());
};

const transposeNote = (note, steps) => {
  if (!note || steps === 0) return note;
  const useFlat = note.includes('b');
  const noteArray = useFlat ? NOTES_FLAT : NOTES_SHARP;

  let index = noteArray.indexOf(note);
  if (index === -1) {
    const altArray = useFlat ? NOTES_SHARP : NOTES_FLAT;
    index = altArray.indexOf(note);
    if (index === -1) return note;
  }

  let newIndex = (index + steps) % 12;
  if (newIndex < 0) newIndex += 12;
  return noteArray[newIndex];
};

export const transposeChordToken = (token, steps) => {
  if (!token || steps === 0) return token;
  if (isNoChordToken(token)) return token;
  const match = token.match(WRAPPED_TOKEN_REGEX);
  if (!match) return token;

  const [, prefix = '', inner, suffix = '', dots = ''] = match;
  const normalized = normalizeChordToken(inner);
  if (!CHORD_REGEX.test(normalized)) return token;

  return `${prefix}${transposeChord(normalized, steps)}${suffix}${dots || ''}`;
};

export const transposeLeadingDashChordToken = (token, steps) => {
  if (!token || steps === 0 || !token.startsWith('-')) return token;
  const chordToken = token.slice(1).trim();
  if (!CHORD_REGEX.test(chordToken)) return token;
  return `-${transposeChord(chordToken, steps)}`;
};

export const transposeCompactChordToken = (token, steps) => {
  if (!token || (!token.includes('..') && !token.includes('-'))) return token;
  if (isNoChordToken(token)) return token;

  const parts = token.split(/(\.{2,}|-)/);
  let hasChordPart = false;

  const transposedParts = parts.map((part) => {
    if (!part || /^\.{2,}$/.test(part) || part === '-') return part;
    if (!isChordToken(part)) return part;
    hasChordPart = true;
    return steps ? transposeChordToken(part, steps) : part;
  });

  return hasChordPart ? transposedParts.join('') : token;
};

export const transposeChord = (chord, steps) => {
  if (!chord || steps === 0) return chord;

  const chordRegex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(chordRegex);
  if (!match) return chord;

  const [, root, suffix] = match;
  const qualityAndBass = suffix || '';
  const slashIndex = qualityAndBass.indexOf('/');
  const quality = slashIndex === -1 ? qualityAndBass : qualityAndBass.slice(0, slashIndex);
  const bass = slashIndex === -1 ? '' : qualityAndBass.slice(slashIndex + 1);

  const transposedRoot = transposeNote(root, steps);
  if (!bass) {
    return `${transposedRoot}${quality}`;
  }

  const bassMatch = bass.match(/^([A-G][#b]?)(.*)$/);
  const transposedBass = bassMatch
    ? `/${transposeNote(bassMatch[1], steps)}${bassMatch[2]}`
    : `/${bass}`;

  return `${transposedRoot}${quality}${transposedBass}`;
};

// Get semitone index for a root note using sharp scale, accepting flats
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

export const getNoteIndex = (root) => {
  if (!root) return null;
  const r = root.trim();
  const idx = NOTES_SHARP.indexOf(r);
  if (idx !== -1) return idx;

  // Map flats to sharps
  const sharpIdx = NOTES_SHARP.indexOf(FLAT_TO_SHARP[r] || r);
  return sharpIdx === -1 ? null : sharpIdx;
};

// Helper to extract root note from key string (e.g., 'Am' -> 'A', 'G#m' -> 'G#')
export const extractRoot = (key) => {
  if (!key) return null;
  const m = key.match(/^([A-G][#b]?)/);
  return m ? m[1] : null;
};

// Helper map untuk degree notasi angka
const MAJOR_SCALE_DEGREES = {
  0: '1',
  2: '2',
  4: '3',
  5: '4',
  7: '5',
  9: '6',
  11: '7',
};
const MAJOR_SCALE_ALTERNATE = {
  1: '#1/b2',
  3: 'b3',
  6: 'b5',
  8: '#5',
  10: 'b7',
};

const MINOR_SCALE_DEGREES = {
  0: '1',
  2: '2',
  3: 'b3',
  5: '4',
  7: '5',
  8: 'b6',
  10: 'b7',
};
const MINOR_SCALE_ALTERNATE = {
  1: '#1/b2',
  4: '3',
  6: 'b5',
  9: '#6',
  11: '7',
};

/** 'Am', 'A min', 'Amin', 'A minor' -> minor; selain itu major. */
const getScaleTypeFromKey = (key = 'C') => {
  if (!key) return 'major';
  const normalized = key.trim().toLowerCase();
  if (normalized.includes('maj')) return 'major';
  return /(?:^|[a-g][#b]?)\s*(?:m|min|minor)$/.test(normalized) ? 'minor' : 'major';
};

const getScaleDegreeFromRoot = (rootNote, key = 'C', scaleType = 'major') => {
  const root = extractRoot(rootNote);
  const base = extractRoot(key);
  if (!root || !base) return null;

  const rootIdx = getNoteIndex(root);
  const baseIdx = getNoteIndex(base);
  if (rootIdx == null || baseIdx == null) return null;

  const interval = (rootIdx - baseIdx + 12) % 12;
  const degrees = scaleType === 'minor' ? MINOR_SCALE_DEGREES : MAJOR_SCALE_DEGREES;
  const alternate = scaleType === 'minor' ? MINOR_SCALE_ALTERNATE : MAJOR_SCALE_ALTERNATE;
  return degrees[interval] ?? alternate[interval] ?? null;
};

const normalizeChordQuality = (quality = '') => {
  const norm = quality.trim();
  if (!norm) return '';

  // Samakan sinonim kualitas: "min7" -> "m7", "maj" tetap "maj".
  if (/^maj/i.test(norm)) return norm.replace(/^maj/i, 'maj');
  if (/^min/i.test(norm) || /^m(?!aj)/i.test(norm)) return norm.replace(/^m(in)?/i, 'm');
  return norm;
};

export const getTransposeSteps = (fromKey, toKey) => {
  const fromRoot = extractRoot(fromKey);
  const toRoot = extractRoot(toKey);
  const fromIdx = getNoteIndex(fromRoot);
  const toIdx = getNoteIndex(toRoot);
  if (fromIdx == null || toIdx == null) return 0;
  let steps = toIdx - fromIdx;
  if (steps > 6) steps -= 12;
  if (steps < -6) steps += 12;
  return steps;
};

/**
 * Convert a chord name into numeric scale degree notation (Nashville) based on key.
 * Example: chordToNumber('Am', 'C') -> '6m'
 *          chordToNumber('G7', 'C') -> '57'
 *          chordToNumber('F#dim', 'D') -> '#4dim'
 */
export const chordToNumber = (chord, key = 'C') => {
  if (!chord || typeof chord !== 'string') return null;

  const normalizedChord = chord.trim();
  if (normalizedChord.startsWith('-')) {
    const leadingDashResult = chordToNumber(normalizedChord.slice(1), key);
    return leadingDashResult ? `-${leadingDashResult}` : null;
  }
  const match = normalizedChord.match(/^([A-G][#b]?)(.*)$/i);
  if (!match) return null;

  const root = match[1];
  let remainder = match[2] || '';
  const scaleType = getScaleTypeFromKey(key);

  // Slash bass: derajat bass dihitung pada kualitas yang sama dengan chord induk
  // (mis. Am/C di atas A minor -> 1m/<b3>), bukan selalu tangga mayor.
  let bassDegree = '';
  const slashMatch = remainder.match(/\/([A-G][#b]?)/);
  if (slashMatch) {
    const bassValue = getScaleDegreeFromRoot(slashMatch[1], key, scaleType);
    if (bassValue) {
      bassDegree = '/' + bassValue;
    }
    // Remove bass part from quality
    remainder = remainder.replace(/\/([A-G][#b]?)/, '');
  }

  const quality = normalizeChordQuality(remainder);
  const degree = getScaleDegreeFromRoot(root, key, scaleType);
  if (!degree) return null;

  const chordNumber = `${degree}${quality || ''}${bassDegree}`;
  return chordNumber;
};

export const chordTextToNumberText = (text, key = 'C') => {
  if (!text || typeof text !== 'string') return text;

  const replaced = text.replace(CHORD_REGEX_GLOBAL, (match) => {
    const innerMatch = match.match(/^([\(\[\{]?)(.+?)([\)\]\}]?)$/);
    const fullMatch = innerMatch ? innerMatch[2] : match;
    const sanitized = normalizeChordToken(fullMatch.replace(/\.+$/, ''));
    const numberChord = chordToNumber(sanitized, key);
    if (!numberChord) return match;
    const trailingDots = match.slice(match.replace(/\.+$/, '').length);
    const prefix = innerMatch ? innerMatch[1] : '';
    const suffix = innerMatch ? innerMatch[3] : '';
    return `${prefix}${numberChord}${suffix}${trailingDots}`;
  });

  return replaced;
};

const formatSingleChordToJazzStyle = (chord) => {
  if (!chord || typeof chord !== 'string') return chord;
  if (isNoChordToken(chord)) return chord;

  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, suffix = ''] = match;
  const slashIndex = suffix.indexOf('/');
  const quality = slashIndex === -1 ? suffix : suffix.slice(0, slashIndex);
  const bass = slashIndex === -1 ? '' : suffix.slice(slashIndex);
  const normalizedQuality = quality.trim();

  let jazzQuality = normalizedQuality;

  if (!normalizedQuality) {
    jazzQuality = 'maj7';
  } else if (/^maj7$/i.test(normalizedQuality)) {
    jazzQuality = 'maj9';
  } else if (/^maj9$/i.test(normalizedQuality)) {
    jazzQuality = 'maj9';
  } else if (/^maj$/i.test(normalizedQuality)) {
    jazzQuality = 'maj7';
  } else if (/^m(?!aj)$/i.test(normalizedQuality) || /^min$/i.test(normalizedQuality)) {
    jazzQuality = 'm7';
  } else if (/^(m7|min7)$/i.test(normalizedQuality)) {
    jazzQuality = 'm9';
  } else if (/^(m9|min9)$/i.test(normalizedQuality)) {
    jazzQuality = 'm9';
  } else if (/^7$/i.test(normalizedQuality)) {
    jazzQuality = '13';
  } else if (/^9$/i.test(normalizedQuality) || /^11$/i.test(normalizedQuality) || /^13$/i.test(normalizedQuality)) {
    jazzQuality = normalizedQuality;
  } else if (/^6$/i.test(normalizedQuality)) {
    jazzQuality = '6/9';
  } else if (/^add9$/i.test(normalizedQuality)) {
    jazzQuality = 'maj9';
  } else if (/^sus2$/i.test(normalizedQuality)) {
    jazzQuality = 'add9';
  } else if (/^(sus|sus4)$/i.test(normalizedQuality)) {
    jazzQuality = '13sus4';
  } else if (/^dim$/i.test(normalizedQuality)) {
    jazzQuality = 'm7b5';
  } else if (/^aug$/i.test(normalizedQuality)) {
    jazzQuality = '7#5';
  }

  return `${root}${jazzQuality}${bass}`;
};

const formatSingleChordToSimpleStyle = (chord) => {
  if (!chord || typeof chord !== 'string') return chord;
  if (isNoChordToken(chord)) return chord;

  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, suffix = ''] = match;
  const slashIndex = suffix.indexOf('/');
  const quality = slashIndex === -1 ? suffix : suffix.slice(0, slashIndex);
  const bass = slashIndex === -1 ? '' : suffix.slice(slashIndex);
  const normalizedQuality = quality.trim();

  let simpleQuality = normalizedQuality;

  if (!normalizedQuality) {
    simpleQuality = '';
  } else if (/^maj(?:7|9|11|13)?$/i.test(normalizedQuality)) {
    simpleQuality = '';
  } else if (/^(6|6\/9|add9)$/i.test(normalizedQuality)) {
    simpleQuality = '';
  } else if (/^m(?!aj)(?:7|9|11|13)?$/i.test(normalizedQuality) || /^min(?:7|9|11|13)?$/i.test(normalizedQuality)) {
    simpleQuality = 'm';
  } else if (/^(aug|7#5)$/i.test(normalizedQuality)) {
    simpleQuality = 'aug';
  } else if (/^(7|9|11|13)(?:[#b]\d+)*$/i.test(normalizedQuality)) {
    simpleQuality = '7';
  } else if (/^(sus|sus2|sus4|13sus4)$/i.test(normalizedQuality)) {
    simpleQuality = 'sus';
  } else if (/^(dim|dim7|m7b5)$/i.test(normalizedQuality)) {
    simpleQuality = 'dim';
  }

  return `${root}${simpleQuality}${bass}`;
};

export const chordTextToJazzText = (text) => {
  if (!text || typeof text !== 'string') return text;

  return text.replace(CHORD_REGEX_GLOBAL, (match) => {
    const innerMatch = match.match(/^([\(\[\{]?)(.+?)([\)\]\}]?)$/);
    const fullMatch = innerMatch ? innerMatch[2] : match;
    const trailingDotsMatch = fullMatch.match(/(\.{2,})$/);
    const trailingDots = trailingDotsMatch ? trailingDotsMatch[1] : '';
    const sanitized = normalizeChordToken(fullMatch.replace(/\.{2,}$/, ''));
    const jazzChord = formatSingleChordToJazzStyle(sanitized);
    const prefix = innerMatch ? innerMatch[1] : '';
    const suffix = innerMatch ? innerMatch[3] : '';
    return `${prefix}${jazzChord}${suffix}${trailingDots}`;
  });
};

export const chordTextToSimpleText = (text) => {
  if (!text || typeof text !== 'string') return text;

  return text.replace(CHORD_REGEX_GLOBAL, (match) => {
    const innerMatch = match.match(/^([\(\[\{]?)(.+?)([\)\]\}]?)$/);
    const fullMatch = innerMatch ? innerMatch[2] : match;
    const trailingDotsMatch = fullMatch.match(/(\.{2,})$/);
    const trailingDots = trailingDotsMatch ? trailingDotsMatch[1] : '';
    const sanitized = normalizeChordToken(fullMatch.replace(/\.{2,}$/, ''));
    const simpleChord = formatSingleChordToSimpleStyle(sanitized);
    const prefix = innerMatch ? innerMatch[1] : '';
    const suffix = innerMatch ? innerMatch[3] : '';
    return `${prefix}${simpleChord}${suffix}${trailingDots}`;
  });
};

// Fungsi untuk mendeteksi apakah sebuah baris adalah baris chord
export const isChordLine = (line) => {
  if (typeof line !== 'string' || !line.trim()) return false;

  // Remove section label at start (e.g. [Coda])
  let cleanedLine = line.replace(/^\[.+?\]\s*/, '');
  // Remove repeat token (e.g. (2x), (3x))
  cleanedLine = cleanedLine.replace(/\(\d+x\)/g, '').trim();

  // Check for compact chord format with .. separator (e.g., D..Gm..Bb)
  const compactPattern = /^(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/([A-G][#b]?))?)(?:\.\.(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/([A-G][#b]?))?))+$/;
  if (compactPattern.test(cleanedLine.trim())) return true;

  // Tokenisasi: pisahkan berdasarkan spasi, abaikan barline (|, ||, |:, :|)
  const tokens = cleanedLine
    .replace(BARLINE_TOKEN_GLOBAL_REGEX, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return false;

  // Hitung jumlah token chord (termasuk N.C.) dan token pengisi (hanya . atau -)
  const chordOrFiller = tokens.filter((token) => (
    isChordToken(token) || /^\.*$/.test(token) || /^-+$/.test(token)
  )).length;
  // Jika mayoritas token adalah chord atau filler, anggap baris chord
  if (chordOrFiller > 0 && chordOrFiller >= tokens.length * 0.7) return true;

  // Fallback: coverage karakter chord (lama)
  const matches = [...cleanedLine.matchAll(CHORD_REGEX_GLOBAL)];
  if (matches.length === 0) return false;
  const totalChordLength = matches.reduce((sum, match) => sum + match[0].length, 0);
  const lineWithoutSpaces = cleanedLine.replace(/\s+/g, '');
  return totalChordLength > 0 && (totalChordLength / lineWithoutSpaces.length) >= 0.5;
};

export { CHORD_REGEX_GLOBAL };
