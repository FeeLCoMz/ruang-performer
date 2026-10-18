import React, { useEffect, useRef, useState } from 'react';

/**
 * SheetMusicModal
 *
 * The Partitur (MusicXML) input lives behind a button in the song's identity
 * grid: the raw XML is long and rarely edited, so keeping it inline would push
 * the lyrics editor down for a field most users touch once. This modal gives it
 * the full width when it is actually needed, and stays out of the way otherwise.
 */
export default function SheetMusicModal({ value, onSave, onClose }) {
  const [draft, setDraft] = useState(value || '');
  const textareaRef = useRef(null);

  // Focus the textarea as soon as the modal opens so pasting is one step.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Input Partitur MusicXML"
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal sheet-music-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-music-modal-head">
          <h3 className="sheet-music-modal-title">🎼 Partitur (MusicXML)</h3>
          <button
            type="button"
            className="sheet-music-modal-close"
            onClick={onClose}
            aria-label="Tutup"
            title="Tutup (Esc)"
          >
            ✕
          </button>
        </div>

        <p className="sheet-music-modal-desc">
          Tempelkan MusicXML untuk lagu ini. Kosongkan bila partitur belum tersedia.
        </p>

        <textarea
          ref={textareaRef}
          id="song-sheet-music"
          name="sheetMusicXml"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste MusicXML di sini..."
          rows={14}
          className="form-input-field song-sheetmusic-textarea"
        />

        <div className="sheet-music-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Simpan Partitur
          </button>
        </div>
      </div>
    </div>
  );
}
