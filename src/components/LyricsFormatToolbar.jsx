import React, { useEffect, useMemo, useState } from "react";
import EditorMenuBar from "./EditorMenuBar.jsx";
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
 * The lyrics editor's menu bar. Commands are grouped the way a text editor
 * groups them, and NOTHING is hidden behind a disclosure toggle - the previous
 * design parked undo/redo/search/piano behind an "Alat" drawer, which hid
 * exactly the commands that are needed most.
 *
 * Groups:
 *   Riwayat  - undo / redo / search
 *   Format   - actions on the highlighted selection
 *   Dokumen  - actions on the whole lyric
 *   Sisip    - insertion aids (piano, notes)
 *   (menu Tampilan dihapus; pindah mode lewat switcher di workspace)
 *
 * Every group renders through the same EditorMenuBar item shape, so the menus,
 * items, separators and shortcut hints are visually identical throughout.
 */
export default function LyricsFormatToolbar({
  disabled = false,
  lyricsRef,
  lyricsValue = "",
  setLyricsValue,
  selectionRange = { start: null, end: null },
  /** Non-formatting hooks owned by the page. */
  showPianoControls = false,
  onOpenPiano,
  /** Quick transpose + copy, owned by the page. */
  onTranspose,
  onCopyLyrics,
  copyFeedback = '',
  pianoOpen = false,
  showSaveCancelButtons = false,
  savingLyrics = false,
  handleSaveLyrics,
  handleCancelEditLyrics,
  /** Preview mode, owned by the workspace. */
  previewMode = null,
  onPreviewModeChange,
  previewModes = null,
  /** Judul & artis lagu — dipakai tombol "Cari di Google". */
  songTitle = '',
  songArtist = '',
}) {
  const hasSelection =
    Number.isInteger(selectionRange?.start) &&
    Number.isInteger(selectionRange?.end) &&
    selectionRange.end > selectionRange.start;


  const [barsPerLine, setBarsPerLine] = useState(4);
  const [formatPreview, setFormatPreview] = useState(null);

  // Alt+P opens/closes the piano from anywhere in the page — the fastest path
  // to the instrument without hunting through the Sisip dropdown.
  useEffect(() => {
    if (!showPianoControls || disabled || typeof onOpenPiano !== 'function') return undefined;

    const onKeyDown = (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'p' && event.key !== 'P') return;
      event.preventDefault();
      onOpenPiano();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showPianoControls, disabled, onOpenPiano]);

  /** Apply a transformer to the current selection, restoring it afterwards. */
  const applyToSelection = (transformer) => {
    if (typeof setLyricsValue !== 'function') return;

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

  /** Query Google dari isian judul/artis, atau kata yang sedang diblok. */
  const googleQuery = useMemo(() => {
    const title = String(songTitle || '').trim();
    const artist = String(songArtist || '').trim();
    if (title) return [title, artist].filter(Boolean).join(' ');
    // Judul belum diisi: pakai kata yang diblok supaya tetap berguna saat
    // menempel lirik lama ke judul yang baru setengah diketik.
    if (hasSelection) return String(lyricsValue).slice(selectionRange.start, selectionRange.end).trim().slice(0, 80);
    return '';
  }, [songTitle, songArtist, hasSelection, lyricsValue, selectionRange]);

  const googleSearchUrl = googleQuery
    ? `https://www.google.com/search?q=${encodeURIComponent(`${googleQuery} lirik chord`)}`
    : '';

  const showGoogleSearch = Boolean(googleSearchUrl);

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

  /** True when a selection-scoped command cannot run yet. */
  const noSelection = disabled || !hasSelection;
  const noSelectionHint = 'Blok sebagian teks lirik dulu';

  const selectionMenuItems = useMemo(
    () => [
      {
        key: 'align-bars',
        icon: '||',
        label: 'Sejajarkan Bar',
        title: 'Rapikan posisi garis bar (|) pada teks yang dipilih',
        shortcut: 'Ctrl+Shift+B',
        disabled: noSelection,
        disabledHint: noSelectionHint,
        onSelect: () => applyToSelection(alignSelectedBarlines),
      },
      {
        key: 'auto-align',
        icon: 'S',
        label: 'Sejajarkan Chord',
        title: 'Geser chord agar sejajar dengan suku kata di baris lirik bawahnya',
        disabled: noSelection,
        disabledHint: noSelectionHint,
        onSelect: () => applyToSelection(autoAlignChordLyricPairs),
      },
      { type: 'separator' },
      {
        key: 'transpose-down',
        icon: '♭',
        label: 'Transpose −1',
        title: 'Turunkan semua chord 1 semitone',
        disabled,
        onSelect: () => onTranspose?.(-1),
      },
      {
        key: 'transpose-up',
        icon: '♯',
        label: 'Transpose +1',
        title: 'Naikkan semua chord 1 semitone',
        disabled,
        onSelect: () => onTranspose?.(1),
      },
      { type: 'separator' },
      {
        key: 'wrap-bars',
        icon: 'W',
        label: 'Pecah Bar',
        hint: barsPerLine + ' bar/baris',
        title: 'Pecah chord menjadi beberapa bar per baris pada teks yang dipilih',
        shortcut: 'Ctrl+Shift+4',
        disabled: noSelection,
        disabledHint: noSelectionHint,
        onSelect: () => applyToSelection((text) => wrapBarsPerLine(text, barsPerLine)),
      },
      {
        key: 'bars-per-line',
        type: 'custom',
        render: (
          <label className="ed-dropdown-field" htmlFor="lyric-format-bars-per-line">
            <span>Bar per baris</span>
            <select
              id="lyric-format-bars-per-line"
              className="ed-dropdown-select"
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
        ),
      },
    ],
    // applyToSelection closes over the current text/selection, so the list has
    // to be rebuilt whenever those change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lyricsValue, selectionRange, barsPerLine, disabled]
  );

  const historyMenuItems = [
    {
      key: 'undo',
      icon: 'U',
      label: 'Batalkan',
      shortcut: 'Ctrl+Z',
      disabled,
      onSelect: () => lyricsRef?.current?.undo?.(),
    },
    {
      key: 'redo',
      icon: 'R',
      label: 'Ulangi',
      shortcut: 'Ctrl+Shift+Z',
      disabled,
      onSelect: () => lyricsRef?.current?.redo?.(),
    },
    { type: 'separator' },
    {
      key: 'find',
      icon: 'F',
      label: 'Cari / Ganti',
      shortcut: 'Ctrl+F',
      disabled,
      onSelect: () => lyricsRef?.current?.openSearchPanel?.(),
    },
  ];

  const documentMenuItems = [
    {
      key: 'clean',
      icon: 'B',
      label: 'Bersihkan Teks',
      title: 'Hapus spasi ganda, tab, baris kosong menumpuk, dan karakter tersembunyi dari hasil copy-paste',
      disabled,
      onSelect: () => applyToSelection(removeExtraSpacesAndBrokenLines),
    },
    {
      key: 'tag',
      icon: 'T',
      label: 'Tag Bagian',
      title: 'Deteksi Intro, Verse, Chorus, Bridge, instrumen (Gitar, Keys), cue (Stop, Fill in), dan metadata (Cue:, Intensitas:) lalu ubah menjadi tag [ ... ]',
      disabled,
      onSelect: () => applyToSelection(autoTagSongSections),
    },
    { type: 'separator' },
    {
      key: 'tidy',
      icon: 'X',
      label: 'Rapikan Semua...',
      hint: 'dengan pratinjau',
      title: 'Rapikan seluruh dokumen sekaligus: bersihkan teks, tag bagian/instrumen/cue, dan seragamkan chord',
      disabled,
      onSelect: openFormatPreview,
    },
    {
      key: 'copy',
      icon: 'C',
      label: 'Salin Lirik',
      title: 'Salin seluruh lirik ke papan klip',
      hint: copyFeedback || undefined,
      disabled,
      onSelect: () => onCopyLyrics?.(),
    },
  ];

  const insertMenuItems = [
    {
      key: 'piano',
      icon: 'P',
      label: 'Virtual Piano...',
      title: 'Buka Virtual Piano untuk memasukkan not ke lirik (Alt+P)',
      disabled: disabled || !showPianoControls,
      shortcut: 'Alt+P',
      onSelect: () => onOpenPiano?.(),
    },
  ];

  const menus = [
    { key: 'riwayat', label: 'Riwayat', items: historyMenuItems },
    { key: 'format', label: 'Format', items: selectionMenuItems },
    { key: 'dokumen', label: 'Dokumen', items: documentMenuItems },
  ];

  if (showPianoControls || showSaveCancelButtons) {
    menus.push({
      key: 'sisip',
      label: 'Sisip',
      items: showSaveCancelButtons
        ? [
            ...insertMenuItems,
            { type: 'separator' },
            {
              key: 'save',
              icon: 'K',
              label: savingLyrics ? 'Menyimpan...' : 'Simpan Lirik',
              disabled: disabled || savingLyrics,
              onSelect: () => handleSaveLyrics?.(),
            },
            {
              key: 'cancel',
              icon: 'Z',
              label: 'Batal Edit',
              disabled,
              onSelect: () => handleCancelEditLyrics?.(),
            },
          ]
        : insertMenuItems,
    });
  }

  return (
    <div className="lyric-format">
      <div className="lyric-format-row">
        <EditorMenuBar menus={menus} ariaLabel="Menu editor lirik" />

        {(showPianoControls || typeof onTranspose === 'function' || showGoogleSearch) && (
          <div className="lyric-format-quick">
            {showGoogleSearch && (
              <a
                className="lyric-quick-btn lyric-quick-search"
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Cari lirik & chord "${googleQuery}" di Google`}
                aria-label={`Cari lirik dan chord ${googleQuery} di Google`}
              >
                <span aria-hidden="true">🔍</span>
                <span className="lyric-quick-label">Cari di Google</span>
              </a>
            )}

            {typeof onTranspose === 'function' && (
              <>
                <button
                  type="button"
                  className="lyric-quick-btn lyric-quick-transpose"
                  onClick={() => onTranspose(-1)}
                  disabled={disabled}
                  title="Turunkan semua chord 1 semitone"
                >
                  <span aria-hidden="true">♭</span>
                  <span className="lyric-quick-label">−1</span>
                </button>
                <button
                  type="button"
                  className="lyric-quick-btn lyric-quick-transpose"
                  onClick={() => onTranspose(1)}
                  disabled={disabled}
                  title="Naikkan semua chord 1 semitone"
                >
                  <span aria-hidden="true">♯</span>
                  <span className="lyric-quick-label">+1</span>
                </button>
              </>
            )}

            {showPianoControls && (
              <>
                <button
                  type="button"
                  className={`lyric-quick-btn lyric-quick-piano${pianoOpen ? ' is-active' : ''}`}
                  onClick={() => onOpenPiano?.()}
                  disabled={disabled}
                  aria-pressed={pianoOpen}
                  title="Virtual Piano (Alt+P)"
                >
                  <span aria-hidden="true">🎹</span>
                  <span className="lyric-quick-label">Piano</span>
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
          aria-label="Pratinjau Rapikan Semua"
          onClick={() => setFormatPreview(null)}
        >
          <div
            className="modal song-lyrics-format-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lyric-format-preview-head">
              <h3>Pratinjau Rapikan Semua</h3>
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
                Tidak ada yang perlu diubah - penulisan lirik sudah rapi.
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
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
