import { describe, test, expect } from 'vitest';
import { isValidChord, chordToNumber, chordTextToNumberText, chordTextToJazzText, parseLines, splitSectionLabelWithChords, parseSection, transposeChord, recommendPianoFriendlyKey, alignSelectedBarlines, wrapBarsPerLine, getAllChords } from "../utils/chordUtils";

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

  test("parseSection does not treat substring inside a word as structure", () => {
    expect(parseSection('stuck in reverse')).toBe(null);
  });

  test("parseSection ignores other structure-like substrings inside words", () => {
    expect(parseSection('this part is chorused')).toBe(null);
    expect(parseSection('deep introspection tonight')).toBe(null);
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

  test("chordTextToJazzText reharmonizes common chord qualities into jazzier voicings", () => {
    expect(chordTextToJazzText('C G Am F')).toBe('Cmaj7 Gmaj7 Am7 Fmaj7');
    expect(chordTextToJazzText('Cmaj7 Gm7 Fdim Aaug')).toBe('Cmaj9 Gm9 Fm7b5 A7#5');
    expect(chordTextToJazzText('Bbmaj9.. Cm.. D7/G')).toBe('Bbmaj9.. Cm7.. D13/G');
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

  test("transpose compact chord token with hyphen and dot separators", () => {
    const parsed = parseLines(['Bm-F#m-G..G#m'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: 'C#m-G#m-A..A#m', isChord: true }
    ]);
  });

  test("transpose leading dash chord token", () => {
    const parsed = parseLines(['-A'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: '-B', isChord: true }
    ]);
  });

  test("isValidChord supports complex chord formats with alterations", () => {
    expect(isValidChord('BbMajb5')).toBe(true);
    expect(isValidChord('C#maj7#11')).toBe(true);
    expect(isValidChord('Cm7b5')).toBe(true);
    expect(isValidChord('C7b9')).toBe(true);
    expect(isValidChord('Gmaj9#11')).toBe(true);
    expect(isValidChord('F#dim7')).toBe(true);
    expect(isValidChord('Bbdim')).toBe(true);
    expect(isValidChord('Eaug')).toBe(true);
  });

  test("recommendPianoFriendlyKey returns score breakdown", () => {
    const recommendation = recommendPianoFriendlyKey({
      chords: ['F#', 'C#', 'G#m'],
      key: 'E',
      transpose: 0,
    });

    expect(recommendation).toBeTruthy();
    expect(recommendation).toHaveProperty('recommendedKey');
    expect(recommendation).toHaveProperty('accidentalChordCount');
    expect(recommendation).toHaveProperty('totalChords', 3);
    expect(recommendation).toHaveProperty('keyAccidentalCount');
  });

  test("alignSelectedBarlines aligns barline columns across selected lines", () => {
    const input = `| C  G | Am F |
| Dm    G | C  |`;

    const result = alignSelectedBarlines(input);
    const lines = result.split('\n');

    const firstBars = lines.map(line => line.indexOf('|', 1));
    expect(firstBars[0]).toBe(firstBars[1]);
  });

  test("alignSelectedBarlines keeps text unchanged when less than two lines have barlines", () => {
    const input = `Verse 1
| C G Am F |`;
    expect(alignSelectedBarlines(input)).toBe(input);
  });

  test("alignSelectedBarlines normalizes spacing between chord and bar", () => {
    const input = `|C G|Am F|
|Dm   G|C|`;
    const result = alignSelectedBarlines(input);
    const lines = result.split('\n');

    expect(lines[0]).not.toMatch(/[A-Za-z0-9)]\|/);
    expect(lines[0]).not.toMatch(/\|[A-Za-z0-9(]/);
    expect(lines[1]).toContain('| Dm');
    expect(lines[1]).toContain('| C |');
  });

  test("wrapBarsPerLine wraps chord bars into groups of four", () => {
    const input = '| C | G | Am | F | Dm | G | C | C |';
    const wrapped = wrapBarsPerLine(input, 4);
    const lines = wrapped.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('| C | G | Am | F |');
    expect(lines[1]).toBe('| Dm | G | C | C |');
  });

  test("wrapBarsPerLine keeps non-bar lines unchanged", () => {
    const input = 'Verse 1';
    expect(wrapBarsPerLine(input, 4)).toBe(input);
  });

  test("getAllChords strips wrapping parentheses from used chords", () => {
    const parsedSong = {
      lines: [
        { type: 'line_with_chords', chords: [{ chord: '(Am)' }, { chord: 'F' }, { chord: '(C).' }] },
      ],
    };

    expect(getAllChords(parsedSong)).toEqual(['Am', 'C', 'F']);
  });

  test("N.C. (No Chord) is detected as a chord token", () => {
    const parsed = parseLines(['N.C.', 'Am  G  C'], 0);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens[0].token).toBe('N.C.');
    expect(parsed[0].tokens[0].isChord).toBe(true);
  });

  test("N.C. variant 'NC' is recognized", () => {
    const parsed = parseLines(['NC'], 0);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens[0].isChord).toBe(true);
  });

  test("should NOT be transposed", () => {
    const parsed = parseLines(['N.C.  Am  G'], 2);
    const tokens = parsed[0].tokens;
    const ncToken = tokens.find(t => t.token.includes('N.C.'));
    const amToken = tokens.find(t => t.token === 'Bm');
    const gToken = tokens.find(t => t.token === 'A');
    
    expect(ncToken.token).toBe('N.C.');
    expect(amToken).toBeDefined();
    expect(gToken).toBeDefined();
  });

  test("N.C. in a chord line is detected by isChordLine", () => {
    const lines = [
      'N.C.  |  Am  |  G  |',
      'Some lyrics here with N.C. notation'
    ];
    // First line should be detected as chord line due to N.C. + chords
    expect(parseLines(lines, 0)[0].type).toBe('chord');
  });
});
