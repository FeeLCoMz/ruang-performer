import { describe, test, expect } from 'vitest';
import { lyricsCompletionOptions } from '../utils/lyricsCompletion.js';

describe('lyricsCompletionOptions', () => {
  const labels = lyricsCompletionOptions.map((option) => option.label);

  test('Given a section tag, Then the closing bracket is included in the label but not duplicated on insert', () => {
    const intro = lyricsCompletionOptions.find((option) => option.label === '[Intro]');
    expect(intro).toBeTruthy();
    // The label shows the finished tag; applying it must not leave "[[Intro]]".
    expect(intro.apply).toBeUndefined();
  });

  test('Given the documented section set, Then every section is offered', () => {
    for (const section of ['[Intro]', '[Verse 1]', '[Chorus]', '[Bridge]', '[Outro]', '[Coda]']) {
      expect(labels, section).toContain(section);
    }
  });

  test('Given the MIDI cue template, Then it is offered with the bracket prefix', () => {
    expect(labels).toContain('[Keys:');
    const cue = lyricsCompletionOptions.find((option) => option.label === '[Keys:');
    expect(cue.apply).toBe('[Keys: ');
  });

  test('Given metadata keys, Then the syntaxes from the removed help modal are all present', () => {
    // These were the entries in the old "Panduan Metadata Lirik" modal.
    for (const key of [
      'Patch:',
      'Preset:',
      'Instrument:',
      'Modulation:',
      'Original Key:',
      'Cue:',
      'Intensitas:',
      'Feel:',
      'FX:',
      'Notes:',
    ]) {
      expect(labels, key).toContain(key);
    }
  });

  test('Given instrument names, Then applying one adds the colon separator', () => {
    const guitar = lyricsCompletionOptions.find((option) => option.label === 'Guitar');
    expect(guitar).toBeTruthy();
    expect(guitar.apply).toBe('Guitar: ');
  });

  test('Given every option, Then each carries enough context to be useful in the popup', () => {
    for (const option of lyricsCompletionOptions) {
      expect(option.label, option.label).toBeTruthy();
      expect(option.type, option.label).toBeTruthy();
    }
  });

  test('Given the option list, Then there are no duplicate labels', () => {
    expect(new Set(labels).size).toBe(labels.length);
  });
});
