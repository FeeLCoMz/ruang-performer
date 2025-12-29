import React from 'react';
import { 
  parseMelodyString, 
  getScaleDegreeName, 
  degreeToStaffPosition,
  formatNoteDisplay,
  transposeMelody
} from '../utils/musicNotationUtils';

const SheetMusicDisplay = ({ melody, notationType = 'numeric', transpose = 0 }) => {
  if (!melody) return null;

  // Parse melody string to notes array
  const notes = parseMelodyString(melody);
  const transposedNotes = transposeMelody(notes, transpose);
  
  if (notes.length === 0) {
    return (
      <div className="no-melody-message">
        <p>📝 Belum ada melodi. Tambahkan melodi not angka pada form edit lagu.</p>
        <p className="example">Contoh: 1 2 3 4 | 5 5 6 5 | 4 3 2 1 |</p>
      </div>
    );
  }

  // Render numeric notation (not angka)
  const renderNumericNotation = () => {
    // Group notes by bars
    const bars = [];
    let currentBar = [];
    let lastBar = -1;
    
    transposedNotes.forEach(note => {
      if (note.bar !== lastBar && currentBar.length > 0) {
        bars.push([...currentBar]);
        currentBar = [];
      }
      currentBar.push(note);
      lastBar = note.bar;
    });
    if (currentBar.length > 0) {
      bars.push(currentBar);
    }

    return (
      <div className="numeric-notation">
        <div className="notation-header">Not Angka</div>
        <div className="melody-bars">
          {bars.map((bar, barIndex) => (
            <div key={barIndex} className="melody-bar">
              {bar.map((note, noteIndex) => {
                const isRest = note.type === 'rest';
                const displayValue = formatNoteDisplay(note);
                const solfege = isRest ? 'rest' : getScaleDegreeName(note.degree);
                
                return (
                  <div key={noteIndex} className={`melody-note ${isRest ? 'rest' : ''}`}>
                    <div className="note-value">{displayValue}</div>
                    <div className="solfege-name">{solfege}</div>
                  </div>
                );
              })}
              <div className="bar-separator">|</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render staff notation (not balok)
  const renderStaffNotation = () => {
    return (
      <div className="staff-notation">
        <div className="notation-header">Not Balok</div>
        <div className="staff-container">
          {/* Treble Clef */}
          <div className="clef">𝄞</div>
          
          {/* Staff lines */}
          <div className="staff-lines">
            {[0, 1, 2, 3, 4].map(line => (
              <div key={line} className="staff-line"></div>
            ))}
            
            {/* Notes */}
            <div className="notes-container">
              {transposedNotes.map((note, index) => {
                if (note.type === 'rest') {
                  return (
                    <div key={index} className="note-wrapper">
                      <div className="rest-symbol" style={{ top: '50%' }}>𝄽</div>
                    </div>
                  );
                }
                
                const position = degreeToStaffPosition(note.degree, note.octave);
                
                // Calculate vertical position
                // line 0 = top space, increasing numbers go down
                const topPosition = 10 + (6 - position.line) * 10;
                
                // Note head shape based on duration
                let noteHead = '●'; // Quarter note
                if (note.duration >= 4) {
                  noteHead = '○'; // Whole note
                } else if (note.duration >= 2) {
                  noteHead = '◐'; // Half note
                }
                
                return (
                  <div key={index} className="note-wrapper">
                    <div 
                      className="note" 
                      style={{ top: `${topPosition}%` }}
                      title={formatNoteDisplay(note)}
                    >
                      {note.accidental && (
                        <span className="accidental">{note.accidental}</span>
                      )}
                      <span className="note-head">{noteHead}</span>
                      {note.duration > 1 && note.duration < 4 && (
                        <span className="stem">|</span>
                      )}
                    </div>
                    <div className="note-label-small">{note.degree}{note.octave < 0 ? '.' : note.octave > 0 ? "'" : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render both notations side by side
  const renderBothNotations = () => {
    return (
      <div className="both-notations">
        {renderNumericNotation()}
        {renderStaffNotation()}
      </div>
    );
  };

  if (notationType === 'numeric') {
    return renderNumericNotation();
  } else if (notationType === 'staff') {
    return renderStaffNotation();
  } else {
    return renderBothNotations();
  }
};

export default SheetMusicDisplay;
