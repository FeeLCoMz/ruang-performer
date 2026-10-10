import React, { useMemo, useState } from "react";
import {
  applyTransformToSelection,
  autoAlignChordLyricPairs,
  autoTagSongSections,
  formatWholeLyricsDocument,
  insertLineAtCursor,
  removeExtraSpacesAndBrokenLines,
  summariseFormatChanges,
} from "../utils/lyricsEditorUtils.js";
import { GM_SOUND_CATEGORIES, GM_SOUND_BANK, filterGmSoundBankByCategory, formatGmPatchOptionLabel } from '../utils/gmSoundbank.js';

const LAST_MIDI_CHANNEL_STORAGE_KEY = 'ruangperformer_last_midi_channel';

export default function SongLyricsEditActions({
  disabled,
  barsPerLine,
  setBarsPerLine,
  handleAlignSelectedBarlines,
  handleWrap4BarsPerLine,
  handleFormatWholeDocument,
  handleWrapBarsPerLine,
  showSaveCancelButtons = false,
  savingLyrics = false,
  handleSaveLyrics,
  handleCancelEditLyrics,
  barsPerLineSelectId = "bars-per-line",
  showPianoControls = false,
  onOpenPiano,
  insertNotesEnabled = false,
  lyricsRef,
  lyricsValue = "",
  setLyricsValue,
  selectionRange = { start: null, end: null },
}) {
  const [lastSelection, setLastSelection] = useState({ start: null, end: null });
  const [selectedGmCategory, setSelectedGmCategory] = useState('piano-keys');
  const [selectedGmProgram, setSelectedGmProgram] = useState(0);
  const [selectedGmChannel, setSelectedGmChannel] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const stored = Number.parseInt(window.localStorage.getItem(LAST_MIDI_CHANNEL_STORAGE_KEY) || '1', 10);
    if (!Number.isFinite(stored) || stored < 1 || stored > 16) return 1;
    return stored;
  });
  const filteredGmSounds = useMemo(() => {
    const filtered = filterGmSoundBankByCategory(selectedGmCategory);
    return filtered.length ? filtered : GM_SOUND_BANK;
  }, [selectedGmCategory]);
  const selectedGmPatch = useMemo(() => {
    const parsedProgram = Number(selectedGmProgram);
    return GM_SOUND_BANK.find((item) => item.program === parsedProgram) || filteredGmSounds[0] || GM_SOUND_BANK[0];
  }, [selectedGmProgram, filteredGmSounds]);

  const ensureSelectedProgramInCategory = (categoryValue) => {
    const candidateSounds = filterGmSoundBankByCategory(categoryValue);
    if (!candidateSounds.length) return;
    const hasSelected = candidateSounds.some((item) => item.program === Number(selectedGmProgram));
    if (!hasSelected) {
      setSelectedGmProgram(candidateSounds[0].program);
    }
  };

  const formatActions = [
    {
      icon: '∥',
      label: 'Sejajar',
      title: 'Sejajarkan garis bar (|) pada teks yang dipilih',
      onClick: handleAlignSelectedBarlines,
    },
    {
      icon: '⇅',
      label: 'Auto-Align',
      title: 'Deteksi chord line di atas lirik dan rapikan posisinya agar sejajar dengan suku kata',
      onClick: () => applyTextTransform(autoAlignChordLyricPairs),
    },
    {
      icon: '↩',
      label: '4/Baris',
      title: 'Pecah otomatis menjadi 4 bar per baris pada teks yang dipilih',
      onClick: handleWrap4BarsPerLine,
    },
    {
      icon: '✨',
      label: 'Bersihkan Teks',
      title: 'Hapus spasi ganda, tab, baris kosong menumpuk, dan karakter tersembunyi dari hasil copy-paste',
      onClick: () => applyTextTransform(removeExtraSpacesAndBrokenLines),
    },
    {
      icon: '🏷',
      label: 'Tag Bagian',
      title: 'Deteksi Intro, Verse, Chorus, Bridge, dan normalisasi menjadi tag section',
      onClick: () => applyTextTransform(autoTagSongSections),
    },
  ];

  const applyTextTransform = (transformer) => {
    if (typeof setLyricsValue !== "function") return;

    const el = lyricsRef?.current;
    // Fall back to the last known selection when the textarea has lost focus
    // (e.g. the user clicked a toolbar button before pressing the action).
    const liveStart = Number.isInteger(el?.selectionStart) ? el.selectionStart : selectionRange.start;
    const liveEnd = Number.isInteger(el?.selectionEnd) ? el.selectionEnd : selectionRange.end;

    const { nextText, nextSelectionStart, nextSelectionEnd, changed, selectionEmpty } =
      applyTransformToSelection({
        text: lyricsValue,
        selectionStart: liveStart,
        selectionEnd: liveEnd,
        transform: transformer,
      });

    if (!changed) return;

    setLyricsValue(nextText);
    if (!selectionEmpty) {
      setLastSelection({ start: nextSelectionStart, end: nextSelectionEnd });
    }

    setTimeout(() => {
      if (!el) return;
      el.focus();
      if (selectionEmpty) {
        const caret = Math.min(liveEnd ?? nextText.length, nextText.length);
        el.setSelectionRange(caret, caret);
        return;
      }
      el.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    }, 0);
  };

  const handleInsertGmCue = () => {
    if (!lyricsRef?.current || typeof setLyricsValue !== 'function') return;

    const el = lyricsRef.current;
    const channel = Number.isFinite(Number(selectedGmChannel)) ? Number(selectedGmChannel) : 1;
    const program = Number.isFinite(Number(selectedGmProgram)) ? Number(selectedGmProgram) : 0;
    const patchName = selectedGmPatch?.name || 'GM Patch';
    const cueLine = `[Keys: ${patchName} | PC: ${program} | CH: ${channel}]`;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_MIDI_CHANNEL_STORAGE_KEY, String(channel));
    }

    const { nextText, nextCursor } = insertLineAtCursor({
      text: lyricsValue,
      selectionStart: el.selectionStart,
      selectionEnd: el.selectionEnd,
      label: cueLine,
    });

    setLyricsValue(nextText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  // Format Semua rewrites the whole document (cleanup + section tags + chord
  // standardisation) and cannot be undone as one step, so it goes through a
  // preview + explicit confirmation instead of applying immediately.
  const [formatPreview, setFormatPreview] = useState(null);

  const openFormatPreview = () => {
    if (typeof setLyricsValue !== 'function') return;
    const nextText =
      typeof handleFormatWholeDocument === 'function'
        ? null
        : formatWholeLyricsDocument(lyricsValue);

    // When the parent owns the transform we cannot preview it without applying,
    // so fall back to the parent handler directly.
    if (nextText === null) {
      handleFormatWholeDocument();
      return;
    }

    if (nextText === lyricsValue) {
      setFormatPreview({ unchanged: true, before: lyricsValue, after: nextText, summary: [] });
      return;
    }

    setFormatPreview({
      unchanged: false,
      before: lyricsValue,
      after: nextText,
      summary: summariseFormatChanges(lyricsValue, nextText),
    });
  };

  const applyFormatPreview = () => {
    if (!formatPreview) return;
    applyTextTransform((text) => formatWholeLyricsDocument(text));
    setFormatPreview(null);
  };

  const handleOpenSearch = () => {
    lyricsRef?.current?.openSearchPanel?.();
  };

  const handleUndo = () => {
    lyricsRef?.current?.undo?.();
  };

  const handleRedo = () => {
    lyricsRef?.current?.redo?.();
  };

  return (
    <>
      <div className="song-lyrics-edit-actions">
        <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-format">
          <span className="song-lyrics-action-group-title">Quick Tools</span>
          <div className="song-lyrics-format-ribbon" role="group" aria-label="Format teks lirik">
            {formatActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="btn btn-secondary song-lyrics-format-ribbon-btn"
                disabled={disabled}
                onClick={() => action.onClick?.()}
                title={action.title}
              >
                <span className="song-lyrics-format-ribbon-icon" aria-hidden="true">{action.icon}</span>
                <span className="song-lyrics-format-ribbon-label">{action.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="btn btn-secondary song-lyrics-format-ribbon-btn"
              disabled={disabled}
              onClick={openFormatPreview}
              title="Rapikan seluruh dokumen: bersihkan teks, tag bagian, dan standarkan chord sekaligus"
            >
              <span className="song-lyrics-format-ribbon-icon" aria-hidden="true">🪄</span>
              <span className="song-lyrics-format-ribbon-label">Format Semua</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary song-lyrics-format-ribbon-btn"
              disabled={disabled}
              onClick={handleUndo}
              title="Batalkan perubahan terakhir (Ctrl+Z)"
            >
              <span className="song-lyrics-format-ribbon-icon" aria-hidden="true">↶</span>
              <span className="song-lyrics-format-ribbon-label">Undo</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary song-lyrics-format-ribbon-btn"
              disabled={disabled}
              onClick={handleRedo}
              title="Ulangi perubahan yang dibatalkan (Ctrl+Shift+Z)"
            >
              <span className="song-lyrics-format-ribbon-icon" aria-hidden="true">↷</span>
              <span className="song-lyrics-format-ribbon-label">Redo</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary song-lyrics-format-ribbon-btn"
              disabled={disabled}
              onClick={handleOpenSearch}
              title="Cari / ganti teks di editor"
            >
              <span className="song-lyrics-format-ribbon-icon" aria-hidden="true">🔍</span>
              <span className="song-lyrics-format-ribbon-label">Cari</span>
            </button>
          </div>
          <div className="song-lyrics-bar-wrap-controls">
            <label htmlFor={barsPerLineSelectId} className="song-lyrics-bar-wrap-label">Bar/Baris</label>
            <select
              id={barsPerLineSelectId}
              className="song-lyrics-bar-wrap-select"
              value={barsPerLine}
              onChange={(e) => setBarsPerLine(Number(e.target.value))}
              disabled={disabled}
              aria-label="Pilih jumlah bar per baris"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
            </select>
            <button
              type="button"
              onClick={() => handleWrapBarsPerLine(barsPerLine)}
              disabled={disabled}
              className="btn btn-secondary"
              title="Terapkan jumlah bar per baris pada teks yang dipilih"
            >
              Terapkan
            </button>
          </div>
        </div>
        <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-gm-cue">
          <span className="song-lyrics-action-group-title">Keyboard Patch Builder</span>
          <div className="song-lyrics-gm-cue-controls">
            <label className="song-lyrics-gm-cue-field" htmlFor="gm-cue-category-select">
              Kategori Sound
              <select
                id="gm-cue-category-select"
                className="song-lyrics-bar-wrap-select"
                value={selectedGmCategory}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  setSelectedGmCategory(nextCategory);
                  ensureSelectedProgramInCategory(nextCategory);
                }}
                disabled={disabled}
              >
                {GM_SOUND_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>
            <label className="song-lyrics-gm-cue-field" htmlFor="gm-cue-patch-select">
              Soundbank GM
              <select
                id="gm-cue-patch-select"
                className="song-lyrics-bar-wrap-select song-lyrics-gm-cue-patch-select"
                value={String(selectedGmProgram)}
                onChange={(e) => setSelectedGmProgram(Number(e.target.value))}
                disabled={disabled}
              >
                {filteredGmSounds.map((patch) => (
                  <option key={patch.program} value={String(patch.program)}>
                    {formatGmPatchOptionLabel(patch)}
                  </option>
                ))}
              </select>
            </label>
            <label className="song-lyrics-gm-cue-field" htmlFor="gm-cue-channel-select">
              Channel
              <select
                id="gm-cue-channel-select"
                className="song-lyrics-bar-wrap-select"
                value={String(selectedGmChannel)}
                onChange={(e) => setSelectedGmChannel(Number(e.target.value))}
                disabled={disabled}
              >
                {Array.from({ length: 16 }, (_, idx) => idx + 1).map((channel) => (
                  <option key={channel} value={String(channel)}>CH {channel}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleInsertGmCue}
              disabled={disabled}
              className="btn btn-primary"
              title="Sisipkan patch keyboard MIDI dari dropdown GM"
            >
              Insert Patch
            </button>
          </div>
        </div>

        {showPianoControls && (
          <div className="song-lyrics-edit-actions-group song-lyrics-piano-controls">
            <span className="song-lyrics-action-group-title">Piano Insert</span>
            {/* Insert settings (format, key, trailing space) now live inside the
                piano modal, where the user is actually inserting notes. Keeping
                them here too meant two places to configure one behaviour. */}
            <button
              type="button"
              onClick={onOpenPiano}
              disabled={disabled}
              className="btn btn-secondary"
              title="Buka Virtual Piano untuk memasukkan not ke lirik"
            >
              🎹 Piano
            </button>
            <span
              className={`song-lyrics-piano-insert-state${insertNotesEnabled ? ' is-on' : ''}`}
              title={
                insertNotesEnabled
                  ? 'Not yang diklik akan disisipkan ke lirik'
                  : 'Not hanya dibunyikan, tidak disisipkan ke lirik'
              }
            >
              ✍ Insert {insertNotesEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        )}
        {showSaveCancelButtons && (
          <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-meta">
            <span className="song-lyrics-action-group-title">Editor Actions</span>
            {showSaveCancelButtons && (
              <>
                <button
                  type="button"
                  onClick={handleSaveLyrics}
                  disabled={disabled}
                  className="btn"
                  title={savingLyrics ? "Menyimpan..." : "Simpan"}
                  aria-label={savingLyrics ? "Menyimpan" : "Simpan"}
                >
                  {savingLyrics ? "⏳" : "✓"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditLyrics}
                  disabled={disabled}
                  className="btn btn-secondary"
                  title="Batal"
                  aria-label="Batal"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {formatPreview && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Format Semua"
          onClick={() => setFormatPreview(null)}
        >
          <div
            className="modal song-lyrics-format-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="song-lyrics-metadata-help-header">
              <h3>🪄 Pratinjau Format Semua</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormatPreview(null)}
                aria-label="Tutup pratinjau"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {formatPreview.unchanged ? (
              <p className="song-lyrics-format-preview-unchanged">
                Tidak ada yang perlu diubah — penulisan lirik sudah rapi.
              </p>
            ) : (
              <>
                <p className="song-lyrics-metadata-help-desc">
                  Perubahan berikut akan diterapkan ke <b>seluruh</b> lirik. Tinjau dulu sebelum melanjutkan.
                </p>

                {formatPreview.summary.length > 0 && (
                  <ul className="song-lyrics-format-preview-summary">
                    {formatPreview.summary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                <div className="song-lyrics-format-preview-compare">
                  <div className="song-lyrics-format-preview-col">
                    <span className="song-lyrics-format-preview-label">Sebelum</span>
                    <pre className="song-lyrics-format-preview-text">{formatPreview.before}</pre>
                  </div>
                  <div className="song-lyrics-format-preview-col">
                    <span className="song-lyrics-format-preview-label">Sesudah</span>
                    <pre className="song-lyrics-format-preview-text is-after">{formatPreview.after}</pre>
                  </div>
                </div>
              </>
            )}

            <div className="song-lyrics-format-preview-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormatPreview(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyFormatPreview}
                disabled={formatPreview.unchanged}
              >
                ✓ Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
