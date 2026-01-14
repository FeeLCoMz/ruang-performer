import React, { useState } from 'react';
import { getVoicingOptions } from '../utils/keyboardVoicing';
import KeyboardVoicingModal from './KeyboardVoicingModal';
import './KeyboardChordDisplay.css';

const KeyboardChordDisplay = ({ chord, transpose = 0, sustainMarked = false, onToggleSustain, showVoicing = true }) => {
  const [showVoicingModal, setShowVoicingModal] = useState(false);

  if (!chord || chord.trim() === '') return null;

  const voicingInfo = getVoicingOptions(chord);
  
  return (
    <>
      <span className="keyboard-chord-display">
        <span 
          className="chord-name keyboard-chord"
          onClick={() => showVoicing && setShowVoicingModal(true)}
          title="Click to see voicing options"
        >
          {chord}
        </span>
        
        {sustainMarked && (
          <span className="sustain-marker" title="Sustain Pedal ON">
            🚗
          </span>
        )}
        
        {voicingInfo && showVoicing && (
          <button
            className="voicing-info-btn"
            onClick={() => setShowVoicingModal(true)}
            title="Show voicing options"
          >
            🎹
          </button>
        )}
        
        {onToggleSustain && (
          <button
            className={`sustain-toggle-btn ${sustainMarked ? 'active' : ''}`}
            onClick={onToggleSustain}
            title="Toggle sustain pedal"
          >
            ⭕
          </button>
        )}
      </span>

      {showVoicingModal && (
        <KeyboardVoicingModal 
          chord={chord}
          onClose={() => setShowVoicingModal(false)}
          baseOctave={4}
        />
      )}
    </>
  );
};

export default KeyboardChordDisplay;
