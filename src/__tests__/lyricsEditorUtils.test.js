import { describe, test, expect, vi } from 'vitest';
import {
  applyTransformToSelection,
  autoAlignChordLyricPairs,
  autoTagSongSections,
  buildInsertNoteToken,
  detectSectionBadges,
  formatWholeLyricsDocument,
  insertLineAtCursor,
  removeExtraSpacesAndBrokenLines,
  replaceSelectionWithToken,
  standardizeChordNotation,
  transposeLyricsText,
} from '../utils/lyricsEditorUtils.js';
import { handleExportPDF, handleExportText } from '../utils/songHandlers.js';

describe('lyricsEditorUtils', () => {
  test('buildInsertNoteToken returns bracket token with trailing space', () => {
    expect(buildInsertNoteToken({ note: 'C' })).toBe('[C] ');
  });

  test('buildInsertNoteToken supports plain and number format', () => {
    expect(buildInsertNoteToken({ note: 'C#', insertNoteFormat: 'plain', insertTrailingSpace: false })).toBe('C#');
    expect(buildInsertNoteToken({ note: 'G', insertNoteFormat: 'number', keySignature: 'G' })).toBe('1 ');
  });

  test('replaceSelectionWithToken replaces selected text and returns cursor', () => {
    const result = replaceSelectionWithToken({
      text: 'Hello World',
      selectionStart: 6,
      selectionEnd: 11,
      token: '[C] ',
    });

    expect(result.nextText).toBe('Hello [C] ');
    expect(result.nextCursor).toBe(10);
  });

  test('replaceSelectionWithToken appends token when selection is missing', () => {
    const result = replaceSelectionWithToken({
      text: 'Lyric',
      selectionStart: undefined,
      selectionEnd: undefined,
      token: 'Am',
    });

    expect(result.nextText).toBe('LyricAm');
    expect(result.nextCursor).toBe(7);
  });

  test('removeExtraSpacesAndBrokenLines cleans copied lyrics noise', () => {
    const input = 'Verse 1   \n\n\n[C]Hello   world\t\t\nAm   F';
    expect(removeExtraSpacesAndBrokenLines(input)).toBe('Verse 1\n\n[C]Hello world\nAm F');
  });

  test('removeExtraSpacesAndBrokenLines removes hidden directional characters', () => {
    const input = '\u200ECm D#\n\u200EA# Cm';
    expect(removeExtraSpacesAndBrokenLines(input)).toBe('Cm D#\nA# Cm');
  });

  test('autoTagSongSections normalizes common song section labels', () => {
    const input = 'Intro:\nVerse 1\nPre Chorus\nPost Chorus\nReff\nBridge';
    expect(autoTagSongSections(input)).toBe('[Intro]\n[Verse 1]\n[Pre-Chorus]\n[Post-Chorus]\n[Chorus]\n[Bridge]');
  });

  test('autoTagSongSections keeps other text on the same line when labeling a section', () => {
    const input = 'Verse 1: Aku kembali\nPre Chorus - sampai\nChorus: na na';
    expect(autoTagSongSections(input)).toBe('[Verse 1] Aku kembali\n[Pre-Chorus] sampai\n[Chorus] na na');
  });

  test('detectSectionBadges returns section labels with line numbers', () => {
    expect(detectSectionBadges('[Intro]\nAm F\nPost Chorus:\nChorus:')).toEqual([
      { lineNumber: 1, label: 'Intro', tone: 'intro' },
      { lineNumber: 3, label: 'Post-Chorus', tone: 'post-chorus' },
      { lineNumber: 4, label: 'Chorus', tone: 'chorus' },
    ]);
  });

  test('standardizeChordNotation normalizes chord quality spellings', () => {
    const input = '[cmajor7] line\nAminor DMajor7/F#\nModulation: bbminor';
    expect(standardizeChordNotation(input)).toBe('[Cmaj7] line\n| Am | Dmaj7/F# |\nModulation: Bbm');
  });

  test('standardizeChordNotation converts compact section chords into bar grid', () => {
    const input = 'Intro: c..g..aminor..fmaj7..';
    expect(standardizeChordNotation(input)).toBe('Intro: | C | G | Am | Fmaj7 |');
  });

  test('standardizeChordNotation normalizes spacing inside existing grid bars', () => {
    const input = '|cmajor7| g | aminor |f|';
    expect(standardizeChordNotation(input)).toBe('| Cmaj7 | G | Am | F |');
  });

  test('standardizeChordNotation handles invisible directional marks from copied lyrics', () => {
    const input = '\u200ECm D#\n\u200EMendung idak guruh jugo idak tibo\n\u200EA# Cm';
    expect(standardizeChordNotation(input)).toBe('| Cm | D# |\nMendung idak guruh jugo idak tibo\n| A# | Cm |');
  });

  test('transposeLyricsText transposes inline, chord-line, and modulation chords', () => {
    const input = '[C]Hello\nAm F G\nModulation: Bb';
    expect(transposeLyricsText(input, 2)).toBe('[D]Hello\nBm G A\nModulation: C');
  });

  test('formatWholeLyricsDocument cleans, tags sections, and standardises chords at once', () => {
    const input = 'intro:\n\n\n\u200Ecmajor7   aminor\nreff:   fmaj   g';
    const output = formatWholeLyricsDocument(input);

    // copy-paste noise + hidden chars removed, sections tagged, chords standardised
    expect(output).not.toContain('\u200E');
    expect(output).not.toContain('  ');
    expect(output).toContain('[Intro]');
    expect(output).toContain('[Chorus]');
    expect(output).toContain('Cmaj7');
    expect(output).toContain('Am');
    expect(output).not.toContain('cmajor7');
    expect(output).not.toContain('aminor');
    // the earlier chord grid keeps its bars instead of leaking into the section tag
    expect(output.split('\n').filter((line) => line.startsWith('|'))).toHaveLength(1);
  });

  test('applyTransformToSelection only touches the selected range', () => {
    const text = 'Am F\nHello world';
    const result = applyTransformToSelection({
      text,
      selectionStart: 0,
      selectionEnd: 4,
      transform: (segment) => transposeLyricsText(segment, 2),
    });

    expect(result.nextText).toBe('Bm G\nHello world');
    expect(result.changed).toBe(true);
    expect(result.selectionEmpty).toBe(false);
    expect(result.nextSelectionStart).toBe(0);
    expect(result.nextSelectionEnd).toBe(4);
  });

  test('applyTransformToSelection falls back to the whole document without a selection', () => {
    const text = 'Am F\nHello world';
    const result = applyTransformToSelection({
      text,
      selectionStart: null,
      selectionEnd: null,
      transform: (segment) => transposeLyricsText(segment, 2),
    });

    expect(result.nextText).toBe('Bm G\nHello world');
    expect(result.selectionEmpty).toBe(true);
  });

  test('insertLineAtCursor replaces the selected text instead of leaving it behind', () => {
    const result = insertLineAtCursor({
      text: 'Am F\nHello',
      selectionStart: 0,
      selectionEnd: 4,
      label: '[Chorus]',
    });

    // Replacing the selection must not leave a stray blank line: the inserted
    // text already ends with its own newline, so the trailing one is consumed.
    expect(result.nextText).toBe('[Chorus]\nHello');
    expect(result.nextText).not.toContain('Am F');
  });

  test('insertLineAtCursor keeps following lines when the selection spans a newline', () => {
    const result = insertLineAtCursor({
      text: 'Am F\nHello\nWorld',
      selectionStart: 0,
      selectionEnd: 11,
      label: '[Chorus]',
    });

    expect(result.nextText).toBe('[Chorus]\nWorld');
  });

  test('insertLineAtCursor at a bare cursor keeps the existing newline intact', () => {
    const result = insertLineAtCursor({
      text: 'Am F\nHello',
      selectionStart: 4,
      selectionEnd: 4,
      label: '[Chorus]',
    });

    // Caret insertion (no selection) must not swallow the user's line break.
    expect(result.nextText).toBe('Am F\n[Chorus]\nHello');
  });

  test('handleExportText applies the active transpose to chords and key metadata', async () => {
    const createObjectURL = vi.fn(() => 'blob:export');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const anchor = { href: '', click };

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    handleExportText(
      { title: 'Song A' },
      'Artist B',
      'C',
      'Original Key: G',
      96,
      'Am\nF G',
      2,
      () => {}
    );

    expect(createObjectURL.mock.calls.length).toBe(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/plain');

    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

    expect(text).toContain('Key: D');
    expect(text).toContain('Bm\nG A');
    expect(click.mock.calls.length).toBe(1);

    vi.restoreAllMocks();
  });

  test('handleExportPDF embeds the current transposed lyrics and key', () => {
    const printWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(printWindow);

    handleExportPDF(
      { title: 'Song A' },
      'Artist B',
      'C',
      'Original Key: G',
      96,
      'Am\nF G',
      2,
      () => {}
    );

    const html = printWindow.document.write.mock.calls[0][0];
    expect(html).toContain('Key:</strong> D');
    expect(html).toContain('Bm\nG A');
    expect(printWindow.print.mock.calls.length).toBe(1);

    vi.restoreAllMocks();
  });

  test('autoAlignChordLyricPairs nudges chord positions toward lyric syllables', () => {
    const input = 'C G\nHi world';
    expect(autoAlignChordLyricPairs(input)).toBe('C  G\nHi world');
  });
});
