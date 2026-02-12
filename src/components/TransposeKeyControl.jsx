import React from 'react';

/**
 * TransposeKeyControl - Component for displaying and transposing musical keys
 * 
 * @param {string} originalKey - The original key (e.g., 'C', 'G#', 'Am')
 * @param {number} transpose - Current transpose value in semitones
 * @param {function} onTransposeChange - Callback when transpose changes
 * @param {boolean} compact - Optional compact mode for smaller display
 */
export default function TransposeKeyControl({ originalKey, targetKey, transpose, onTransposeChange, compact = false }) {
  // Kalkulasi otomatis transpose jika targetKey berbeda dengan originalKey
  React.useEffect(() => {
    if (!originalKey || !targetKey) return;
    // Helper: parse root key
    function parseKeyRoot(keyStr) {
      if (!keyStr) return '';
      const match = keyStr.match(/^([A-G][b#]?)/i);
      return match ? match[1].toUpperCase() : keyStr.toUpperCase();
    }
    const keyMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const origRoot = parseKeyRoot(originalKey);
    const targRoot = parseKeyRoot(targetKey);
    const originalIdx = keyMap.indexOf(origRoot);
    const targetIdx = keyMap.indexOf(targRoot);
    if (originalIdx >= 0 && targetIdx >= 0 && origRoot !== targRoot) {
      let steps = targetIdx - originalIdx;
      if (steps < 0) steps += 12;
      if (steps !== transpose) onTransposeChange(steps);
    } else if (origRoot === targRoot && transpose !== 0) {
      onTransposeChange(0);
    }
  }, [originalKey, targetKey]);
  // Calculate transposed key
  // Transpose hanya root key, suffix (misal 'm') tetap dipertahankan tanpa logika mayor/minor
  const getTransposedKey = (key, semitones) => {
    if (!key || semitones === 0) return key;
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    // Regex: root (C, D#, F#) + sisa (misal 'm', 'maj7', dsb)
    const match = key.match(/^([A-G]#?|[A-G]b?)(.*)$/);
    if (!match) return key;
    const root = match[1];
    const suffix = match[2] || '';
    const currentIndex = keys.indexOf(root);
    if (currentIndex === -1) return key;
    const newIndex = (currentIndex + semitones + 12) % 12;
    return keys[newIndex] + suffix;
  };

  const transposedKey = getTransposedKey(originalKey, transpose);

  const handleTransposeDown = () => {
    onTransposeChange(transpose - 1);
  };

  const handleTransposeUp = () => {
    onTransposeChange(transpose + 1);
  };

  const handleReset = () => {
    if (transpose !== 0) {
      onTransposeChange(0);
    }
  };

  if (!originalKey) return null;

  if (compact) {
    return (
      <div className="transpose-key-control transpose-key-control-compact">
        <button
          type="button"
          onClick={handleTransposeDown}
          className="key-transpose-btn"
          title="Transpose down"
          aria-label="Transpose down"
        >
          −
        </button>
        <div className="song-info-key-display">
          {transpose !== 0 ? (
            <>
              <span className="song-info-key-original">{originalKey}</span>
              <span className="song-info-key-arrow">→</span>
              <span className="song-info-value">{transposedKey}</span>
            </>
          ) : (
            <span className="song-info-value">{originalKey}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleTransposeUp}
          className="key-transpose-btn"
          title="Transpose up"
          aria-label="Transpose up"
        >
          +
        </button>
        {transpose !== 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="key-transpose-reset"
            title="Reset transpose"
            aria-label="Reset transpose"
          >
            ⟲
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="transpose-key-control">
      <div className="song-info-key-controls">
        <button
          type="button"
          onClick={handleTransposeDown}
          className="key-transpose-btn"
          title="Transpose down"
          aria-label="Transpose down"
        >
          −
        </button>
        <div className="song-info-key-display">
          {transpose !== 0 ? (
            <>
              <span className="song-info-key-original">{originalKey}</span>
              <span className="song-info-key-arrow">→</span>
              <span className="song-info-value">{transposedKey}</span>
            </>
          ) : (
            <span className="song-info-value">{originalKey}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleTransposeUp}
          className="key-transpose-btn"
          title="Transpose up"
          aria-label="Transpose up"
        >
          +
        </button>
        {transpose !== 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="key-transpose-reset"
            title="Reset transpose"
            aria-label="Reset transpose"
            style={{ marginLeft: 8 }}
          >
            ⟲
          </button>
        )}
      </div>
      {transpose !== 0 && (
        <div className="song-info-key-status">
          {transpose > 0 ? `+${transpose}` : transpose} semitone
        </div>
      )}
    </div>
  );
}
