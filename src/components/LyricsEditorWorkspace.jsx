import React, { useEffect, useMemo, useRef, useState } from "react";
import ChordDisplay from "./ChordDisplay.jsx";
import { parseLines } from "../utils/chordUtils.js";

const PREVIEW_MODE_STORAGE_KEY = "ruangperformer_lyrics_preview_mode";
const PREVIEW_MODES = {
  OFF: "off",
  SPLIT: "split",
  PREVIEW: "preview",
};

function readStoredMode() {
  if (typeof window === "undefined") return PREVIEW_MODES.SPLIT;
  const stored = window.localStorage.getItem(PREVIEW_MODE_STORAGE_KEY);
  if (stored === PREVIEW_MODES.OFF || stored === PREVIEW_MODES.SPLIT || stored === PREVIEW_MODES.PREVIEW) {
    return stored;
  }
  return PREVIEW_MODES.SPLIT;
}

/**
 * LyricsEditorWorkspace
 * Layout dua kolom untuk mode edit lirik: textarea edit di kiri, hasil render
 * (ChordDisplay) di kanan sehingga user bisa melihat hasil sambil mengetik.
 * Kolom preview bisa disembunyikan lewat tombol mode agar tetap nyaman di layar kecil.
 */
export default function LyricsEditorWorkspace({
  children,
  previewLyrics = "",
  song = null,
  previewProps = {},
  baselineLyrics = null,
  /** 1-based line the caret is on in the editor. Drives preview highlighting. */
  activeLine = null,
}) {
  const [previewMode, setPreviewMode] = useState(readStoredMode);
  const previewScrollRef = useRef(null);
  const followRef = useRef(true);
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, previewMode);
  }, [previewMode]);

  const showPreview = previewMode !== PREVIEW_MODES.OFF;
  const hideEditor = previewMode === PREVIEW_MODES.PREVIEW;

  /**
   * Rows parsed from the caret's own line get a stronger highlight than rows
   * that were merely expanded from a repeated section reference, since only the
   * former were actually typed at that position.
   */
  const parsedRowIndexes = useMemo(() => {
    if (activeLine === null) return { direct: [], expanded: [] };
    const rows = parseLines(previewLyrics.split(/\r?\n/), 0);
    const direct = [];
    const expanded = [];
    rows.forEach((row, index) => {
      if (row.sourceLine !== activeLine) return;
      if (row.isExpandedFromSection) expanded.push(index);
      else direct.push(index);
    });
    return { direct, expanded };
  }, [previewLyrics, activeLine]);

  // Keep the preview scrolled to whatever is being edited. Disengages as soon
  // as the user scrolls the preview themselves, so it never fights them.
  useEffect(() => {
    if (!showPreview || !followRef.current || activeLine === null) return;
    const container = previewScrollRef.current;
    if (!container) return;

    const rows = container.querySelectorAll('.cd-sync-row');
    if (!rows.length) return;

    const target = rows[0];
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top;

    // Only scroll when the row is outside the comfortable middle band.
    const band = containerRect.height * 0.3;
    if (offset >= band && offset <= containerRect.height - band) return;

    container.scrollTop += offset - containerRect.height * 0.35;
  }, [activeLine, showPreview, parsedRowIndexes]);

  const handlePreviewScroll = () => {
    if (!followRef.current) return;
    // A programmatic scroll also fires this handler; only a real user gesture
    // should turn following off, so compare against the last set position.
    setIsFollowing(false);
    followRef.current = false;
  };

  const resumeFollowing = () => {
    followRef.current = true;
    setIsFollowing(true);
  };

  const previewSong = { ...(song || {}), lyrics: previewLyrics };
  const lineCount = previewLyrics ? previewLyrics.split(/\r?\n/).length : 0;
  const sectionCount = previewLyrics
    ? parseLines(previewLyrics.split(/\r?\n/), 0).filter((line) => line.type === "structure").length
    : 0;
  const isDirty = typeof baselineLyrics === "string" && baselineLyrics !== previewLyrics;

  return (
    <div
      className={`lyrics-editor-workspace${showPreview ? " has-preview" : ""}${
        hideEditor ? " is-preview-only" : ""
      }`}
    >
      <div className="lyrics-editor-workspace-bar">
        <span className="lyrics-editor-workspace-title">✍️ Editor</span>
        <span className="lyrics-editor-workspace-stats">{lineCount} baris · {sectionCount} bagian</span>
        {typeof baselineLyrics === "string" && (
          <span
            className={`lyrics-editor-dirty-badge${isDirty ? " is-dirty" : ""}`}
            title={isDirty ? "Ada perubahan yang belum disimpan" : "Tidak ada perubahan"}
          >
            {isDirty ? "● Belum disimpan" : "✓ Tersimpan"}
          </span>
        )}
        <div className="lyrics-editor-preview-toggle" role="group" aria-label="Mode tampilan editor lirik">
          <button
            type="button"
            className={`btn ${previewMode === PREVIEW_MODES.OFF ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setPreviewMode(PREVIEW_MODES.OFF)}
            aria-pressed={previewMode === PREVIEW_MODES.OFF}
            title="Sembunyikan preview, editor pakai lebar penuh"
          >
            ✍️ Editor
          </button>
          <button
            type="button"
            className={`btn ${previewMode === PREVIEW_MODES.SPLIT ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setPreviewMode(PREVIEW_MODES.SPLIT)}
            aria-pressed={previewMode === PREVIEW_MODES.SPLIT}
            title="Tampilkan editor dan preview berdampingan"
          >
            ⇋ Split
          </button>
          <button
            type="button"
            className={`btn ${previewMode === PREVIEW_MODES.PREVIEW ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setPreviewMode(PREVIEW_MODES.PREVIEW)}
            aria-pressed={previewMode === PREVIEW_MODES.PREVIEW}
            title="Tampilkan preview saja (lebih lebar)"
          >
            👁 Preview
          </button>
        </div>
      </div>

      <div className="lyrics-editor-workspace-body">
        {!hideEditor && <div className="lyrics-editor-pane">{children}</div>}

        {showPreview && (
          <div className="lyrics-editor-preview" aria-live="polite">
            <div className="lyrics-editor-preview-header">
              <span className="lyrics-editor-preview-title">👁 Preview</span>
              {activeLine !== null && !isFollowing ? (
                <button
                  type="button"
                  className="lyrics-editor-preview-follow"
                  onClick={resumeFollowing}
                  title="Ikuti lagi baris yang sedang diedit"
                >
                  ⤓ Ikuti editor
                </button>
              ) : (
                <span className="lyrics-editor-preview-hint">
                  {activeLine !== null ? `Baris ${activeLine}` : 'Hasil tampil saat dibaca performer'}
                </span>
              )}
            </div>
            <div
              className="lyrics-editor-preview-scroll"
              ref={previewScrollRef}
              onScroll={handlePreviewScroll}
            >
              <ChordDisplay
                song={previewSong}
                transpose={0}
                zoom={1}
                activeLine={activeLine}
                {...previewProps}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
