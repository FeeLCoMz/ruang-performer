import React, { useMemo, useState } from "react";
import {
  applyTransformToSelection,
  autoAlignChordLyricPairs,
  autoTagSongSections,
  formatWholeLyricsDocument,
  removeExtraSpacesAndBrokenLines,
  summariseFormatChanges,
} from "../utils/lyricsEditorUtils.js";
import { alignSelectedBarlines, wrapBarsPerLine } from "../utils/chordUtils.js";

/**
 * LyricsFormatToolbar
 *
 * Formatting actions for the lyrics editor, grouped by SCOPE because that is
 * the distinction that actually decides whether pressing a button does anything:
 *
 *   - "Seleksi" acts on the highlighted text only. With nothing selected these
 *     do nothing useful, so they are disabled until there is a selection.
 *   - "Dokumen" acts on the whole lyric. These are the ones you reach for right
 *     after pasting, before touching anything else.
 *
 * History (undo/redo), search and MIDI cues live elsewhere on purpose: they are
 * not formatting, and mixing them in made the old ribbon a flat wall of nine
 * equally-weighted buttons.
 */
export default function LyricsFormatToolbar({
  disabled = false,
  lyricsRef,
  lyricsValue = "",
  setLyricsValue,
  selectionRange = { start: null, end: null },
}) {
  const hasSelection =
    Number.isInteger(selectionRange?.start) &&
    Number.isInteger(selectionRange?.end) &&
    selectionRange.end > selectionRange.start;

  const [barsPerLine, setBarsPerLine] = useState(4);
  const [formatPreview, setFormatPreview] = useState(null);

  /** Apply a transformer to the current selection, restoring it afterwards. */
  const applyToSelection = (transformer) => {
    if (typeof setLyricsValue !== "function") return;

    const el = lyricsRef?.current;
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

  /** Preview the whole-document tidy-up before rewriting anything. */
  const openFormatPreview = () => {
    const nextText = formatWholeLyricsDocument(lyricsValue);
    setFormatPreview({
      unchanged: nextText === lyricsValue,
      after: nextText,
      summary: summariseFormatChanges(lyricsValue, nextText),
      before: lyricsValue,
    });
  };

  const applyFormatPreview = () => {
    if (!formatPreview || formatPreview.unchanged) {
      setFormatPreview(null);
      return;
    }
    if (typeof setLyricsValue === 'function') {
      setLyricsValue(formatPreview.after);
    }
    setFormatPreview(null);
  };

  const selectionActions = useMemo(
    () => [
      {
        key: 'align-bars',
        icon: '∥',
        label: 'Sejajarkan Bar',
        title: 'Rapikan posisi garis bar (|) pada teks yang dipilih',
        onClick: () => applyToSelection(alignSelectedBarlines),
      },
      {
        key: 'auto-align',
        icon: '⇅',
        label: 'Sejajarkan Chord',
        title: 'Geser chord agar sejajar dengan suku kata di baris lirik bawahnya',
        onClick: () => applyToSelection(autoAlignChordLyricPairs),
      },
      {
        key: 'wrap-bars',
        icon: '↩',
        label: 'Pecah Bar',
        title: 'Pecah chord menjadi beberapa bar per baris pada teks yang dipilih',
        onClick: () => applyToSelection((text) => wrapBarsPerLine(text, barsPerLine)),
      },
    ],
    // applyToSelection closes over the current text/selection, so the list has
    // to be rebuilt whenever those change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lyricsValue, selectionRange, barsPerLine, disabled]
  );

  return (
    <div className="lyric-format">
      <div className="lyric-format-group">
        <div className="lyric-format-group-head">
          <span className="lyric-format-group-title">Seleksi</span>
          <span className="lyric-format-group-hint">
            {hasSelection ? 'teks terpilih' : 'blok teks dulu'}
          </span>
        </div>

        <div className="lyric-format-actions">
          {selectionActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="btn btn-secondary lyric-format-btn"
              disabled={disabled || !hasSelection}
              onClick={action.onClick}
              title={hasSelection ? action.title : 'Blok sebagian teks lirik dulu'}
            >
              <span aria-hidden="true">{action.icon}</span>
              {action.label}
            </button>
          ))}

          <label className="lyric-format-bars" htmlFor="lyric-format-bars-per-line">
            Bar/Baris
            <select
              id="lyric-format-bars-per-line"
              className="lyric-format-select"
              value={barsPerLine}
              onChange={(e) => setBarsPerLine(Number(e.target.value))}
              disabled={disabled}
              aria-label="Jumlah bar per baris untuk Pecah Bar"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
            </select>
          </label>
        </div>
      </div>

      <div className="lyric-format-group">
        <div className="lyric-format-group-head">
          <span className="lyric-format-group-title">Dokumen</span>
          <span className="lyric-format-group-hint">seluruh lirik</span>
        </div>

        <div className="lyric-format-actions">
          <button
            type="button"
            className="btn btn-secondary lyric-format-btn"
            disabled={disabled}
            onClick={() => applyToSelection(removeExtraSpacesAndBrokenLines)}
            title="Hapus spasi ganda, tab, baris kosong menumpuk, dan karakter tersembunyi dari hasil copy-paste"
          >
            <span aria-hidden="true">✨</span>
            Bersihkan Teks
          </button>

          <button
            type="button"
            className="btn btn-secondary lyric-format-btn"
            disabled={disabled}
            onClick={() => applyToSelection(autoTagSongSections)}
            title="Deteksi Intro, Verse, Chorus, Bridge, dan ubah menjadi tag [Section]"
          >
            <span aria-hidden="true">🏷</span>
            Tag Bagian
          </button>

          <button
            type="button"
            className="btn btn-primary lyric-format-btn"
            disabled={disabled}
            onClick={openFormatPreview}
            title="Rapikan seluruh dokumen sekaligus: bersihkan teks, tag bagian, dan seragamkan chord"
          >
            <span aria-hidden="true">🪄</span>
            Rapikan Semua
          </button>
        </div>
      </div>

      {formatPreview && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Rapikan Semua"
          onClick={() => setFormatPreview(null)}
        >
          <div
            className="modal song-lyrics-format-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lyric-format-preview-head">
              <h3>🪄 Pratinjau Rapikan Semua</h3>
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
              <p className="lyric-format-preview-unchanged">
                Tidak ada yang perlu diubah — penulisan lirik sudah rapi.
              </p>
            ) : (
              <>
                <p className="lyric-format-preview-desc">
                  Perubahan berikut akan diterapkan ke <b>seluruh</b> lirik. Tinjau dulu sebelum melanjutkan.
                </p>

                {formatPreview.summary.length > 0 && (
                  <ul className="lyric-format-preview-summary">
                    {formatPreview.summary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                <div className="lyric-format-preview-compare">
                  <div className="lyric-format-preview-col">
                    <span className="lyric-format-preview-label">Sebelum</span>
                    <pre className="lyric-format-preview-text">{formatPreview.before}</pre>
                  </div>
                  <div className="lyric-format-preview-col">
                    <span className="lyric-format-preview-label">Sesudah</span>
                    <pre className="lyric-format-preview-text is-after">{formatPreview.after}</pre>
                  </div>
                </div>
              </>
            )}

            <div className="lyric-format-preview-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setFormatPreview(null)}>
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
    </div>
  );
}
