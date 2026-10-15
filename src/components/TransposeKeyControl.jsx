import React from 'react';
import { transposeChord, getTransposeSteps } from '../utils/chordUtils.js';

/**
 * TransposeKeyControl - Component for displaying and transposing musical keys
 * 
 * @param {string} originalKey - The original key (e.g., 'C', 'G#', 'Am')
 * @param {number} transpose - Current transpose value in semitones
 * @param {function} onTransposeChange - Callback when transpose changes
 * @param {boolean} compact - Optional compact mode for smaller display
 */
export default function TransposeKeyControl({
  originalKey,
  targetKey,
  transpose,
  onTransposeChange,
  compact = false,
  disableAutoApply = false,
  pianoRecommendation = null,
  onApplyRecommendedTranspose = null,
  variant,
}) {
  const safeOnTransposeChange = React.useCallback((nextValue) => {
    if (typeof onTransposeChange === 'function') {
      onTransposeChange(nextValue);
    }
  }, [onTransposeChange]);
  const appliedKeyPairRef = React.useRef(null);

  // Terapkan transpose otomatis hanya saat pasangan key pertama kali dipasang atau berubah.
  // Setelah pengguna mengubah transpose manual, jangan mengoverride nilai tersebut.
  // Bisa dinonaktifkan (disableAutoApply) bila halaman sudah mengelola transpose
  // sendiri — mis. key & tempo disinkronkan lintas tab di halaman song view.
  React.useEffect(() => {
    if (disableAutoApply) return undefined;
    if (!originalKey || !targetKey) {
      appliedKeyPairRef.current = null;
      return;
    }

    const keyPair = `${originalKey}::${targetKey}`;
    if (appliedKeyPairRef.current === keyPair) {
      return;
    }

    appliedKeyPairRef.current = keyPair;
    const steps = getTransposeSteps(originalKey, targetKey);
    if (steps !== null && steps !== transpose) {
      safeOnTransposeChange(steps);
    } else if (steps === 0 && transpose !== 0) {
      safeOnTransposeChange(0);
    }
  }, [disableAutoApply, originalKey, targetKey, transpose, safeOnTransposeChange]);
  // Calculate transposed key menggunakan chordUtils
  const getTransposedKey = (key, semitones) => {
    if (!key || semitones === 0) return key;
    return transposeChord(key, semitones);
  };

  const transposedKey = getTransposedKey(originalKey, transpose);

  const handleTransposeDown = () => {
    safeOnTransposeChange(transpose - 1);
  };

  const handleTransposeUp = () => {
    safeOnTransposeChange(transpose + 1);
  };

  const handleReset = () => {
    if (transpose !== 0) {
      safeOnTransposeChange(0);
    }
  };

  // Tombol "key mudah": bagian dari kontrol transpose agar ukuran/posisinya
  // seragam di semua tempat yang memakai komponen ini (tab Info, toolbar lirik).
  const recommendedSteps = Number(pianoRecommendation?.transposeFromCurrent) || 0;
  const showEasyKey = Boolean(
    pianoRecommendation && pianoRecommendation.recommendedKey
    && typeof onApplyRecommendedTranspose === 'function'
  );
  const handleApplyEasyKey = () => {
    if (recommendedSteps !== 0) {
      onApplyRecommendedTranspose?.(recommendedSteps);
    }
  };

  if (!originalKey) return null;

  const isCompact = variant === 'compact' || (variant == null && compact);
  // mini: versi paling ringkas — untuk bar terpadu mode penuh (layar sempit)
  const isMini = variant === 'mini';
  const sizeClass = isMini ? ' transpose-key-capsule-mini' : '';

  if (isCompact || isMini) {
    return (
      /* Kapsul pill gaya TempoControl/AutoScrollControl compact */
      <div className={`transpose-key-capsule${sizeClass}`} role="group" aria-label="Transpose key">
        <button
          type="button"
          onClick={handleTransposeDown}
          className="transpose-key-step"
          title="Transpose down"
          aria-label="Transpose down"
        >
          −
        </button>
        <div
          className="transpose-key-value"
          aria-live="polite"
          title={transpose !== 0 ? `${originalKey} → ${transposedKey}` : `Key aktif: ${originalKey}`}
        >
          {transpose !== 0 ? (
            <>
              {originalKey && (
                <>
                  <span className="transpose-key-original">{originalKey}</span>
                  <span className="transpose-key-arrow" aria-hidden="true">→</span>
                </>
              )}
              <span className="transpose-key-current">{transposedKey}</span>
            </>
          ) : (
            <span className="transpose-key-current">{originalKey}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleTransposeUp}
          className="transpose-key-step"
          title="Transpose up"
          aria-label="Transpose up"
        >
          +
        </button>
        {showEasyKey && (
          <button
            type="button"
            onClick={handleApplyEasyKey}
            className="transpose-key-easy-btn"
            disabled={recommendedSteps === 0}
            title={recommendedSteps === 0
              ? 'Key dasar sudah cocok'
              : `Key mudah: ${pianoRecommendation.recommendedKey} (${recommendedSteps > 0 ? '+' : ''}${recommendedSteps} semitone)`}
            aria-label="Gunakan key mudah yang disarankan"
          >
            💡 {pianoRecommendation.recommendedKey}
          </button>
        )}
        {transpose !== 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="transpose-key-reset"
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
          className="btn btn-secondary"
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
          className="btn btn-secondary"
          title="Transpose up"
          aria-label="Transpose up"
        >
          +
        </button>
        {showEasyKey && (
          <button
            type="button"
            onClick={handleApplyEasyKey}
            className="btn btn-secondary transpose-key-easy-btn"
            disabled={recommendedSteps === 0}
            title={recommendedSteps === 0
              ? 'Key dasar sudah cocok'
              : `Key mudah: ${pianoRecommendation.recommendedKey} (${recommendedSteps > 0 ? '+' : ''}${recommendedSteps} semitone)`}
            aria-label="Gunakan key mudah yang disarankan"
          >
            💡 {pianoRecommendation.recommendedKey}
          </button>
        )}
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
