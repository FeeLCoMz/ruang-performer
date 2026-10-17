import React, { useEffect, useMemo, useRef, useState } from "react";
import ChordDisplay from "./ChordDisplay.jsx";
import { parseLines } from "../utils/chordUtils.js";
import { STORAGE_KEYS } from "../utils/storageKeys.js";

const PREVIEW_MODE_STORAGE_KEY = STORAGE_KEYS.LYRICS_PREVIEW_MODE;
export const PREVIEW_MODES = {
  OFF: "off",
  SPLIT: "split",
  PREVIEW: "preview",
};

/** Label singkat untuk switcher tampilan yang selalu terlihat. */
const MODE_LABELS = {
  [PREVIEW_MODES.OFF]: { icon: "✍️", label: "Editor", title: "Editor saja" },
  [PREVIEW_MODES.SPLIT]: { icon: "🔀", label: "Duo", title: "Editor + Preview berdampingan" },
  [PREVIEW_MODES.PREVIEW]: { icon: "👁", label: "Preview", title: "Preview saja" },
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
  /**
   * Preview mode. Controlled by the parent so the editor's Tampilan menu and
   * this workspace cannot disagree; falls back to the stored value when used
   * standalone.
   */
  previewMode: controlledMode = null,
  onPreviewModeChange,
}) {
  const [uncontrolledMode, setUncontrolledMode] = useState(readStoredMode);
  const previewMode = controlledMode ?? uncontrolledMode;
  const setPreviewMode = (next) => {
    if (typeof onPreviewModeChange === 'function') onPreviewModeChange(next);
    else setUncontrolledMode(next);
  };
  const previewScrollRef = useRef(null);
  const followRef = useRef(true);
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only persist when this component owns the mode; a controlled parent
    // already stores it, and writing here would race that decision.
    if (controlledMode !== null) return;
    window.localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, previewMode);
  }, [previewMode, controlledMode]);

  const showPreview = previewMode !== PREVIEW_MODES.OFF;
  const hideEditor = previewMode === PREVIEW_MODES.PREVIEW;

  /** Parse the lyric once per text change and share it across both consumers. */
  const parsedRows = useMemo(
    () => (previewLyrics ? parseLines(previewLyrics.split(/\r?\n/), 0) : []),
    [previewLyrics]
  );

  /**
   * Rows parsed from the caret's own line get a stronger highlight than rows
   * that were merely expanded from a repeated section reference, since only the
   * former were actually typed at that position.
   */
  const parsedRowIndexes = useMemo(() => {
    if (activeLine === null) return { direct: [], expanded: [] };
    const direct = [];
    const expanded = [];
    parsedRows.forEach((row, index) => {
      if (row.sourceLine !== activeLine) return;
      if (row.isExpandedFromSection) expanded.push(index);
      else direct.push(index);
    });
    return { direct, expanded };
  }, [parsedRows, activeLine]);

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
  const isDirty = typeof baselineLyrics === "string" && baselineLyrics !== previewLyrics;

  return (
    <div
      className={`lyrics-editor-workspace${showPreview ? " has-preview" : ""}${
        hideEditor ? " is-preview-only" : ""
      }`}
    >
      <div className="lyrics-editor-workspace-bar">
        <span className="lyrics-editor-workspace-title">✍️ Editor</span>
        {/* Switcher tampilan yang selalu terlihat: satu tap untuk pindah
            Editor / Editor+Preview / Preview, tanpa harus buka menu Tampilan. */}
        <div
          className="lyrics-editor-mode-switcher"
          role="group"
          aria-label="Tampilan editor"
        >
          {[PREVIEW_MODES.OFF, PREVIEW_MODES.SPLIT, PREVIEW_MODES.PREVIEW].map((mode) => (
            <button
              key={mode}
              type="button"
              className={`lyrics-editor-mode-btn${previewMode === mode ? " is-active" : ""}`}
              onClick={() => setPreviewMode(mode)}
              aria-pressed={previewMode === mode}
              title={MODE_LABELS[mode].title}
            >
              <span aria-hidden="true">{MODE_LABELS[mode].icon}</span>
              {MODE_LABELS[mode].label}
            </button>
          ))}
        </div>
        {typeof baselineLyrics === "string" && (
          <span
            className={`lyrics-editor-dirty-badge${isDirty ? " is-dirty" : ""}`}
            title={isDirty ? "Ada perubahan yang belum disimpan" : "Tidak ada perubahan"}
          >
            {isDirty ? "● Belum disimpan" : "✓ Tersimpan"}
          </span>
        )}
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
