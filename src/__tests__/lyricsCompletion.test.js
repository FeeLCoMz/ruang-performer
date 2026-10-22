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
    for (const section of ['[Intro]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Outro]', '[Coda]']) {
      expect(labels, section).toContain(section);
    }
  });

  test('Given metadata keys, Then the syntaxes from the removed help modal are all present', () => {
    // These were the entries in the old "Panduan Metadata Lirik" modal.
    // Autocomplete diturunkan 1:1 dari METADATA_KEYS + MODULATION_KEYWORDS,
    // dan sekarang hanya ditawarkan dalam bentuk braket.
    // "Instrument:" bukan lagi keyword metadata (baris instrumen memakai
    // bentuk "[Gitar: ...]"), jadi tidak diharapkan di daftar ini.
    for (const key of [
      '[Modulation: ]',
      '[Cue: ]',
      '[Intensitas: ]',
      '[Feel: ]',
      '[FX: ]',
      '[Notes: ]',
      '[Original Key: ]',
      '[Time Signature: ]',
    ]) {
      expect(labels, key).toContain(key);
    }
    // Keyword patch/MIDI dibaca modul MIDI, bukan ChordDisplay.
    for (const midiKey of ['[Patch: ]', '[Preset: ]', '[Layer: ]', '[CH: ]', '[Bank MSB: ]']) {
      expect(labels, midiKey).not.toContain(midiKey);
    }
  });

  test('Given instrument names, Then applying one inserts a bracketed tag', () => {
    const guitar = lyricsCompletionOptions.find((option) => option.label === '[Guitar: ]');
    expect(guitar).toBeTruthy();
    expect(guitar.apply).toBe('[Guitar: ]');
    expect(lyricsCompletionOptions.some((option) => option.label === 'Guitar')).toBe(false);
  });

  test('Given cue marks, Then only the bracketed form is offered', () => {
    expect(labels).toContain('[Stop]');
    expect(labels).not.toContain('(Stop)');
  });

  test('Given metadata keys, Then only the bracketed form is offered', () => {
    expect(labels).toContain('[Original Key: ]');
    expect(labels).not.toContain('Original Key:');
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
