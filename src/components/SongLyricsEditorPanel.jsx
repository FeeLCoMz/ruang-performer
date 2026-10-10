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
  const [selectionRange, setSelectionRange] = React.useState({ start: null, end: null });
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
      onSelectionChange={setSelectionRange}
      disabled={disabled}
    />
  );

  return (
    <>
      {error && <div className="song-lyrics-error">{error}</div>}

      {showActions && (
        <div className="lyric-editor-controls">
          <LyricsEditorTools
            disabled={disabled}
            lyricsRef={lyricsRef}
            lyricsValue={lyricsValue}
            setLyricsValue={setLyricsValue}
            showPianoControls={showPianoControls}
            onOpenPiano={onOpenPiano}
            insertNotesEnabled={insertNotesEnabled}
            showSaveCancelButtons={showSaveCancelButtons}
            savingLyrics={savingLyrics}
            handleSaveLyrics={handleSaveLyrics}
            handleCancelEditLyrics={handleCancelEditLyrics}
          />

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
        >
          {textarea}
        </LyricsEditorWorkspace>
      ) : (
        textarea
      )}
    </>
  );
}
