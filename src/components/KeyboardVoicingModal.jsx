import React, { useState } from 'react';
import { getVoicingOptions, checkVoicingRange } from '../utils/keyboardVoicing';


const KeyboardVoicingModal = ({ chord, onClose, baseOctave = 4 }) => {
  const [selectedVoicing, setSelectedVoicing] = useState('Root Position');
  const [shellMode, setShellMode] = useState(false);

  if (!chord) return null;

  const voicingOptions = getVoicingOptions(chord, baseOctave);
  if (!voicingOptions) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content keyboard-voicing-modal" onClick={e => e.stopPropagation()}>
          <button className="btn-close" onClick={onClose}>✕</button>
          <p>Invalid chord format: {chord}</p>
        </div>
      </div>
    );
  }

  const activeVoicing = shellMode ? 'Shell (Jazz)' : selectedVoicing;
  const voicing = voicingOptions.voicings[activeVoicing];
  const notesForRange = voicing.notes || voicing.right || [];
  const rangeCheck = checkVoicingRange(notesForRange);

  const rhythmPatterns = [
    { name: 'Even Feel', pattern: '♫ ♫ ♫', description: 'Straight, steady rhythm' },
    { name: 'Swing Feel', pattern: '♪ ♪ ♪ | ♪ ♪ ♪', description: 'Jazz/swing rhythm' },
    { name: 'Funk', pattern: '♫ ♩ ♫ ♩', description: 'Syncopated funk feel' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content keyboard-voicing-modal" onClick={e => {
        e.stopPropagation();
        e.preventDefault();
      }}>
        <button className="btn-close" onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}>✕</button>

        <h2>🎹 Keyboard Voicing: {chord}</h2>

        {/* Voicing Selector */}
        <div className="voicing-selector">
          <label>Voicing Options:</label>
          <div className="voicing-buttons">
            {Object.entries(voicingOptions.voicings).map(([name]) => (
              <button
                key={name}
                className={`voicing-btn ${selectedVoicing === name && !shellMode ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVoicing(name);
                  setShellMode(false);
                }}
              >
                {name}
              </button>
            ))}
            <button
              className={`voicing-btn shell-btn ${shellMode ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShellMode(!shellMode);
              }}
              title="Jazz voicing: Root, 3rd, 7th only"
            >
              🎷 Shell Mode
            </button>
          </div>
        </div>

        {/* Current Voicing Display */}
        <div className="voicing-display">
          <h3>{activeVoicing}</h3>
          <p className="voicing-description">{voicing.description}</p>

          <div className="notes-container">
            <div className="notes-display">
              <strong>Notes:</strong>
              <div className="notes-list">
                {(voicing.notes || voicing.right || []).map((note, idx) => (
                  <div key={idx} className={`note-item ${!rangeCheck.inRange && rangeCheck.outOfRangeNotes.includes(note) ? 'out-of-range' : ''}`}>
                    <span className="note-name">{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hand Position Guide */}
            {activeVoicing === 'Left Hand Bass' && (
              <div className="hand-guide">
                <div className="hand-left">
                  <h4>👈 LEFT HAND</h4>
                  <p className="pedal-mark">🚗 Sustain Pedal: ON ⭕</p>
                  <div className="bass-note">{voicing.left[0]}</div>
                  <small>Bass note (Pedal controlled)</small>
                </div>
                <div className="hand-right">
                  <h4>👉 RIGHT HAND</h4>
                  <div className="chord-notes">
                    {voicing.right.join(' - ')}
                  </div>
                  <small>Chord voicing</small>
                </div>
              </div>
            )}
          </div>

          {/* Range Indicator */}
          <div className={`range-indicator ${rangeCheck.inRange ? 'in-range' : 'out-of-range'}`}>
            <strong>Keyboard Range (88-key):</strong>
            <p>
              {rangeCheck.inRange ? (
                <span className="success">✓ All notes in range</span>
              ) : (
                <span className="warning">⚠️ Out of range: {rangeCheck.outOfRangeNotes.join(', ')}</span>
              )}
            </p>
            <small>Range: A0 - C8</small>
          </div>
        </div>

        {/* All Voicing Options */}
        <div className="all-voicings">
          <h3>All Voicing Options</h3>
          <div className="voicing-grid">
            {Object.entries(voicingOptions.voicings).map(([name, voicingData]) => {
              const notes = voicingData.notes || (voicingData.right ? voicingData.right : []);
              const notesDisplay = Array.isArray(notes) ? notes.join(' ') : '';
              return (
                <div key={name} className="voicing-card">
                  <h4>{name}</h4>
                  <p className="voicing-notes">{notesDisplay}</p>
                  <p className="voicing-hint">{voicingData.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rhythm Patterns */}
        <div className="rhythm-patterns">
          <h3>🎵 Comping Rhythm Patterns</h3>
          <div className="patterns-grid">
            {rhythmPatterns.map((pattern) => (
              <div key={pattern.name} className="rhythm-card">
                <h4>{pattern.name}</h4>
                <p className="pattern-visual">{pattern.pattern}</p>
                <small>{pattern.description}</small>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="keyboard-info">
          <h4>💡 Keyboardist Tips</h4>
          <ul>
            <li><strong>Root Position:</strong> Use for clear, full sound</li>
            <li><strong>Shell Voicing:</strong> Jazz standard - leaves space, very elegant</li>
            <li><strong>Left Hand Bass:</strong> Classical approach - bass + chord separation</li>
            <li><strong>Upper Structure:</strong> Modern, bright sound - good for contemporary</li>
            <li><strong>Shell Mode:</strong> Toggle for quick jazz voicing across all chords</li>
          </ul>
        </div>

        <button className="btn-primary" onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} style={{ width: '100%', marginTop: '20px' }}>
          Done
        </button>
      </div>
    </div>
  );
};

export default KeyboardVoicingModal;
