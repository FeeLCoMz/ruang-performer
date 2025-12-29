// Music Notation Utilities
// Parse and display melody notation (not angka and staff notation)

/**
 * Parse melody string in numeric notation format
 * Format: "1 2 3 4 | 5 5 6 5 | 4 3 2 1 |"
 * - Numbers 1-7 represent scale degrees
 * - . after number means lower octave (1.)
 * - ' after number means higher octave (1')
 * - - after number means longer duration (1--, 1---)
 * - # or b for accidentals (1#, 2b)
 * - m for minor quality (1m)
 * - | for bar lines
 * 
 * @param {string} melodyString - Melody in numeric notation
 * @returns {array} - Array of note objects
 */
export function parseMelodyString(melodyString) {
  if (!melodyString) return [];
  
  const notes = [];
  const bars = melodyString.split('|');
  
  bars.forEach((bar, barIndex) => {
    const noteTokens = bar.trim().split(/\s+/).filter(token => token);
    
    noteTokens.forEach((token, noteIndex) => {
      if (!token) return;
      
      // Parse note components
      const match = token.match(/^([1-7])([#b]?)([\.']*)([-]*)(m?)$/);
      
      if (match) {
        const [, degree, accidental, octave, duration, quality] = match;
        
        let octaveShift = 0;
        if (octave.includes('.')) octaveShift = -1;
        if (octave.includes("'")) octaveShift = 1;
        
        const durationLength = duration.length + 1; // Base duration is 1
        
        notes.push({
          degree: parseInt(degree),
          accidental: accidental || '',
          octave: octaveShift,
          duration: durationLength,
          quality: quality || '',
          bar: barIndex,
          position: noteIndex,
          token: token
        });
      } else if (token === '-' || token === '_') {
        // Rest
        notes.push({
          type: 'rest',
          duration: 1,
          bar: barIndex,
          position: noteIndex,
          token: token
        });
      }
    });
  });
  
  return notes;
}

/**
 * Get scale degree name (do, re, mi, fa, sol, la, si)
 * @param {number} degree - Scale degree (1-7)
 * @returns {string} - Scale degree name
 */
export function getScaleDegreeName(degree) {
  const names = ['', 'do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
  return names[degree] || '';
}

/**
 * Convert numeric degree to staff position
 * @param {number} degree - Scale degree (1-7)
 * @param {number} octave - Octave shift (-1, 0, 1)
 * @returns {object} - Staff position data
 */
export function degreeToStaffPosition(degree, octave = 0) {
  // Base positions for middle octave (C major scale)
  const basePositions = {
    1: 0,  // C
    2: 1,  // D
    3: 2,  // E
    4: 3,  // F
    5: 4,  // G
    6: 5,  // A
    7: 6   // B
  };
  
  const basePosition = basePositions[degree] || 0;
  const position = basePosition + (octave * 7);
  
  return {
    line: position,
    degree: degree
  };
}

/**
 * Transpose melody notes
 * @param {array} notes - Array of note objects
 * @param {number} semitones - Number of semitones to transpose
 * @returns {array} - Transposed notes
 */
export function transposeMelody(notes, semitones) {
  if (!semitones || semitones === 0) return notes;
  
  return notes.map(note => {
    if (note.type === 'rest') return note;
    
    // Simple transposition within the scale
    let newDegree = note.degree + Math.floor(semitones / 2);
    let newOctave = note.octave;
    
    while (newDegree > 7) {
      newDegree -= 7;
      newOctave += 1;
    }
    while (newDegree < 1) {
      newDegree += 7;
      newOctave -= 1;
    }
    
    return {
      ...note,
      degree: newDegree,
      octave: newOctave
    };
  });
}

/**
 * Format note for display (with octave markers)
 * @param {object} note - Note object
 * @returns {string} - Formatted note string
 */
export function formatNoteDisplay(note) {
  if (note.type === 'rest') return '-';
  
  let display = note.degree.toString();
  
  if (note.accidental) {
    display += note.accidental;
  }
  
  if (note.octave < 0) {
    display += '.'.repeat(Math.abs(note.octave));
  } else if (note.octave > 0) {
    display += "'".repeat(note.octave);
  }
  
  if (note.duration > 1) {
    display += '-'.repeat(note.duration - 1);
  }
  
  if (note.quality) {
    display += note.quality;
  }
  
  return display;
}
