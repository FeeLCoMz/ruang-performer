import React, { useRef, useState } from 'react';

export default function VirtualPiano({ onKeySelect, isOpen, onClose, helperText }) {
  const audioContextRef = useRef(null);
  const [activeKeys, setActiveKeys] = useState(new Set());

  if (!isOpen) return null;

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        console.error('Failed to create AudioContext:', err);
        return null;
      }
    }
    return audioContextRef.current;
  };

  // Piano keys with frequencies (1 octave starting from C4)
  const keys = [
    { note: 'C', frequency: 261.63, isBlack: false },
    { note: 'C#', frequency: 277.18, isBlack: true },
    { note: 'D', frequency: 293.66, isBlack: false },
    { note: 'D#', frequency: 311.13, isBlack: true },
    { note: 'E', frequency: 329.63, isBlack: false },
    { note: 'F', frequency: 349.23, isBlack: false },
    { note: 'F#', frequency: 369.99, isBlack: true },
    { note: 'G', frequency: 392.00, isBlack: false },
    { note: 'G#', frequency: 415.30, isBlack: true },
    { note: 'A', frequency: 440.00, isBlack: false },
    { note: 'A#', frequency: 466.16, isBlack: true },
    { note: 'B', frequency: 493.88, isBlack: false },
  ];

  const playNote = (frequency, note) => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);

    // Visual feedback
    setActiveKeys(prev => new Set(prev).add(note));
    setTimeout(() => {
      setActiveKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }, 200);

    // Callback for key selection
    if (onKeySelect) {
      onKeySelect(note);
    }
  };

  return (
    <div className="piano-popup">
      <div className="piano-popup-header">
        <h4 className="piano-popup-title">
          🎹 Virtual Piano
        </h4>
        <button
          type="button"
          className="piano-popup-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="piano-popup-body">
        <p style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
          {helperText || 'Klik piano untuk memilih key'}
        </p>
        <div className="virtual-piano">
          <div className="piano-keys">
            {keys.map((key) => (
              <button
                key={key.note}
                type="button"
                className={`piano-key ${key.isBlack ? 'black-key' : 'white-key'} ${
                  activeKeys.has(key.note) ? 'active' : ''
                }`}
                onClick={() => playNote(key.frequency, key.note)}
                title={key.note}
              >
                <span className="piano-key-label">{key.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
