function buildEditorActions({
  barsPerLine,
  setBarsPerLine,
  handleAlignSelectedBarlines,
  handleWrap4BarsPerLine,
  handleWrapBarsPerLine,
  showSaveCancelButtons,
  savingLyrics,
  handleSaveLyrics,
  handleCancelEditLyrics,
  barsPerLineSelectId,
  onOpenPiano,
  insertNotesToLyrics,
  setInsertNotesToLyrics,
  insertNoteFormat,
  setInsertNoteFormat,
  insertTrailingSpace,
  setInsertTrailingSpace,
  keySignature,
}) {
  return {
    barsPerLine,
    setBarsPerLine,
    handleAlignSelectedBarlines,
    handleWrap4BarsPerLine,
    handleWrapBarsPerLine,
    showMetadataHelpButton: true,
    showSaveCancelButtons,
    savingLyrics,
    handleSaveLyrics,
    handleCancelEditLyrics,
    barsPerLineSelectId,
    showPianoControls: true,
    onOpenPiano,
    insertNotesEnabled: insertNotesToLyrics,
    onToggleInsertNotes: setInsertNotesToLyrics,
    insertNoteFormat,
    onChangeInsertNoteFormat: setInsertNoteFormat,
    insertTrailingSpace,
    onToggleInsertTrailingSpace: setInsertTrailingSpace,
    keySignature,
  };
}

export function buildSongViewEditorActions(params) {
  return buildEditorActions({
    ...params,
    keySignature: params.insertNumberKeySignature,
    showSaveCancelButtons: true,
    barsPerLineSelectId: 'bars-per-line',
  });
}

export function buildAddEditEditorActions(params) {
  return buildEditorActions({
    ...params,
    showSaveCancelButtons: false,
    barsPerLineSelectId: 'bars-per-line-add-edit',
  });
}
