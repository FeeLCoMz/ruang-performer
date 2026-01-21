/**
 * Chord Utilities - Professional Implementation
 * Transposition, ChordPro parsing, and chord analysis
 */

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Regex untuk mendeteksi chord (termasuk leading dash untuk passing chord dan trailing dots untuk durasi)
const CHORD_REGEX_GLOBAL = /-?([A-G][#b]?)(maj7|maj9|min7|min9|m|maj|min|dim|aug|sus2|sus4|sus|add9|add)?([0-9]*)?(\/[A-G][#b]?)?(\.+)?/g;

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

// Calculate semitone steps needed to transpose fromKey -> toKey
export const getTransposeSteps = (fromKey, toKey) => {
  const fromIdx = getNoteIndex(fromKey);
  const toIdx = getNoteIndex(toKey);
  if (fromIdx == null || toIdx == null) return 0;
  let steps = toIdx - fromIdx;
  if (steps > 6) steps -= 12;
  if (steps < -6) steps += 12;
  return steps;
};

// Fungsi untuk mendeteksi apakah sebuah baris adalah baris chord
const isChordLine = (line) => {
  if (!line.trim()) return false;

  // Check for compact chord format with .. separator (e.g., D..Gm..Bb)
  const compactPattern = /^(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?)(?:\.\.(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?))+$/;
  if (compactPattern.test(line.trim())) return true;

  // Try to extract all chords using CHORD_REGEX_GLOBAL
  const matches = [...line.matchAll(CHORD_REGEX_GLOBAL)];

  if (matches.length === 0) return false;

  // Calculate how much of the line is covered by chords
  let totalChordLength = 0;
  for (const match of matches) {
    totalChordLength += match[0].length;
  }

  // Remove spaces to get actual character count
  const lineWithoutSpaces = line.replace(/\s+/g, '');

  // If more than 50% of non-space characters are chords, treat as chord line
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

      if (['title', 'artist', 'key', 'tempo', 'capo', 'time', 'original_key'].includes(normalizedKey)) {
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
  if (!text) return { metadata: {}, lines: [], structures: {} };

  const lines = text.split('\n');

  // Deteksi format: cek apakah ada ChordPro markup
  const hasChordProMarkup = lines.some(line =>
    line.includes('[') && line.includes(']') ||
    line.match(/^\{[^}]+\}/)
  );

  // Jika tidak ada markup ChordPro, gunakan parser standard format
  if (!hasChordProMarkup) {
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
  }

  // Parse ChordPro format
  const parsed = [];
  const metadata = {};
  const structures = {};
  let currentStruct = null;
  let structLines = [];

  for (let line of lines) {
    if (!line.trim()) {
      parsed.push({ type: 'empty', line: '' });
      if (currentStruct) structLines.push({ type: 'empty', line: '' });
      continue;
    }

    // Check for plain text metadata format (e.g., "Original Key: G")
    const plainMetaMatch = line.match(/^(Original Key|Capo|Time Signature|Duration|BPM|Tempo):\s*(.+)$/i);
    if (plainMetaMatch) {
      const [, key, value] = plainMetaMatch;
      const keyNormalized = key.trim().toLowerCase().replace(/\s+/g, '_');
      metadata[keyNormalized] = value.trim();
      // Also render it as a comment so it appears in the display
      const commentObj = { type: 'comment', text: `${key}: ${value.trim()}` };
      parsed.push(commentObj);
      if (currentStruct) structLines.push(commentObj);
      continue;
    }

    const metaMatch = line.match(/^\{([^:}]+):\s*([^}]+)\}/);
    if (metaMatch) {
      const [, key, value] = metaMatch;
      const keyLower = key.trim().toLowerCase();
      const val = value.trim();
      // Treat {comment: ...} (and {c: ...}) as renderable comment lines
      if (keyLower === 'comment' || keyLower === 'c') {
        const commentObj = { type: 'comment', text: val };
        parsed.push(commentObj);
        if (currentStruct) structLines.push(commentObj);
      } else {
        metadata[key] = val;
      }
      continue;
    }

    const structureStartMatch = line.match(/^\{start_of_([^}]+)\}/);
    if (structureStartMatch) {
      parsed.push({
        type: 'structure_start',
        structure: structureStartMatch[1]
      });
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = structureStartMatch[1];
      structLines = [];
      continue;
    }

    const structureEndMatch = line.match(/^\{end_of_([^}]+)\}/);
    if (structureEndMatch) {
      parsed.push({
        type: 'structure_end',
        structure: structureEndMatch[1]
      });
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = null;
      structLines = [];
      continue;
    }

    const chordMatches = [...line.matchAll(/\[([^\]]+)\]/g)];

    if (chordMatches.length > 0) {
      const chords = chordMatches.map(m => ({
        chord: m[1],
        position: m.index
      }));

      const textLine = line.replace(/\[([^\]]+)\]/g, '');
      const chordObj = {
        type: 'line_with_chords',
        chords,
        text: textLine
      };
      parsed.push(chordObj);
      if (currentStruct) structLines.push(chordObj);
    } else {
      const textObj = {
        type: 'text',
        line
      };
      parsed.push(textObj);
      if (currentStruct) structLines.push(textObj);
    }
  }

  if (currentStruct && structLines.length > 0) {
    structures[currentStruct] = [...structLines];
  }

  return { metadata, lines: parsed, structures };
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