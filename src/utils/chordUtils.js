/**
 * Mem-parse array baris lirik menjadi struktur token untuk rendering.
 * @param {string[]} lines - Array baris lirik
 * @param {number} transpose - Jumlah transposisi chord
 * @returns {Array} Array objek baris terstruktur
 */
export function parseLines(lines, transpose) {
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'empty' };
    const section = parseSection(line);
    if (section) return { type: section.type, label: section.label };
    if (isChordLine(line)) {
      // Token chord (dengan transpose jika perlu)
      return {
        type: 'chord',
        tokens: line.split(/(\s+)/).map(token =>
          /^\s+$/.test(token)
            ? { token, isSpace: true }
            : { token: transpose ? transposeChord(token, transpose) : token, isChord: true }
        )
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
    // Baris lirik: tokenisasi, deteksi chord/angka/timestamp inline
    return {
      type: 'lyrics',
      tokens: line.split(/(\s+)/).map(token => {
        if (/^\s+$/.test(token)) return { token, isSpace: true };
        if (isChordLine(token)) return { token: transpose ? transposeChord(token, transpose) : token, isChord: true };
        if (parseNumberLine(token)) return { token, isNumber: true };
        return { token };
      })
    };
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

/**
 * Validasi apakah sebuah token adalah chord valid.
 * @param {string} chord - Token chord (misal: Am, F#m7, Bbmaj7, G/B)
 * @returns {boolean}
 */
export function isValidChord(chord) {
  if (typeof chord !== 'string') return false;
  return CHORD_REGEX.test(chord.trim());
}

// ...existing code...

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
  const match = line.trim().match(/^(?:\[)?([A-Za-z0-9 .:_-]+?)(?:\])?\s*:?\s*$/);
  if (match) {
    const originalLabel = match[1].trim();
    const labelLower = originalLabel.toLowerCase();
    // Daftar kata kunci struktur lagu
    const structureKeywords = ['intro', 'verse', 'chorus', 'bridge', 'outro', 'interlude', 'reff', 'pre-chorus'];
    // Daftar kata kunci instrumen umum per kategori
    const instrumentKeywords = [
      'gitar', 'guitar', 'bass', 'ukulele', 'mandolin',
      'piano', 'keyboard', 'organ', 'synth',
      // Brass section
      'brass', 'horn section', 'horns', 'trombone', 'tuba', 'euphonium', 'cornet',
      'saxophone', 'saksofon', 'saxofon', 'trumpet', 'terompet', 'flute', 'suling', 'clarinet', 'klarinet',
      'violin', 'biola', 'cello', 'kontrabas', 'strings',
      'vokal', 'vocal', 'vocalist', 'vokalist', 'choir', 'vokal grup',
      'drum', 'drums', 'perkusi', 'percussion', 'cajon', 'tamborin', 'marakas', 'rebana'
    ];
    if (structureKeywords.some(k => labelLower.includes(k))) {
      return { type: 'structure', label: originalLabel };
    }
    if (instrumentKeywords.some(k => labelLower.includes(k))) {
      return { type: 'instrument', label: originalLabel };
    }
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
// Support: Am, Gm-Gm, F..D#-D#, Dm..D#..F.., Am....
const CHORD_REGEX_GLOBAL = /-?([A-G][#b]?)(maj7|maj9|min7|min9|m|maj|min|dim|aug|sus2|sus4|sus|add9|add)?([0-9]*)?(\/[A-G][#b]?)?(((\.{2,}|-)([A-G][#b]?)(maj7|maj9|min7|min9|m|maj|min|dim|aug|sus2|sus4|sus|add9|add)?([0-9]*)?(\/[A-G][#b]?)?)*)(\.{2,})?/g;

export const transposeChord = (chord, steps) => {
  if (!chord || steps === 0) return chord;

  const chordRegex = /^([A-G][#b]?)(.*)/;
  const match = chord.match(chordRegex);

  if (!match) return chord;

  const [, root, suffix] = match;
  const useFlat = root.includes('b');
  const noteArray = useFlat ? NOTES_FLAT : NOTES_SHARP;

  let index = noteArray.indexOf(root);
  if (index === -1) {
    const altArray = useFlat ? NOTES_SHARP : NOTES_FLAT;
    index = altArray.indexOf(root);
    if (index === -1) return chord;
  }

  let newIndex = (index + steps) % 12;
  if (newIndex < 0) newIndex += 12;

  return noteArray[newIndex] + suffix;
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

// Calculate semitone steps needed to transpose fromKey -> toKey (root only)
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

  // Tokenisasi: pisahkan berdasarkan spasi
  const tokens = cleanedLine.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;

  // Hitung jumlah token chord dan token pengisi (hanya . atau -)
  let chordOrFiller = 0;
  for (const t of tokens) {
    if (CHORD_REGEX.test(t) || /^\.*$/.test(t) || /^-+$/.test(t)) chordOrFiller++;
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
  // Check if line contains compact format (chord..chord..chord)
  const compactPattern = /(-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?)(\.\.)/g;

  if (!compactPattern.test(line)) return line;

  // Split by .. and join with spaces for proper spacing
  const chords = line.split('..').map(c => c.trim()).filter(c => c);
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
        // Clean chord: remove prefix dash (passing chord) and suffix dots (duration)
        const cleanChord = chord.replace(/^-/, '').replace(/\.+$/, '');
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
          match[0].replace(/^-/, '').replace(/\.+$/, '')
        ).filter(Boolean);
        if (chords.length > 0) {
          bars.push(chords);
        }
      });
    }
  });
  return bars;
};