import React from "react";
import SongLyricsTextarea from "./SongLyricsTextarea.jsx";
import LyricsEditorWorkspace from "./LyricsEditorWorkspace.jsx";
import LyricsFormatToolbar from "./LyricsFormatToolbar.jsx";
import LyricsEditorTools from "./LyricsEditorTools.jsx";

/**
 * SongLyricsEditorPanel
 *
 * Layout contract for the lyrics editor:
 *
 *   [ Tools ]   history, search, MIDI cue, piano   <- not formatting
 *   [ Format ]  selection vs document actions      <- formatting
 *   [ Editor | Preview ]
 *
 * Tools and formatting used to be one flat ribbon of nine buttons, which mixed
 * three different concerns (history, insertion, formatting). They are separate
 * components now, stacked directly above the editor so every control sits next
 * to the text it acts on.
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
  const [isToolsOpen, setIsToolsOpen] = React.useState(false);
  const [selectionRange, setSelectionRange] = React.useState({ start: null, end: null });
  // Tracked separately from the character offsets: the preview syncs by line,
  // and a line can hold many caret positions.
  const [activeLine, setActiveLine] = React.useState(null);

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
    insertNotesEnabled = false,
  } = editorActions;

  const textarea = (
    <SongLyricsTextarea
      lyricsDisplayRef={lyricsRef}
      editedLyrics={lyricsValue}
      setEditedLyrics={setLyricsValue}
      autoFocus={autoFocus}
      onSelectionChange={handleSelectionChange}
      disabled={disabled}
    />
  );

  return (
    <>
      {error && <div className="song-lyrics-error">{error}</div>}

      {showActions && (
        <div className="lyric-editor-controls">
          <div className="lyric-editor-controls-head">
            <button
              type="button"
              className={`btn btn-secondary lyric-editor-tools-toggle${isToolsOpen ? ' is-open' : ''}`}
              onClick={() => setIsToolsOpen((prev) => !prev)}
              aria-expanded={isToolsOpen}
              aria-controls="lyric-editor-tools-panel"
              title="Riwayat, pencarian, dan piano"
            >
              <span aria-hidden="true">{isToolsOpen ? '▾' : '▸'}</span>
              Alat Editor
            </button>
            <span className="lyric-editor-controls-hint">
              Format teks ada di bawah ini · riwayat &amp; pencarian di panel Alat
            </span>
          </div>

          {isToolsOpen && (
            <div id="lyric-editor-tools-panel" className="lyric-editor-tools-panel">
              <LyricsEditorTools
                disabled={disabled}
                lyricsRef={lyricsRef}
                showPianoControls={showPianoControls}
                onOpenPiano={onOpenPiano}
                insertNotesEnabled={insertNotesEnabled}
                showSaveCancelButtons={showSaveCancelButtons}
                savingLyrics={savingLyrics}
                handleSaveLyrics={handleSaveLyrics}
                handleCancelEditLyrics={handleCancelEditLyrics}
              />
            </div>
          )}

          <LyricsFormatToolbar
            disabled={disabled}
            lyricsRef={lyricsRef}
            lyricsValue={lyricsValue}
            setLyricsValue={setLyricsValue}
            selectionRange={selectionRange}
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
        >
          {textarea}
        </LyricsEditorWorkspace>
      ) : (
        textarea
      )}
    </>
  );
}
