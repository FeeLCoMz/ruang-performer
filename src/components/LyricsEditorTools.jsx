import React from "react";

/**
 * LyricsEditorTools
 *
 * Everything in the lyrics editor that is NOT formatting: history, search,
 * and the piano entry point. Kept apart from LyricsFormatToolbar so the
 * formatting area contains only formatting.
 */
export default function LyricsEditorTools({
  disabled = false,
  lyricsRef,
  showPianoControls = false,
  onOpenPiano,
  insertNotesEnabled = false,
  showSaveCancelButtons = false,
  savingLyrics = false,
  handleSaveLyrics,
  handleCancelEditLyrics,
}) {
  return (
    <div className="lyric-tools">
      <div className="lyric-tools-history" role="group" aria-label="Riwayat dan pencarian">
        <button
          type="button"
          className="btn btn-secondary lyric-tools-btn"
          disabled={disabled}
          onClick={() => lyricsRef?.current?.undo?.()}
          title="Batalkan perubahan terakhir (Ctrl+Z)"
        >
          <span aria-hidden="true">↶</span>
          Undo
        </button>
        <button
          type="button"
          className="btn btn-secondary lyric-tools-btn"
          disabled={disabled}
          onClick={() => lyricsRef?.current?.redo?.()}
          title="Ulangi perubahan yang dibatalkan (Ctrl+Shift+Z)"
        >
          <span aria-hidden="true">↷</span>
          Redo
        </button>
        <button
          type="button"
          className="btn btn-secondary lyric-tools-btn"
          disabled={disabled}
          onClick={() => lyricsRef?.current?.openSearchPanel?.()}
          title="Cari / ganti teks di editor (Ctrl+F)"
        >
          <span aria-hidden="true">🔍</span>
          Cari
        </button>
      </div>

      <div className="lyric-tools-right">
        {showPianoControls && (
          <button
            type="button"
            className="btn btn-secondary lyric-tools-btn"
            onClick={onOpenPiano}
            disabled={disabled}
            title="Buka Virtual Piano untuk memasukkan not ke lirik"
          >
            <span aria-hidden="true">🎹</span>
            Piano
            <span className={`lyric-tools-insert-flag${insertNotesEnabled ? ' is-on' : ''}`}>
              {insertNotesEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        )}

        {showSaveCancelButtons && (
          <>
            <button
              type="button"
              onClick={handleSaveLyrics}
              disabled={disabled}
              className="btn lyric-tools-btn"
              title={savingLyrics ? 'Menyimpan...' : 'Simpan'}
              aria-label={savingLyrics ? 'Menyimpan' : 'Simpan'}
            >
              {savingLyrics ? '⏳' : '✓'}
            </button>
            <button
              type="button"
              onClick={handleCancelEditLyrics}
              disabled={disabled}
              className="btn btn-secondary lyric-tools-btn"
              title="Batal"
              aria-label="Batal"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
