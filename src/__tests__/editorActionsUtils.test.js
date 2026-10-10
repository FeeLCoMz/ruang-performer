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
    });

    expect(actions).toMatchObject({
      barsPerLine: 4,
      showMetadataHelpButton: true,
      showSaveCancelButtons: true,
      barsPerLineSelectId: 'bars-per-line',
      showPianoControls: true,
      insertNotesEnabled: true,
    });

    // Insert settings (format / key / trailing space) moved into the piano modal,
    // so the toolbar config must no longer carry them.
    expect(actions).not.toHaveProperty('insertNoteFormat');
    expect(actions).not.toHaveProperty('keySignature');
    expect(actions).not.toHaveProperty('onToggleInsertNotes');
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
    });

    expect(actions).toMatchObject({
      barsPerLine: 6,
      showMetadataHelpButton: true,
      showSaveCancelButtons: false,
      barsPerLineSelectId: 'bars-per-line-add-edit',
      showPianoControls: true,
      insertNotesEnabled: false,
    });
  });
});
