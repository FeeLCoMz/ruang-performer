import React from "react";
import SongLyricsEditActions from "./SongLyricsEditActions.jsx";
import SongLyricsTextarea from "./SongLyricsTextarea.jsx";
import LyricsEditorWorkspace from "./LyricsEditorWorkspace.jsx";

export default function SongLyricsEditorPanel({
  lyricsRef,
  lyricsValue,
  setLyricsValue,
  error,
  disabled = false,
  editorActions = {},
  autoFocus = false,
  showTips = true,
  tipsText = "",
  showActions = true,
  showPreview = true,
  previewSong = null,
  previewProps = {},
  baselineLyrics = null,
}) {
  const [selectionRange, setSelectionRange] = React.useState({ start: null, end: null });
  const {
    barsPerLine = 4,
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
    onToggleInsertNotes,
    insertNoteFormat = "bracket",
    onChangeInsertNoteFormat,
    insertTrailingSpace = false,
    onToggleInsertTrailingSpace,
    keySignature = "",
    onChangeInsertNumberKeySignature,
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
      {showTips && (
        <div className="song-lyrics-tips">
          {tipsText || (
            <>
              💡 Tips: Blok teks dulu. Pilih <b>2/4/6 Bar/Baris</b> lalu klik <b>Terapkan</b> (atau <kbd>Ctrl+Shift+4</kbd> untuk cepat 4 bar), gunakan <b>Sejajarkan Bar</b> atau <kbd>Ctrl+Shift+B</kbd>.
            </>
          )}
        </div>
      )}

      {showActions && (
        <SongLyricsEditActions
          disabled={disabled}
          barsPerLine={barsPerLine}
          setBarsPerLine={setBarsPerLine}
          handleAlignSelectedBarlines={handleAlignSelectedBarlines}
          handleWrap4BarsPerLine={handleWrap4BarsPerLine}
          handleFormatWholeDocument={handleFormatWholeDocument}
          handleWrapBarsPerLine={handleWrapBarsPerLine}
          showSaveCancelButtons={showSaveCancelButtons}
          savingLyrics={savingLyrics}
          handleSaveLyrics={handleSaveLyrics}
          handleCancelEditLyrics={handleCancelEditLyrics}
          barsPerLineSelectId={barsPerLineSelectId}
          showPianoControls={showPianoControls}
          onOpenPiano={onOpenPiano}
          insertNotesEnabled={insertNotesEnabled}
          onToggleInsertNotes={onToggleInsertNotes}
          insertNoteFormat={insertNoteFormat}
          onChangeInsertNoteFormat={onChangeInsertNoteFormat}
          insertTrailingSpace={insertTrailingSpace}
          onToggleInsertTrailingSpace={onToggleInsertTrailingSpace}
          keySignature={keySignature}
          onChangeInsertNumberKeySignature={onChangeInsertNumberKeySignature}
          lyricsRef={lyricsRef}
          lyricsValue={lyricsValue}
          setLyricsValue={setLyricsValue}
          selectionRange={selectionRange}
        />
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
