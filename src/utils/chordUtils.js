/**
 * Mem-parse array baris lirik menjadi struktur token untuk rendering.
 * @param {string[]} lines - Array baris lirik
 * @param {number} transpose - Jumlah transposisi chord
 * @returns {Array} Array objek baris terstruktur
 */
export function splitSectionLabelWithChords(line) {
  if (typeof line !== 'string') return null;
  const trimmedLine = line.trim();
  const match = trimmedLine.match(/^(\[?[A-Za-z0-9 ._-]+\]?)\s*:\s*(.+)$/);
  if (!match) return null;

  const labelToken = match[1].trim();
  const trailing = match[2].trim();
  if (!trailing) return null;

  const section = parseSection(`${labelToken}:`);
  if (!section) return null;
  if (!isChordLine(trailing)) return null;

  return [`${labelToken}:`, trailing];
}

function parseLine(line, transpose) {
  const trimmed = line.trim();
  if (!trimmed) return { type: 'empty' };
  // Jangan transpose baris "Original Key:" — tetap tampilkan metadata asli tanpa transposi
  if (/^Original\s+Key:/i.test(trimmed)) {
    return {
      type: 'lyrics',
      tokens: line.split(/(\s+)/).map(token => ({
        token,
        isSpace: /^\s+$/.test(token)
      }))
    };
  }
  const section = parseSection(line);
  if (section) {
    // Transpose modulation key label
    if (section.type === 'modulation' && transpose) {
      return { type: section.type, label: transposeChord(section.label, transpose) };
    }
    return { type: section.type, label: section.label };
  }
  if (isChordLine(line)) {
    return {
      type: 'chord',
      tokens: line.split(/(\s+)/).map(token => {
        if (/^\s+$/.test(token)) return { token, isSpace: true };
        if (/^(\|:|:\||\[\:|\:\]|\|\||\|)$/.test(token)) return { token, isBarline: true };
        if (isChordToken(token)) {
          return { token: transpose ? transposeChordToken(token, transpose) : token, isChord: true };
        }
        if (isLeadingDashChordToken(token)) {
          return { token: transpose ? transposeLeadingDashChordToken(token, transpose) : token, isChord: true };
        }
        if (token.includes('..')) {
          return { token: transposeCompactChordToken(token, transpose), isChord: true };
        }
        return { token, isChord: true };
      })
    };
  }
  if (parseNumberLine(line)) {
    return {
      type: 'number',
      tokens: line.split(/(\s+)/).map(token =>
        /^\s+$/.test(token)
          ? { token, isSpace: true }
          : { token, isNumber: true }
      )
    };
  }
  return {
    type: 'lyrics',
    tokens: line.split(/(\s+)/).map(token => {
      if (/^\s+$/.test(token)) return { token, isSpace: true };
      if (isChordToken(token)) return { token: transpose ? transposeChordToken(token, transpose) : token, isChord: true };
      if (isLeadingDashChordToken(token)) return { token: transpose ? transposeLeadingDashChordToken(token, transpose) : token, isChord: true };
      if (parseNumberLine(token)) return { token, isNumber: true };
      return { token };
    })
  };
}

export function parseLines(lines, transpose) {
  return lines.flatMap(line => {
    const sectionChunks = splitSectionLabelWithChords(line);
    if (sectionChunks) {
      return sectionChunks.map(chunk => parseLine(chunk, transpose));
    }
    return [parseLine(line, transpose)];
  });
}
/**
 * Helper: parse [mm:ss] or [hh:mm:ss] timestamp to seconds
 * @param {string} token - Token timestamp (misal: [01:23] atau [1:02:03])
 * @returns {number|null} detik, atau null jika tidak cocok
 */
export function parseTimestampToken(token) {
  const m = token.match(/^\[(\d{1,2}):(\d{2})\]$/); // [mm:ss]
  if (m) {
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  const h = token.match(/^\[(\d{1,2}):(\d{2}):(\d{2})\]$/); // [hh:mm:ss]
  if (h) {
    return parseInt(h[1], 10) * 3600 + parseInt(h[2], 10) * 60 + parseInt(h[3], 10);
  }
  return null;
}
// Global regex untuk deteksi chord (standar, konsisten di semua fungsi)
const CHORD_REGEX = /^[A-G][#b]?m?(aj|sus|dim|aug|add)?\d*(\/([A-G][#b]?))?$/i;
const NO_CHORD_REGEX = /^(N\.C\.|NC|No\s*Chord|No\s*Chords?)$/i;

/**
 * Validasi apakah sebuah token adalah No Chord (N.C.).
 * @param {string} token - Token (misal: N.C., NC, No Chord)
 * @returns {boolean}
 */
const isNoChordToken = (token) => {
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
export function parseNumberLine(line) {
  // Hilangkan barline di awal/akhir/token
  const cleaned = line
    .replace(/\|:|:\||\[\:|\:\]|\|\||\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return false;
  // Tokenisasi per spasi
  let tokens = cleaned.split(/\s+/);
  if (!tokens.length) return false;
  // Hilangkan token pengulangan (2x, 3x, dst) saja
  tokens = tokens.filter(t => !/^\d+x$/i.test(t));
  if (!tokens.length) return false;
  // Regex not angka: 1-7, boleh ada titik, aksen, petik, dsb
  const numRegex = /^[1-7][.']*$/;
  const dotRegex = /^\.{2,}$/; // token hanya titik minimal dua (....)
  // Hitung mayoritas dari not angka dan .... saja
  const validCount = tokens.filter(t => numRegex.test(t) || dotRegex.test(t)).length;
  return validCount > 0 && validCount >= tokens.length / 2;
}

/**
 * Sejajarkan posisi barline (|, ||, |:, :|) pada teks multiline.
 * Dipakai di mode edit lirik untuk merapikan teks chord yang dipilih.
 *
 * @param {string} text - Potongan teks yang dipilih
 * @returns {string}
 */
export function alignSelectedBarlines(text) {
  if (typeof text !== 'string' || !text) return text;

  const barlineRegex = /(\|:|:\||\|\||\|)/g;
  const hasBarline = (line) => /(\|:|:\||\|\||\|)/.test(line);
  const normalizeBarSpacing = (line) => {
    if (!hasBarline(line)) return line;

    return line
      // Pastikan ada spasi sebelum barline jika didahului chord/teks.
      .replace(/([^\s|])(\|:|:\||\|\||\|)/g, '$1 $2')
      // Pastikan ada spasi setelah barline jika diikuti chord/teks.
      .replace(/(\|:|:\||\|\||\|)([^\s|])/g, '$1 $2')
      // Rapikan spasi berlebih di sekitar barline menjadi satu spasi.
      .replace(/[ \t]+(\|:|:\||\|\||\|)/g, ' $1')
      .replace(/(\|:|:\||\|\||\|)[ \t]+/g, '$1 ')
      .trimEnd();
  };

  const lines = text.split(/\r?\n/).map(normalizeBarSpacing);
  const linesWithBars = lines.filter(line => hasBarline(line));

  if (linesWithBars.length < 2) return text;

  const barPositionsByLine = lines.map(line => {
    const positions = [];
    barlineRegex.lastIndex = 0;
    let match;
    while ((match = barlineRegex.exec(line)) !== null) {
      positions.push(match.index);
    }
    return positions;
  });

  const maxBarCount = Math.max(...barPositionsByLine.map(positions => positions.length), 0);
  if (maxBarCount === 0) return text;

  const targetColumns = Array.from({ length: maxBarCount }, (_, idx) => {
    let maxCol = 0;
    for (const positions of barPositionsByLine) {
      if (typeof positions[idx] === 'number') {
        maxCol = Math.max(maxCol, positions[idx]);
      }
    }
    return maxCol;
  });

  const alignedLines = lines.map((line) => {
    if (!hasBarline(line)) return line;

    let rebuilt = '';
    let cursor = 0;
    let barIdx = 0;
    barlineRegex.lastIndex = 0;
    let match;

    while ((match = barlineRegex.exec(line)) !== null) {
      const segment = line.slice(cursor, match.index);
      const segmentTrimmedRight = segment.replace(/[ \t]+$/, '');

      rebuilt += segmentTrimmedRight;
      const needsGapBeforeBar = rebuilt.length > 0 && /[^\s|]$/.test(rebuilt);
      const minTarget = needsGapBeforeBar ? rebuilt.length + 1 : rebuilt.length;
      const target = Math.max(targetColumns[barIdx] ?? minTarget, minTarget);
      if (rebuilt.length < target) {
        rebuilt += ' '.repeat(target - rebuilt.length);
      }

      rebuilt += match[0];
      cursor = match.index + match[0].length;
      barIdx += 1;
    }

    rebuilt += line.slice(cursor);
    return rebuilt;
  });

  return alignedLines.join('\n');
}

/**
 * Pecah baris chord berdasarkan jumlah bar per baris.
 * Cocok untuk rapikan chart menjadi 4 bar per baris.
 *
 * @param {string} text - Teks multiline yang dipilih
 * @param {number} barsPerLine - Jumlah bar per baris
 * @returns {string}
 */
export function wrapBarsPerLine(text, barsPerLine = 4) {
  if (typeof text !== 'string' || !text) return text;

  const normalizedBarsPerLine = Math.max(1, Number(barsPerLine) || 4);
  const barlineRegex = /(\|:|:\||\|\||\|)/g;
  const isBarToken = (token) => /^(\|:|:\||\|\||\|)$/.test(token);
  const hasBarline = (line) => /(\|:|:\||\|\||\|)/.test(line);

  const normalizeBarSpacing = (line) => {
    if (!hasBarline(line)) return line;
    return line
      .replace(/([^\s|])(\|:|:\||\|\||\|)/g, '$1 $2')
      .replace(/(\|:|:\||\|\||\|)([^\s|])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const wrapped = text.split(/\r?\n/).flatMap((line) => {
    const normalized = normalizeBarSpacing(line);
    if (!hasBarline(normalized)) return [line];

    barlineRegex.lastIndex = 0;
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const barIndexes = [];
    tokens.forEach((token, idx) => {
      if (isBarToken(token)) barIndexes.push(idx);
    });

    if (barIndexes.length < 2) return [normalized];

    const firstBar = barIndexes[0];
    const lastBar = barIndexes[barIndexes.length - 1];
    const prefix = tokens.slice(0, firstBar).join(' ');
    const suffix = tokens.slice(lastBar + 1).join(' ');

    const boundaries = barIndexes.map((idx) => tokens[idx]);
    const measures = [];
    for (let i = 0; i < barIndexes.length - 1; i += 1) {
      const start = barIndexes[i];
      const end = barIndexes[i + 1];
      const contentTokens = tokens.slice(start + 1, end);
      measures.push(contentTokens.join(' ').trim());
    }

    if (!measures.length) return [normalized];

    const chunks = [];
    for (let i = 0; i < measures.length; i += normalizedBarsPerLine) {
      const endIdx = Math.min(i + normalizedBarsPerLine - 1, measures.length - 1);
      const lineParts = [boundaries[i]];

      for (let m = i; m <= endIdx; m += 1) {
        if (measures[m]) {
          lineParts.push(measures[m]);
        }
        lineParts.push(boundaries[m + 1]);
      }

      chunks.push(lineParts.join(' ').replace(/\s+/g, ' ').trim());
    }

    if (prefix) {
      chunks[0] = `${prefix} ${chunks[0]}`.trim();
    }
    if (suffix) {
      const lastIdx = chunks.length - 1;
      chunks[lastIdx] = `${chunks[lastIdx]} ${suffix}`.trim();
    }

    return chunks;
  });

  return wrapped.join('\n');
}
/**
 * chordUtils.js
 *
 * Utilitas utama untuk manipulasi dan analisis chord pada aplikasi Ruang Performer.
 *
 * Fitur utama:
 * - Transposisi chord (transposeChord)
 * - Deteksi dan parsing baris chord (isChordLine)
 * - Parsing struktur lagu/section (parseSection)
 * - Analisis dan ekstraksi chord dari lirik (parseChordPro, getAllChords, getChordsByBar)
 * - Mendukung format barline (|, ||, |:, :|) dan compact chord (D..Gm..Bb)
 *
 * Catatan:
 * - Semua deteksi chord mengabaikan barline di awal/akhir/token.
 * - Fungsi-fungsi ini digunakan baik di frontend (ChordDisplay) maupun backend (parsing API).
 *
 * Ekspor utama:
 *   - transposeChord(chord, steps): string
 *   - getNoteIndex(root): number|null
 *   - getTransposeSteps(fromKey, toKey): number
 *   - isChordLine(line): boolean
 *   - parseSection(line): {type, label}|null
 *   - parseChordPro(text): {metadata, lines, structures}
 *   - getAllChords(parsedSong): string[]
 *   - getChordsByBar(parsedSong): string[][]
 */
// parseChordLine dihapus, gunakan isChordLine sebagai pengganti

// Fungsi untuk mendeteksi section/struktur lagu atau instrumen
export function parseSection(line) {
  // Gabungkan deteksi [Section], Section:, [Instrumen], Instrumen: dengan satu regex
  // Contoh cocok: [Intro], Intro:, [Gitar], Gitar:
  const match = line.trim().match(/^(?:\[)?([A-Za-z0-9 .:_\-\+&(),\/']+?)(?:\])?\s*:?\s*$/);
  if (match) {
    const originalLabel = match[1].trim();
    const labelLower = originalLabel.toLowerCase();
    // Daftar kata kunci struktur lagu
    const structureKeywords = ['intro', 'verse', 'chorus', 'bridge', 'outro', 'interlude', 'coda', 'reff', 'refrain', 'pre-chorus', 'solo', 'musik'];
    // Daftar kata kunci instrumen umum per kategori
    const instrumentKeywords = [
      'gitar', 'guitar', 'bass', 'ukulele', 'mandolin',
      'piano', 'keyboard', 'organ', 'synth',
      // Brass section
      'brass', 'horn section', 'horns', 'trombone', 'tuba', 'euphonium', 'cornet',
      'saxophone', 'saksofon', 'saxofon', 'trumpet', 'terompet', 'flute', 'suling', 'clarinet', 'klarinet', 'bansi',
      'violin', 'biola', 'cello', 'kontrabas', 'strings',
      'vokal', 'vocal', 'vocalist', 'vokalist', 'choir', 'vokal grup',
      'drum', 'drums', 'perkusi', 'percussion', 'cajon', 'tamborin', 'marakas', 'rebana'
    ];
    const hasKeywordAsWholeWord = (text, keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = escaped.replace(/\s+/g, '[\\s_-]+');
      return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, 'i').test(text);
    };

    if (labelLower === 'int' || structureKeywords.some(k => hasKeywordAsWholeWord(labelLower, k))) {
      return { type: 'structure', label: originalLabel };
    }
    if (instrumentKeywords.some(k => hasKeywordAsWholeWord(labelLower, k))) {
      return { type: 'instrument', label: originalLabel };
    }
  }

  // Deteksi modulasi/key change
  const modulationMatch = line.trim().match(/^(?:modulation|key\s+change)\s*:\s*(.+)$/i);
  if (modulationMatch) {
    const targetKey = modulationMatch[1].trim();
    return { type: 'modulation', label: targetKey };
  }

  return null;
}
/**
 * Chord Utilities - Professional Implementation
 * Transposition, ChordPro parsing, and chord analysis
 */

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Regex untuk mendeteksi chord (termasuk leading dash untuk passing chord dan trailing dots untuk durasi)
// Support: Am, Gm-Gm, F..D#-D#, Dm..D#..F.., Am...., (Am), [C]
const CHORD_REGEX_GLOBAL = /[\(\[\{]?-?([A-G][#b]?)(maj7|maj9|min7|min9|m|maj|min|dim|aug|sus2|sus4|sus|add9|add)?([0-9]*)?(\/[A-G][#b]?)?(((\.{2,}|-)([A-G][#b]?)(maj7|maj9|min7|min9|m|maj|min|dim|aug|sus2|sus4|sus|add9|add)?([0-9]*)?(\/[A-G][#b]?)?)*)(\.{2,})?[\)\]\}]?/g;

const normalizeChordToken = (token) => {
  if (typeof token !== 'string') return token;
  return token
    .trim()
    .replace(/^[\(\[\{]+/, '')
    .replace(/\.+$/, '')
    .replace(/[\)\]\}]+$/, '');
};

const isChordToken = (token) => {
  if (typeof token !== 'string') return false;
  if (isNoChordToken(token)) return true;
  const normalized = normalizeChordToken(token);
  return CHORD_REGEX.test(normalized);
};

const isLeadingDashChordToken = (token) => {
  if (typeof token !== 'string' || !token.startsWith('-')) return false;
  return CHORD_REGEX.test(token.slice(1).trim());
};

const transposeChordToken = (token, steps) => {
  if (!token || steps === 0) return token;
  if (isNoChordToken(token)) return token;
  const match = token.match(/^([\(\[\{]?)(.+?)([\)\]\}]?)(\.{2,})?$/);
  if (!match) return token;

  const [, prefix = '', inner, suffix = '', dots = ''] = match;
  const normalized = normalizeChordToken(inner);
  if (!CHORD_REGEX.test(normalized)) return token;

  return `${prefix}${transposeChord(normalized, steps)}${suffix}${dots || ''}`;
};

const transposeLeadingDashChordToken = (token, steps) => {
  if (!token || steps === 0 || !token.startsWith('-')) return token;
  const chordToken = token.slice(1).trim();
  if (!CHORD_REGEX.test(chordToken)) return token;
  return `-${transposeChord(chordToken, steps)}`;
};

const transposeCompactChordToken = (token, steps) => {
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
  let transposedBass = '';

  if (bass) {
    const bassMatch = bass.match(/^([A-G][#b]?)(.*)$/);
    if (bassMatch) {
      transposedBass = '/' + transposeNote(bassMatch[1], steps) + bassMatch[2];
    } else {
      transposedBass = '/' + bass;
    }
  }

  return `${transposedRoot}${quality}${transposedBass}`;
};

// Get semitone index for a root note using sharp scale, accepting flats
export const getNoteIndex = (root) => {
  if (!root) return null;
  const r = root.trim();
  let idx = NOTES_SHARP.indexOf(r);
  if (idx === -1) {
    // Map flats to sharps
    const flatToSharp = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    const alt = flatToSharp[r] || r;
    idx = NOTES_SHARP.indexOf(alt);
  }
  return idx === -1 ? null : idx;
};

// Helper to extract root note from key string (e.g., 'Am' -> 'A', 'G#m' -> 'G#')
const extractRoot = (key) => {
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

const getScaleTypeFromKey = (key = 'C') => {
  if (!key) return 'major';
  const normalized = key.trim().toLowerCase();
  if (normalized.endsWith('m') && !normalized.includes('maj')) return 'minor';
  if (normalized.startsWith('m') && normalized.length === 1) return 'minor';
  return 'major';
};

const getScaleDegreeFromRoot = (rootNote, key = 'C', scaleType = 'major') => {
  const root = extractRoot(rootNote);
  const base = extractRoot(key);
  if (!root || !base) return null;

  const rootIdx = getNoteIndex(root);
  const baseIdx = getNoteIndex(base);
  if (rootIdx == null || baseIdx == null) return null;

  const interval = (rootIdx - baseIdx + 12) % 12;
  if (scaleType === 'minor') {
    if (MINOR_SCALE_DEGREES[interval] !== undefined) return MINOR_SCALE_DEGREES[interval];
    if (MINOR_SCALE_ALTERNATE[interval] !== undefined) return MINOR_SCALE_ALTERNATE[interval];
  } else {
    if (MAJOR_SCALE_DEGREES[interval] !== undefined) return MAJOR_SCALE_DEGREES[interval];
    if (MAJOR_SCALE_ALTERNATE[interval] !== undefined) return MAJOR_SCALE_ALTERNATE[interval];
  }
  return null;
};

const normalizeChordQuality = (quality = '') => {
  if (!quality) return '';

  let norm = quality.trim();

  // Change common synonyms
  if (/^maj7?/i.test(norm)) {
    // keep maj7, maj9, maj
    return norm.replace(/^maj/i, 'maj');
  }
  if (/^min/i.test(norm)) {
    return norm.replace(/^min/i, 'm');
  }
  if (/^m(?!aj)/i.test(norm)) {
    return norm.replace(/^m/i, 'm');
  }
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

  // Handle slash bass
  let bassDegree = '';
  const slashMatch = remainder.match(/\/([A-G][#b]?)/);
  if (slashMatch) {
    const bassRoot = slashMatch[1];
    const baseScaleType = getScaleTypeFromKey(key);
    const bassValue = getScaleDegreeFromRoot(bassRoot, key, baseScaleType);
    if (bassValue) {
      bassDegree = '/' + bassValue;
    }
    // Remove bass part from quality
    remainder = remainder.replace(/\/([A-G][#b]?)/, '');
  }

  const quality = normalizeChordQuality(remainder);
  const scaleType = getScaleTypeFromKey(key);
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

// Fungsi untuk mendeteksi apakah sebuah baris adalah baris chord
export const isChordLine = (line) => {
  if (!line.trim()) return false;

  // Remove section label at start (e.g. [Coda])
  let cleanedLine = line.replace(/^\[.+?\]\s*/, '');
  // Remove repeat token (e.g. (2x), (3x))
  cleanedLine = cleanedLine.replace(/\(\d+x\)/g, '').trim();

  // Check for compact chord format with .. separator (e.g., D..Gm..Bb)
  const compactPattern = /^(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/([A-G][#b]?))?)(?:\.\.(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/([A-G][#b]?))?))+$/;
  if (compactPattern.test(cleanedLine.trim())) return true;

  // Tokenisasi: pisahkan berdasarkan spasi, abaikan barline (|, ||, |:, :|)
  const tokens = cleanedLine
    .replace(/\|:|:\||\[\:|\:\]|\|\||\|/g, ' ') // hilangkan barline
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return false;

  // Hitung jumlah token chord (termasuk N.C.) dan token pengisi (hanya . atau -)
  let chordOrFiller = 0;
  for (const t of tokens) {
    if (isChordToken(t) || /^\.*$/.test(t) || /^-+$/.test(t) || isNoChordToken(t)) chordOrFiller++;
  }
  // Jika mayoritas token adalah chord atau filler, anggap baris chord
  if (chordOrFiller > 0 && chordOrFiller >= tokens.length * 0.7) return true;

  // Fallback: coverage karakter chord (lama)
  const matches = [...cleanedLine.matchAll(CHORD_REGEX_GLOBAL)];
  if (matches.length === 0) return false;
  let totalChordLength = 0;
  for (const match of matches) {
    totalChordLength += match[0].length;
  }
  const lineWithoutSpaces = cleanedLine.replace(/\s+/g, '');
  return totalChordLength > 0 && (totalChordLength / lineWithoutSpaces.length) >= 0.5;
};

// Fungsi untuk expand compact chord format (D..Gm..Bb) menjadi format spaced
const expandCompactChords = (line) => {
  // Check if line contains compact format (chord..chord..chord or chord-chord)
  const compactPattern = /(-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?)(?:\.\.|-)/g;

  if (!compactPattern.test(line)) return line;

  // Split by .. or - and join with spaces for proper spacing
  const chords = line.split(/(?:\.\.|-)/).map(c => c.trim()).filter(c => c);
  return chords.join('   '); // Add spacing between chords
};

// Fungsi untuk mengkonversi format standard (chord di atas lirik) ke ChordPro-like format
const parseStandardFormat = (lines) => {
  const parsed = [];
  let currentSection = null;

  const normalizeSection = (name) => {
    const n = name.toLowerCase().replace(/[.:]+$/, ''); // Remove trailing dots/colons
    if (n.includes('intro')) return 'intro';
    if (n.includes('verse')) return 'verse';
    if (n.includes('pre') && n.includes('chorus')) return 'pre-chorus';
    if (n.includes('chorus')) return 'chorus';
    if (n.includes('bridge')) return 'bridge';
    if (n.includes('outro')) return 'outro';
    if (n.includes('coda')) return 'coda';
    if (n.includes('interlude') || n === 'int') return 'interlude';
    if (n.includes('solo')) return 'solo';
    if (n.includes('refrain') || n.includes('reff')) return 'refrain';
    if (n.includes('musik')) return 'musik';
    return null;
  };


  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    if (!currentLine.trim()) {
      parsed.push({ type: 'empty', line: '' });
      continue;
    }

    // Tambahan: Deteksi struktur dengan braket [Section]
    const bracketSectionMatch = currentLine.trim().match(/^\[([A-Za-z0-9 .:-_]+)\]$/);
    if (bracketSectionMatch) {
      const possibleSection = bracketSectionMatch[1].trim();
      const normalizedSectionName = normalizeSection(possibleSection);
      if (normalizedSectionName) {
        if (currentSection) {
          parsed.push({ type: 'structure_end', structure: currentSection });
        }
        parsed.push({ type: 'structure_start', structure: normalizedSectionName });
        currentSection = normalizedSectionName;
        continue;
      }
    }

    // Check for standalone section header (e.g., "Int.", "Intro", "Intro:", "Intro :" on its own line)
    const standaloneSectionMatch = currentLine.trim().match(/^([A-Za-z.]+)\s*:?\s*$/);
    if (standaloneSectionMatch) {
      const possibleSection = standaloneSectionMatch[1].trim();
      const normalizedSectionName = normalizeSection(possibleSection);

      if (normalizedSectionName) {
        if (currentSection) {
          parsed.push({ type: 'structure_end', structure: currentSection });
        }
        parsed.push({ type: 'structure_start', structure: normalizedSectionName });
        currentSection = normalizedSectionName;
        continue;
      }
    }

    // Check for section header with inline chords (e.g., "Int. C G Am", "Int: C G Am", "Int : D..Gm..Bb")
    const sectionWithChordsMatch = currentLine.trim().match(/^([A-Za-z.]+)\s*:?\s+(.+)$/);
    if (sectionWithChordsMatch) {
      const possibleSection = sectionWithChordsMatch[1].trim();
      const possibleChords = sectionWithChordsMatch[2].trim();
      const normalizedSectionName = normalizeSection(possibleSection);

      // If section matches, always treat it as section (even if rest is not chords)
      if (normalizedSectionName) {
        if (currentSection) {
          parsed.push({ type: 'structure_end', structure: currentSection });
        }
        parsed.push({ type: 'structure_start', structure: normalizedSectionName });
        currentSection = normalizedSectionName;

        // Expand compact format if present
        const expandedChords = expandCompactChords(possibleChords);

        // Parse the chord line using CHORD_REGEX_GLOBAL
        const matches = [...expandedChords.matchAll(CHORD_REGEX_GLOBAL)];
        const chords = matches.map(match => ({
          chord: match[0],
          position: match.index + possibleSection.length + 1
        }));

        // Add chord line to parsed
        // Check if next line exists and is lyrics (not chord line, not empty)
        let lyricText = '';
        if (nextLine && nextLine.trim() && !isChordLine(nextLine)) {
          lyricText = nextLine;
          i++; // Skip next line since we consumed it
        }

        parsed.push({
          type: 'line_with_chords',
          chords,
          text: lyricText,
          barText: expandedChords // Preserve bars and chord spacing source
        });
        continue;
      }
    }

    // Deteksi metadata sederhana
    if (currentLine.includes(':') && currentLine.length < 50) {
      const colonIndex = currentLine.indexOf(':');
      const keyRaw = currentLine.substring(0, colonIndex).trim().toLowerCase();
      const value = currentLine.substring(colonIndex + 1).trim();

      const normalizedKey = (() => {
        if (['original key', 'original_key'].includes(keyRaw)) return 'original_key';
        if (keyRaw === 'time signature') return 'time';
        return keyRaw;
      })();

      if (['title', 'artist', 'key', 'tempo', 'time', 'original_key'].includes(normalizedKey)) {
        parsed.push({ type: 'metadata', key: normalizedKey, value });
        continue;
      }

      // Section header detection (e.g., "Verse:", "Chorus:")
      const sectionName = normalizeSection(keyRaw);
      if (sectionName) {
        if (currentSection) {
          parsed.push({ type: 'structure_end', structure: currentSection });
        }
        parsed.push({ type: 'structure_start', structure: sectionName });
        currentSection = sectionName;
        continue;
      }
    }

    // Cek apakah baris ini adalah baris chord
    if (isChordLine(currentLine)) {
      // Expand compact format if present (D..Gm..Bb -> D   Gm   Bb)
      const expandedLine = expandCompactChords(currentLine);

      // Jika ada baris berikutnya dan bukan chord line, gabungkan
      if (nextLine && !isChordLine(nextLine) && nextLine.trim()) {
        // Extract chords using CHORD_REGEX_GLOBAL
        const matches = [...expandedLine.matchAll(CHORD_REGEX_GLOBAL)];
        const chords = matches.map(match => ({
          chord: match[0],
          position: match.index
        }));

        parsed.push({
          type: 'line_with_chords',
          chords,
          text: nextLine,
          barText: expandedLine // Keep expanded chord line for bar detection
        });

        i++; // Skip next line karena sudah diproses
      } else {
        // Chord line tanpa lirik di bawahnya
        const matches = [...expandedLine.matchAll(CHORD_REGEX_GLOBAL)];
        const chords = matches.map(match => ({
          chord: match[0],
          position: match.index
        }));

        parsed.push({
          type: 'line_with_chords',
          chords,
          text: '',
          barText: expandedLine // Use bar markers from expanded chord line
        });
      }
    } else {
      // Baris teks biasa
      parsed.push({
        type: 'text',
        line: currentLine
      });
    }
  }

  if (currentSection) {
    parsed.push({ type: 'structure_end', structure: currentSection });
  }

  return parsed;
};

export const parseChordPro = (text) => {
  // Hanya gunakan format standar (chord di atas lirik, tanpa tag ChordPro)
  if (!text) return { metadata: {}, lines: [], structures: {} };

  const lines = text.split('\n');
  const parsedLines = parseStandardFormat(lines);
  const metadata = {};

  // Extract metadata dari parsed lines
  const contentLines = parsedLines.filter(line => {
    if (line.type === 'metadata') {
      metadata[line.key] = line.value;
      return false;
    }
    return true;
  });

  // Kumpulkan struktur dari parsedLines
  const structures = {};
  let currentStruct = null;
  let structLines = [];
  contentLines.forEach((line) => {
    if (line.type === 'structure_start') {
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = line.structure;
      structLines = [];
    } else if (line.type === 'structure_end') {
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = null;
      structLines = [];
    } else if (currentStruct) {
      structLines.push(line);
    }
  });
  if (currentStruct && structLines.length > 0) {
    structures[currentStruct] = [...structLines];
  }

  return { metadata, lines: contentLines, structures };
};

export const getAllChords = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const chordSet = new Set();

  parsedSong.lines.forEach(line => {
    if (line.type === 'line_with_chords' && line.chords) {
      line.chords.forEach(({ chord }) => {
        // Clean chord: remove passing dash, wrapping parentheses/brackets, and suffix dots.
        const cleanChord = normalizeChordToken(chord.replace(/^-/, ''));
        if (cleanChord) {
          chordSet.add(cleanChord);
        }
      });
    }
  });

  return Array.from(chordSet).sort();
};

// Mengelompokkan chord berdasarkan bar (|) pada setiap baris chord
export const getChordsByBar = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const bars = [];
  parsedSong.lines.forEach(line => {
    if (line.type === 'line_with_chords' && line.barText) {
      // Split berdasarkan bar line
      const barParts = line.barText.split('|').map(part => part.trim()).filter(Boolean);
      barParts.forEach(bar => {
        // Ambil semua chord dalam bar ini
        const chords = [...bar.matchAll(CHORD_REGEX_GLOBAL)].map(match =>
          normalizeChordToken(match[0].replace(/^-/, ''))
        ).filter(Boolean);
        if (chords.length > 0) {
          bars.push(chords);
        }
      });
    }
  });
  return bars;
};

const KEY_SIGNATURE_ACCIDENTALS = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  'C#': 7,
  F: 1,
  Bb: 2,
  Eb: 3,
  Ab: 4,
  Db: 5,
  Gb: 6,
  Cb: 7,
};

const extractChordRoot = (chord) => {
  if (!chord || typeof chord !== 'string') return null;
  const cleanChord = normalizeChordToken(chord.replace(/^-/, ''));
  const match = cleanChord.match(/^([A-G][#b]?)/);
  return match ? match[1] : null;
};

const getPianoPlayabilityBreakdown = (chords = [], steps = 0) => {
  const accidentalChordCount = chords.reduce((count, chord) => {
    const transposedChord = transposeChord(chord, steps);
    const root = extractChordRoot(transposedChord);
    if (!root) return count;

    // Chord dengan accidental cenderung lebih menantang untuk mayoritas pemain piano.
    return /[#b]/.test(root) ? count + 1 : count;
  }, 0);

  return {
    accidentalChordCount,
    totalChords: chords.length,
    chordPenalty: accidentalChordCount * 2,
  };
};

/**
 * Rekomendasi nada dasar yang lebih mudah dimainkan di piano.
 * Menilai kandidat key dari perubahan transpose -6..+6 terhadap kondisi saat ini.
 */
export const recommendPianoFriendlyKey = ({ chords = [], key = '', transpose = 0 } = {}) => {
  if (!Array.isArray(chords) || chords.length === 0) {
    return null;
  }

  const keyMatch = typeof key === 'string' ? key.trim().match(/^([A-G][#b]?)(.*)$/) : null;
  const keyRoot = keyMatch ? keyMatch[1] : null;
  const keySuffix = keyMatch ? keyMatch[2] : '';

  const candidates = [];
  for (let relativeShift = -6; relativeShift <= 6; relativeShift += 1) {
    const totalShift = transpose + relativeShift;
    const transposedKeyRoot = keyRoot ? transposeChord(keyRoot, totalShift) : null;
    const transposedKey = transposedKeyRoot ? `${transposedKeyRoot}${keySuffix}` : null;

    const breakdown = getPianoPlayabilityBreakdown(chords, totalShift);
    const chordPenalty = breakdown.chordPenalty;
    const keyPenalty = transposedKeyRoot
      ? (KEY_SIGNATURE_ACCIDENTALS[transposedKeyRoot] || 0) * 0.75
      : 0;

    candidates.push({
      relativeShift,
      totalShift,
      key: transposedKey,
      chordPenalty,
      keyPenalty,
      accidentalChordCount: breakdown.accidentalChordCount,
      totalChords: breakdown.totalChords,
      score: chordPenalty + keyPenalty,
    });
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return Math.abs(a.relativeShift) - Math.abs(b.relativeShift);
  });

  const best = candidates[0];
  const current = candidates.find((candidate) => candidate.relativeShift === 0);
  const improvement = current ? Math.max(0, current.score - best.score) : 0;

  return {
    recommendedKey: best.key,
    transposeFromCurrent: best.relativeShift,
    score: best.score,
    improvement,
    accidentalChordCount: best.accidentalChordCount,
    totalChords: best.totalChords,
    keyAccidentalCount: best.key ? (KEY_SIGNATURE_ACCIDENTALS[extractChordRoot(best.key)] || 0) : 0,
  };
};