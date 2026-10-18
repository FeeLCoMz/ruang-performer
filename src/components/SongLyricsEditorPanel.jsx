import React from "react";
import SongLyricsTextarea from "./SongLyricsTextarea.jsx";
import LyricsEditorWorkspace, { PREVIEW_MODES } from "./LyricsEditorWorkspace.jsx";
import LyricsFormatToolbar from "./LyricsFormatToolbar.jsx";

/**
 * SongLyricsEditorPanel
 *
 * Layout contract for the lyrics editor:
 *
 *   [ Menu bar ]  Riwayat / Format / Dokumen / Sisip / Tampilan
 *   [ Editor | Preview ]
 *
 * There is exactly ONE row of controls, and it is a menu bar rather than a
 * ribbon: the editor's commands outgrew the flat-button form, and the previous
 * "Alat" drawer hid undo/redo/search/piano behind a toggle. Everything is a
 * menu item now, styled consistently and visible on demand.
 *
 * Preview mode lives here rather than inside the workspace so the toolbar menu
 * and the workspace share one source of truth — otherwise "Tampilan" would
 * silently disagree with what is on screen.
 */

export default function SongLyricsEditorPanel({
  lyricsRef,
  lyricsValue,
  setLyricsValue,
  error,
  disabled = false,
  editorActions = {},
  autoFocus = false,
  showActions = true,
  showPreview = true,
  previewSong = null,
  previewProps = {},
  baselineLyrics = null,
}) {
  const [selectionRange, setSelectionRange] = React.useState({ start: null, end: null });
  // Tracked separately from the character offsets: the preview syncs by line,
  // and a line can hold many caret positions.
  const [activeLine, setActiveLine] = React.useState(null);
  // Shared with the toolbar's Tampilan menu so the menu and the visible layout
  // cannot drift apart.
  const [previewMode, setPreviewMode] = React.useState(() => {
    if (typeof window === 'undefined') return PREVIEW_MODES.SPLIT;
    const stored = window.localStorage.getItem('songEditor.previewMode');
    return stored === PREVIEW_MODES.OFF || stored === PREVIEW_MODES.SPLIT || stored === PREVIEW_MODES.PREVIEW
      ? stored
      : PREVIEW_MODES.SPLIT;
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem('songEditor.previewMode', previewMode);
    } catch {
      // Storage can fail in private mode; the choice still applies this session.
    }
  }, [previewMode]);

  const handleSelectionChange = React.useCallback((next) => {
    setSelectionRange({ start: next.start, end: next.end });
    if (Number.isInteger(next.lineNumber)) setActiveLine(next.lineNumber);
  }, []);
  const {
    showSaveCancelButtons = false,
    savingLyrics = false,
    handleSaveLyrics,
    handleCancelEditLyrics,
    showPianoControls = false,
    onOpenPiano,
    pianoOpen = false,
    onTranspose,
    onCopyLyrics,
    copyFeedback = '',
  } = editorActions;

  /**
   * The editor element, memoised.
   *
   * This is the hot path: the parent re-renders on EVERY keystroke (the lyrics
   * value, the selection range and the active line all change together). Without
   * this memo a fresh element is built each time and React walks the editor
   * subtree on every character — which is what made typing feel heavy, and gave
   * the editor a chance to remount and lose the caret.
   *
   * The stable pieces (`lyricsRef`, `handleSelectionChange`) are refs/callbacks;
   * `setLyricsValue` and `autoFocus` are stable for the page's lifetime.
   */
  const editorElement = React.useMemo(
    () => (
      <SongLyricsTextarea
        lyricsDisplayRef={lyricsRef}
        editedLyrics={lyricsValue}
        setEditedLyrics={setLyricsValue}
        autoFocus={autoFocus}
        onSelectionChange={handleSelectionChange}
        disabled={disabled}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lyricsValue, disabled]
  );

  const textarea = editorElement;

  return (
    <>
      {error && <div className="song-lyrics-error">{error}</div>}

      {showActions && (
        <div className="lyric-editor-controls">
          <LyricsFormatToolbar
            disabled={disabled}
            lyricsRef={lyricsRef}
            lyricsValue={lyricsValue}
            setLyricsValue={setLyricsValue}
            selectionRange={selectionRange}
            showPianoControls={showPianoControls}
            onOpenPiano={onOpenPiano}
            onTranspose={onTranspose}
            onCopyLyrics={onCopyLyrics}
            copyFeedback={copyFeedback}
            pianoOpen={pianoOpen}
            showSaveCancelButtons={showSaveCancelButtons}
            savingLyrics={savingLyrics}
            handleSaveLyrics={handleSaveLyrics}
            handleCancelEditLyrics={handleCancelEditLyrics}
            previewMode={previewMode}
            previewModes={PREVIEW_MODES}
            onPreviewModeChange={setPreviewMode}
          />
        </div>
      )}

      {showPreview ? (
        <LyricsEditorWorkspace
          previewLyrics={lyricsValue}
          song={previewSong}
          previewProps={previewProps}
          baselineLyrics={baselineLyrics}
          activeLine={activeLine}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
        >
          {textarea}
        </LyricsEditorWorkspace>
      ) : (
        textarea
      )}
    </>
  );
}
