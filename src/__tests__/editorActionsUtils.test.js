import { describe, test, expect, vi } from 'vitest';
import { buildSongViewEditorActions, buildAddEditEditorActions } from '../utils/editorActionsUtils.js';

describe('editorActionsUtils', () => {
  test('buildSongViewEditorActions carries only the non-formatting surface', () => {
    const actions = buildSongViewEditorActions({
      savingLyrics: false,
      handleSaveLyrics: vi.fn(),
      handleCancelEditLyrics: vi.fn(),
      onOpenPiano: vi.fn(),
      insertNotesToLyrics: true,
    });

    expect(actions).toMatchObject({
      showSaveCancelButtons: true,
      showPianoControls: true,
      insertNotesEnabled: true,
    });

    // Formatting is handled inside LyricsFormatToolbar, which reads the lyrics
    // state directly. Passing format handlers through here would mean two
    // sources of truth for the same actions.
    for (const key of [
      'barsPerLine',
      'setBarsPerLine',
      'handleAlignSelectedBarlines',
      'handleWrap4BarsPerLine',
      'handleWrapBarsPerLine',
      'handleFormatWholeDocument',
      'barsPerLineSelectId',
    ]) {
      expect(actions, `${key} should no longer be part of the editor actions`).not.toHaveProperty(key);
    }
  });

  test('buildAddEditEditorActions returns add/edit config without formatting handlers', () => {
    const actions = buildAddEditEditorActions({
      onOpenPiano: vi.fn(),
      insertNotesToLyrics: false,
    });

    expect(actions).toMatchObject({
      showSaveCancelButtons: false,
      showPianoControls: true,
      insertNotesEnabled: false,
    });
    expect(actions).not.toHaveProperty('barsPerLineSelectId');
  });
});
