import { describe, test, expect, vi } from 'vitest';
import { buildSongViewEditorActions, buildAddEditEditorActions } from '../utils/editorActionsUtils.js';

describe('editorActionsUtils', () => {
  test('buildSongViewEditorActions returns song-view edit action config', () => {
    const actions = buildSongViewEditorActions({
      barsPerLine: 4,
      setBarsPerLine: vi.fn(),
      handleAlignSelectedBarlines: vi.fn(),
      handleWrap4BarsPerLine: vi.fn(),
      handleWrapBarsPerLine: vi.fn(),
      savingLyrics: false,
      handleSaveLyrics: vi.fn(),
      handleCancelEditLyrics: vi.fn(),
      onOpenPiano: vi.fn(),
      insertNotesToLyrics: true,
      setInsertNotesToLyrics: vi.fn(),
      insertNoteFormat: 'number',
      setInsertNoteFormat: vi.fn(),
      insertTrailingSpace: true,
      setInsertTrailingSpace: vi.fn(),
      insertNumberKeySignature: 'G',
    });

    expect(actions).toMatchObject({
      barsPerLine: 4,
      showMetadataHelpButton: true,
      showSaveCancelButtons: true,
      barsPerLineSelectId: 'bars-per-line',
      showPianoControls: true,
      insertNotesEnabled: true,
      insertNoteFormat: 'number',
      insertTrailingSpace: true,
      keySignature: 'G',
    });
  });

  test('buildAddEditEditorActions returns add/edit action config', () => {
    const actions = buildAddEditEditorActions({
      barsPerLine: 6,
      setBarsPerLine: vi.fn(),
      handleAlignSelectedBarlines: vi.fn(),
      handleWrap4BarsPerLine: vi.fn(),
      handleWrapBarsPerLine: vi.fn(),
      onOpenPiano: vi.fn(),
      insertNotesToLyrics: false,
      setInsertNotesToLyrics: vi.fn(),
      insertNoteFormat: 'plain',
      setInsertNoteFormat: vi.fn(),
      insertTrailingSpace: false,
      setInsertTrailingSpace: vi.fn(),
      keySignature: 'C',
    });

    expect(actions).toMatchObject({
      barsPerLine: 6,
      showMetadataHelpButton: true,
      showSaveCancelButtons: false,
      barsPerLineSelectId: 'bars-per-line-add-edit',
      showPianoControls: true,
      insertNotesEnabled: false,
      insertNoteFormat: 'plain',
      insertTrailingSpace: false,
      keySignature: 'C',
    });
  });
});
