/**
 * Chord Utilities - Professional Implementation
 * Transposition, ChordPro parsing, and chord analysis
 */

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Regex untuk mendeteksi chord
const CHORD_REGEX = /^([A-G][#b]?)(m|maj|min|dim|aug|sus|add)?([0-9]*)?(\/[A-G][#b]?)?$/;

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
  
  // Split berdasarkan whitespace
  const tokens = line.trim().split(/\s+/);
  
  // Jika tidak ada token atau terlalu banyak kata, bukan chord line
  if (tokens.length === 0 || tokens.length > 15) return false;
  
  // Hitung berapa banyak token yang merupakan chord
  let chordCount = 0;
  for (const token of tokens) {
    if (CHORD_REGEX.test(token)) {
      chordCount++;
    }
  }
  
  // Jika lebih dari 50% adalah chord, anggap sebagai chord line
  return chordCount > 0 && (chordCount / tokens.length) >= 0.5;
};

// Fungsi untuk mengkonversi format standard (chord di atas lirik) ke ChordPro-like format
const parseStandardFormat = (lines) => {
  const parsed = [];
  let currentSection = null;

  const normalizeSection = (name) => {
    const n = name.toLowerCase().trim();
    // Handle abbreviations
    const abbrevMap = {
      'int': 'intro',
      'ver': 'verse',
      'pre': 'pre-chorus',
      'cho': 'chorus',
      'ch': 'chorus',
      'bri': 'bridge',
      'brig': 'bridge',
      'out': 'outro',
      'sol': 'solo',
      'ref': 'refrain',
      'inter': 'interlude'
    };
    
    if (abbrevMap[n]) return abbrevMap[n];
    
    if (n.includes('intro')) return 'intro';
    if (n.includes('verse')) return 'verse';
    if (n.includes('pre') && n.includes('chorus')) return 'pre-chorus';
    if (n.includes('chorus')) return 'chorus';
    if (n.includes('bridge')) return 'bridge';
    if (n.includes('outro')) return 'outro';
    if (n.includes('interlude')) return 'interlude';
    if (n.includes('solo')) return 'solo';
    if (n.includes('refrain')) return 'refrain';
    return null;
  };

  const extractChordWithDots = (text) => {
    // Parse chords with optional dots for duration (e.g., "G..", "G..C..", "G..C")
    const chordTokenPattern = '[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:/[A-G][#b]?)?';
    const chordWithDotsRegex = new RegExp(`(${chordTokenPattern})+(\\.*)`, 'gi');
    const chords = [];
    let position = 0;
    
    for (const match of text.matchAll(chordWithDotsRegex)) {
      const chord = match[0].replace(/\.+$/, '').trim(); // Remove trailing dots
      if (chord && /^[A-G]/.test(chord)) {
        chords.push({
          chord,
          position: position,
          duration: (match[0].match(/\.+$/) || [''])[0].length
        });
        position += match[0].length + 1;
      }
    }
    return chords.length > 0 ? chords : null;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    
    if (!currentLine.trim()) {
      parsed.push({ type: 'empty', line: '' });
      continue;
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

      // Section header detection (e.g., "Verse:", "Chorus:", or "Intro: G..")
      const sectionName = normalizeSection(keyRaw);
      if (sectionName) {
        if (currentSection) {
          parsed.push({ type: 'structure_end', structure: currentSection });
        }
        parsed.push({ type: 'structure_start', structure: sectionName });
        currentSection = sectionName;
        
        // Check if there are chords after the colon (e.g., "Intro: G..")
        if (value.trim()) {
          const chords = extractChordWithDots(value);
          if (chords) {
            parsed.push({
              type: 'line_with_chords',
              chords,
              text: ''
            });
          }
        }
        continue;
      }
    }

    // Check for abbreviated section headers without colon (e.g., "Int. G..C..")
    // Pattern: abbreviation with optional dot, then space(s), then chords
    const abbrevMatch = currentLine.match(/^([a-z]+)\.?\s+(.+)$/i);
    if (abbrevMatch) {
      const abbrevName = abbrevMatch[1].toLowerCase();
      const sectionName = normalizeSection(abbrevName);
      if (sectionName) {
        const remainder = abbrevMatch[2].trim();
        if (currentSection && sectionName !== currentSection) {
          parsed.push({ type: 'structure_end', structure: currentSection });
        }
        parsed.push({ type: 'structure_start', structure: sectionName });
        currentSection = sectionName;
        
        // Check if there are chords in the remainder (e.g., "Int. G..C..")
        if (remainder) {
          const chords = extractChordWithDots(remainder);
          if (chords) {
            parsed.push({
              type: 'line_with_chords',
              chords,
              text: ''
            });
          } else if (!isChordLine(remainder)) {
            // If not chords, treat as text
            parsed.push({ type: 'text', line: remainder });
          }
        }
        continue;
      }
    }
    
    // Cek apakah baris ini adalah baris chord
    if (isChordLine(currentLine)) {
      // Jika ada baris berikutnya dan bukan chord line, gabungkan
      if (nextLine && !isChordLine(nextLine) && nextLine.trim()) {
        const chords = [];
        const tokens = currentLine.split(/(\s+)/);
        let position = 0;
        
        for (const token of tokens) {
          if (token.trim() && CHORD_REGEX.test(token.trim())) {
            chords.push({
              chord: token.trim(),
              position: position
            });
          }
          position += token.length;
        }
        
        parsed.push({
          type: 'line_with_chords',
          chords,
          text: nextLine
        });
        
        i++; // Skip next line karena sudah diproses
      } else {
        // Chord line tanpa lirik di bawahnya
        const chords = [];
        const tokens = currentLine.split(/(\s+)/);
        let position = 0;
        
        for (const token of tokens) {
          if (token.trim() && CHORD_REGEX.test(token.trim())) {
            chords.push({
              chord: token.trim(),
              position: position
            });
          }
          position += token.length;
        }
        
        parsed.push({
          type: 'line_with_chords',
          chords,
          text: ''
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
  if (!text) return { metadata: {}, lines: [], format: 'unknown' };
  
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
    
    return { metadata, lines: contentLines, format: 'standard' };
  }
  
  // Parse ChordPro format
  const parsed = [];
  const metadata = {};
  
  for (let line of lines) {
    if (!line.trim()) {
      parsed.push({ type: 'empty', line: '' });
      continue;
    }
    
    // Check for plain text metadata format (e.g., "Original Key: G")
    const plainMetaMatch = line.match(/^(Original Key|Capo|Time Signature|Duration|BPM|Tempo):\s*(.+)$/i);
    if (plainMetaMatch) {
      const [, key, value] = plainMetaMatch;
      const keyNormalized = key.trim().toLowerCase().replace(/\s+/g, '_');
      metadata[keyNormalized] = value.trim();
      // Also render it as a comment so it appears in the display
      parsed.push({ type: 'comment', text: `${key}: ${value.trim()}` });
      continue;
    }
    
    const metaMatch = line.match(/^\{([^:}]+):\s*([^}]+)\}/);
    if (metaMatch) {
      const [, key, value] = metaMatch;
      const keyLower = key.trim().toLowerCase();
      const val = value.trim();
      // Treat {comment: ...} (and {c: ...}) as renderable comment lines
      if (keyLower === 'comment' || keyLower === 'c') {
        parsed.push({ type: 'comment', text: val });
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
      continue;
    }
    
    const structureEndMatch = line.match(/^\{end_of_([^}]+)\}/);
    if (structureEndMatch) {
      parsed.push({
        type: 'structure_end',
        structure: structureEndMatch[1]
      });
      continue;
    }
    
    const chordMatches = [...line.matchAll(/\[([^\]]+)\]/g)];
    
    if (chordMatches.length > 0) {
      const chords = chordMatches.map(m => ({
        chord: m[1],
        position: m.index
      }));
      
      const textLine = line.replace(/\[([^\]]+)\]/g, '');
      
      parsed.push({
        type: 'line_with_chords',
        chords,
        text: textLine
      });
    } else {
      parsed.push({
        type: 'text',
        line
      });
    }
  }
  
  return { metadata, lines: parsed, format: 'chordpro' };
};

export const getAllChords = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];
  
  const chordSet = new Set();
  
  parsedSong.lines.forEach(line => {
    if (line.type === 'line_with_chords' && line.chords) {
      line.chords.forEach(({ chord }) => chordSet.add(chord));
    }
  });
  
  return Array.from(chordSet).sort();
};
