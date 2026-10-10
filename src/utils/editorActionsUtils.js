/**
 * Shape the editor-action props passed down to SongLyricsEditorPanel.
 *
 * Formatting actions are intentionally absent: LyricsFormatToolbar reads the
 * lyrics state directly, so there is nothing for the page to wire up. What
 * remains is the non-formatting surface (piano, save/cancel).
 */
function buildEditorActions({
  showSaveCancelButtons,
  savingLyrics,
  handleSaveLyrics,
  handleCancelEditLyrics,
  onOpenPiano,
  insertNotesToLyrics,
}) {
  return {
    showSaveCancelButtons,
    savingLyrics,
    handleSaveLyrics,
    handleCancelEditLyrics,
    showPianoControls: true,
    onOpenPiano,
    insertNotesEnabled: insertNotesToLyrics,
  };
}

export function buildSongViewEditorActions(params) {
  return buildEditorActions({ ...params, showSaveCancelButtons: true });
}

export function buildAddEditEditorActions(params) {
  return buildEditorActions({ ...params, showSaveCancelButtons: false });
}
