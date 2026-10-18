import React from 'react';
import { createPortal } from 'react-dom';
import { transposeChord, getTransposeSteps } from '../utils/chordUtils.js';
import { MUSICAL_KEYS_MAJOR, MUSICAL_KEYS_MINOR, parseKeyLabel } from '../utils/keyPicker.js';

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

  /* ======== Picker key: pilih key target langsung dari daftar ======== */
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const openPicker = () => setPickerOpen(true);
  const closePicker = React.useCallback(() => setPickerOpen(false), []);

  // Pilih key dari daftar: hitung steps dari originalKey ke key pilihan.
  // Jika key pilihan == key asli, steps 0 (reset transpose).
  const handlePickKey = (key) => {
    const steps = getTransposeSteps(originalKey, key);
    safeOnTransposeChange(steps === null ? 0 : steps);
    closePicker();
  };

  // Tutup modal saat tekan Esc.
  React.useEffect(() => {
    if (!pickerOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') closePicker();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pickerOpen, closePicker]);

  // Key aktif (setelah transpose) untuk highlight di daftar.
  const activeKeyLabel = parseKeyLabel(transposedKey) || transposedKey;
  // Key asli untuk tanda referensi di daftar.
  const originalKeyLabel = parseKeyLabel(originalKey) || originalKey;

  // Hanya tampilkan key dengan mood yang sama dengan key asli: key asli mayor
  // → hanya 12 key mayor; minor → hanya 12 key minor. Jika key asli tidak
  // bisa diparse (format aneh), fallback ke daftar lengkap 24 key.
  const isOriginalMinor = originalKeyLabel ? originalKeyLabel.endsWith('m') : false;
  const pickerKeys = originalKeyLabel
    ? (isOriginalMinor ? MUSICAL_KEYS_MINOR : MUSICAL_KEYS_MAJOR)
    : [...MUSICAL_KEYS_MAJOR, ...MUSICAL_KEYS_MINOR];

  const pickerModal = pickerOpen ? createPortal(
    <div
      className="key-picker-overlay"
      onClick={closePicker}
      role="presentation"
    >
      <div
        className="key-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Pilih key"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="key-picker-title">Pilih key</div>
        <div className="key-picker-subtitle">
          Key asli: {originalKeyLabel} ({isOriginalMinor ? 'minor' : 'mayor'}) — key pilihan diterapkan sebagai transpose.
        </div>
        <div className="key-picker-grid" role="listbox" aria-label={`Daftar key ${isOriginalMinor ? 'minor' : 'mayor'}`}>
          {pickerKeys.map((key) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === activeKeyLabel}
              className={`key-picker-option${key === activeKeyLabel ? ' is-active' : ''}${key === originalKeyLabel ? ' is-original' : ''}`}
              onClick={() => handlePickKey(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="key-picker-close"
          onClick={closePicker}
        >
          Tutup
        </button>
      </div>
    </div>,
    document.body,
  ) : null;

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
        <button
          type="button"
          className="transpose-key-value"
          onClick={openPicker}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-live="polite"
          title={transpose !== 0 ? `${originalKey} → ${transposedKey} — klik untuk pilih key` : `${originalKey} — klik untuk pilih key`}
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
        </button>
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
        {pickerModal}
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
        <button
          type="button"
          className="song-info-key-display"
          onClick={openPicker}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          title={transpose !== 0 ? `${originalKey} → ${transposedKey} — klik untuk pilih key` : `${originalKey} — klik untuk pilih key`}
        >
          {transpose !== 0 ? (
            <>
              <span className="song-info-key-original">{originalKey}</span>
              <span className="song-info-key-arrow">→</span>
              <span className="song-info-value">{transposedKey}</span>
            </>
          ) : (
            <span className="song-info-value">{originalKey}</span>
          )}
        </button>
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
      {pickerModal}
    </div>
  );
}
