import { describe, test, expect } from 'vitest';
import { chordToNumber, chordTextToNumberText, parseLines, splitSectionLabelWithChords, parseSection, transposeChord } from "../utils/chordUtils";

describe("chordUtils", () => {
  test("splitSectionLabelWithChords separates section label and chord line", () => {
    expect(splitSectionLabelWithChords('Intro: Am..Em..F..C..')).toEqual(['Intro:', 'Am..Em..F..C..']);
  });

  test("parseLines splits a section label with inline chords into section and chord lines", () => {
    const parsed = parseLines(['Intro: Am..Em..F..C..'], 0);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ type: 'structure', label: 'Intro' });
    expect(parsed[1].type).toBe('chord');
  });

  test("parseSection detects modulation lines", () => {
    expect(parseSection('Modulation: G')).toEqual({ type: 'modulation', label: 'G' });
    expect(parseSection('Key change: A')).toEqual({ type: 'modulation', label: 'A' });
  });

  test("chordToNumber converts basic chords in C major", () => {
    expect(chordToNumber('C', 'C')).toBe('1');
    expect(chordToNumber('Dm', 'C')).toBe('2m');
    expect(chordToNumber('G7', 'C')).toBe('57');
    expect(chordToNumber('Am', 'C')).toBe('6m');
  });

  test("chordToNumber converts with key signature and sharps/flats", () => {
    expect(chordToNumber('F#', 'E')).toBe('2');
    expect(chordToNumber('Bb', 'F')).toBe('4');
    expect(chordToNumber('Gm', 'Bb')).toBe('6m');
  });

  test("chordTextToNumberText converts inline chord tokens", () => {
    expect(chordTextToNumberText('C G Am F', 'C')).toBe('1 5 6m 4');
    expect(chordTextToNumberText('D.. Gm..', 'C')).toBe('2.. 5m..');
  });

  test("transposeChord handles slash bass chords", () => {
    expect(transposeChord('B/D#', 1)).toBe('C/E');
    expect(transposeChord('Am/G', 2)).toBe('Bm/A');
    expect(transposeChord('F#maj7/D', -1)).toBe('Fmaj7/C#');
  });

  test("transpose chord tokens inside parentheses", () => {
    const parsed = parseLines(['Lirik (Am) masih ada'], 2);
    expect(parsed[0].tokens).toContainEqual({ token: '(Bm)', isChord: true });
  });

  test("transpose compact chord token in chord line", () => {
    const parsed = parseLines(['D..F# G'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: 'E..G#', isChord: true },
      { token: ' ', isSpace: true },
      { token: 'A', isChord: true }
    ]);
  });
});
