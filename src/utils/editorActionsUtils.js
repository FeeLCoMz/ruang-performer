function buildEditorActions({
  barsPerLine,
  setBarsPerLine,
  handleAlignSelectedBarlines,
  handleWrap4BarsPerLine,
  handleFormatWholeDocument,
  handleWrapBarsPerLine,
  showSaveCancelButtons,
  savingLyrics,
  handleSaveLyrics,
  handleCancelEditLyrics,
  barsPerLineSelectId,
  onOpenPiano,
  insertNotesToLyrics,
}) {
  return {
    barsPerLine,
    setBarsPerLine,
    handleAlignSelectedBarlines,
    handleWrap4BarsPerLine,
    handleFormatWholeDocument,
    handleWrapBarsPerLine,
    showSaveCancelButtons,
    savingLyrics,
    handleSaveLyrics,
    handleCancelEditLyrics,
    barsPerLineSelectId,
    showPianoControls: true,
    onOpenPiano,
    insertNotesEnabled: insertNotesToLyrics,
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
