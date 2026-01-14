/**
 * Keyboard Voicing Utilities
 * Generate voicing options for keyboardists
 */

// Note to MIDI mapping for octave calculation
const noteToMidi = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

const midiToNote = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
};

// Semitone intervals from root
const chordIntervals = {
  // Triads
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  
  // Sevenths
  'maj7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  
  // Sixths
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  
  // Ninths
  '9': [0, 4, 7, 10, 14],
  'maj9': [0, 4, 7, 11, 14],
  'm9': [0, 3, 7, 10, 14],
  
  // Extensions
  '11': [0, 4, 7, 10, 17],
  '13': [0, 4, 7, 10, 21],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
};

// Parse chord string into root and type
function parseChord(chordStr) {
  if (!chordStr) return null;
  
  const match = chordStr.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  
  const [, root, type] = match;
  return { root, type: type || 'major' };
}

// Get semitone value
function getSemitone(note) {
  const base = noteToMidi[note.charAt(0)] || 0;
  if (note.includes('#')) return base + 1;
  if (note.includes('b')) return base - 1;
  return base;
}

// Generate notes for voicing (returns note names with octaves)
function generateVoicing(root, intervals, startOctave = 4) {
  const rootMidi = getSemitone(root);
  const notes = [];
  
  intervals.forEach(interval => {
    const midi = (rootMidi + interval) % 12;
    const octaveOffset = Math.floor((rootMidi + interval) / 12);
    const noteName = midiToNote[midi];
    const octave = startOctave + octaveOffset;
    notes.push(`${noteName}${octave}`);
  });
  
  return notes;
}

// Get chord intervals
function getChordIntervals(chordStr) {
  const parsed = parseChord(chordStr);
  if (!parsed) return chordIntervals.major;
  
  return chordIntervals[parsed.type] || chordIntervals.major;
}

// Generate root position voicing
function getRootPosition(chordStr, startOctave = 4) {
  const parsed = parseChord(chordStr);
  if (!parsed) return [];
  
  const intervals = getChordIntervals(chordStr);
  return generateVoicing(parsed.root, intervals, startOctave);
}

// Generate shell voicing (root, 3rd, 7th only for jazz)
function getShellVoicing(chordStr, startOctave = 4) {
  const parsed = parseChord(chordStr);
  if (!parsed) return [];
  
  const fullIntervals = getChordIntervals(chordStr);
  
  // Take root (0), 3rd (index 1), and 7th if exists
  let shellIntervals = [fullIntervals[0], fullIntervals[1]];
  
  // Add 7th if chord has it
  if (fullIntervals.length >= 4) {
    shellIntervals.push(fullIntervals[3]);
  }
  
  return generateVoicing(parsed.root, shellIntervals, startOctave);
}

// Generate left hand (bass) + right hand voicing
function getLeftHandVoicing(chordStr, rightHandOctave = 4) {
  const parsed = parseChord(chordStr);
  if (!parsed) return { left: [], right: [] };
  
  const intervals = getChordIntervals(chordStr);
  const bass = `${parsed.root}2`; // Bass note usually in octave 2
  
  // Right hand is full chord starting at given octave (skip root, it's in bass)
  const rightIntervals = intervals.slice(1); // Skip root
  const right = generateVoicing(parsed.root, rightIntervals, rightHandOctave);
  
  return {
    left: [bass],
    right: right,
    description: `Left: ${bass} | Right: ${right.join(' ')}`
  };
}

// Generate upper structure (inverted voicing for bright sound)
function getUpperStructure(chordStr, startOctave = 4) {
  const parsed = parseChord(chordStr);
  if (!parsed) return [];
  
  const intervals = getChordIntervals(chordStr);
  
  // Invert so highest note becomes root
  const inverted = intervals.map(i => i + 12).sort((a, b) => a - b);
  return generateVoicing(parsed.root, inverted, startOctave);
}

// Check if note is in keyboard range (A0 = 21, C8 = 108)
function isInRange(note) {
  const match = note.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) return true;
  
  const [, noteName, octave] = match;
  const midiBase = noteToMidi[noteName.charAt(0)];
  const offset = noteName.includes('#') ? 1 : (noteName.includes('b') ? -1 : 0);
  const midiValue = (parseInt(octave) + 1) * 12 + midiBase + offset;
  
  return midiValue >= 21 && midiValue <= 108; // 88-key keyboard range
}

// Get all voicing options
export function getVoicingOptions(chordStr, baseOctave = 4) {
  if (!chordStr) return null;
  
  return {
    chord: chordStr,
    voicings: {
      'Root Position': {
        notes: getRootPosition(chordStr, baseOctave),
        description: 'Full chord, most recognizable'
      },
      'Shell (Jazz)': {
        notes: getShellVoicing(chordStr, baseOctave),
        description: 'Root, 3rd, 7th only - spacious jazz voicing'
      },
      'Left Hand Bass': {
        ...getLeftHandVoicing(chordStr, baseOctave),
        description: 'Bass in left hand, chord in right'
      },
      'Upper Structure': {
        notes: getUpperStructure(chordStr, baseOctave),
        description: 'Bright, inverted voicing'
      }
    }
  };
}

// Suggest best voicing based on context
export function suggestVoicing(chordStr, prevChord = null, styleHint = 'pop') {
  const voicings = getVoicingOptions(chordStr);
  
  if (!voicings) return null;
  
  // For jazz, prefer shell voicing
  if (styleHint === 'jazz') {
    return {
      recommended: 'Shell (Jazz)',
      notes: voicings.voicings['Shell (Jazz)'].notes
    };
  }
  
  // For pop/rock, use root position
  return {
    recommended: 'Root Position',
    notes: voicings.voicings['Root Position'].notes
  };
}

// Check if all notes in voicing are in range
export function checkVoicingRange(notes) {
  return {
    inRange: notes.every(isInRange),
    outOfRangeNotes: notes.filter(n => !isInRange(n))
  };
}

// Get comfortable octave for chord (not too high, not too low)
export function getComfortableOctave(chordStr) {
  // Default to octave 4 (middle C range) which is comfortable for both hands
  return 4;
}

// Transpose voicing to new key
export function transposeVoicing(notes, semitones) {
  return notes.map(note => {
    const match = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) return note;
    
    const [, noteName, octave] = match;
    const baseMidi = getSemitone(noteName);
    const newMidi = (baseMidi + semitones) % 12;
    const octaveOffset = Math.floor((baseMidi + semitones) / 12);
    const newNoteName = midiToNote[newMidi < 0 ? newMidi + 12 : newMidi];
    
    return `${newNoteName}${parseInt(octave) + octaveOffset}`;
  });
}

export default {
  parseChord,
  getVoicingOptions,
  suggestVoicing,
  checkVoicingRange,
  getComfortableOctave,
  transposeVoicing,
  getRootPosition,
  getShellVoicing,
  getLeftHandVoicing,
  getUpperStructure
};
