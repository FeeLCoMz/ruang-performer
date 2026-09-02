import { describe, test, expect } from 'vitest';
import { isValidChord, chordToNumber, chordTextToNumberText, chordTextToJazzText, chordTextToSimpleText, parseLines, splitSectionLabelWithChords, parseSection, transposeChord, recommendPianoFriendlyKey, alignSelectedBarlines, wrapBarsPerLine, getAllChords, getChordUsageCounts, estimateKeyFromChordUsage, detectChordModulations, isMetadataLine, parseInstrumentPatchLine, parsePresetCueLine, extractPresetCuesFromLyrics, extractMidiProgramCuesFromLyrics, extractDetectedInstrumentsFromLyrics, extractTimestampSeconds, mergeDetectedTimestampsIntoMarkers } from "../utils/chordUtils";

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

  test("parseLines preserves section and cue separation for single-line and multi-line input", () => {
    const separateLines = parseLines(['[Intro]', '[Keys: Acoustic Grand Piano | PC: 0 | CH: 1]', 'Hello'], 0);
    expect(separateLines[0]).toEqual({ type: 'structure', label: 'Intro' });
    expect(separateLines[1]).toMatchObject({ type: 'preset_cue', section: 'Keys', patch: 'Acoustic Grand Piano' });
    expect(separateLines[2]).toMatchObject({ type: 'lyrics' });

    const sameLine = parseLines(['[Intro] [Keys: Acoustic Grand Piano | PC: 0 | CH: 1]', 'Hello'], 0);
    expect(sameLine[0]).toEqual({ type: 'structure', label: 'Intro' });
    expect(sameLine[1]).toMatchObject({ type: 'preset_cue', section: 'Keys', patch: 'Acoustic Grand Piano' });
    expect(sameLine[2]).toMatchObject({ type: 'lyrics' });
  });

  test("parseLines expands standalone repeated section labels using previous section content", () => {
    const parsed = parseLines([
      'Verse 1:',
      'C G',
      'Lirik baris 1',
      '',
      'Chorus:',
      'F G C',
      'Lirik bagian C',
      '',
      'Verse 1',
      'Chorus'
    ], 0);

    const verseRepeatIndex = parsed.findIndex((lineObj, idx) => lineObj.type === 'structure' && lineObj.label === 'Verse 1' && idx > 0);
    expect(verseRepeatIndex).toBeGreaterThan(-1);
    expect(parsed[verseRepeatIndex].isRepeatedReference).toBe(true);
    expect(parsed[verseRepeatIndex + 1]).toMatchObject({ type: 'chord' });
    expect(parsed[verseRepeatIndex + 2]).toMatchObject({ type: 'lyrics' });

    const chorusRepeatIndex = parsed.findIndex((lineObj, idx) => lineObj.type === 'structure' && lineObj.label === 'Chorus' && idx > verseRepeatIndex);
    expect(chorusRepeatIndex).toBeGreaterThan(-1);
    expect(parsed[chorusRepeatIndex].isRepeatedReference).toBe(true);
    expect(parsed[chorusRepeatIndex + 1]).toMatchObject({ type: 'chord' });
    expect(parsed[chorusRepeatIndex + 2]).toMatchObject({ type: 'lyrics' });
  });

  test("parseLines keeps section as header when section still has following content", () => {
    const parsed = parseLines([
      'Verse:',
      'C G',
      'Line lama',
      '',
      'Verse',
      'Am F',
      'Line baru'
    ], 0);

    const secondVerseIndex = parsed.findIndex((lineObj, idx) => lineObj.type === 'structure' && lineObj.label === 'Verse' && idx > 0);
    expect(secondVerseIndex).toBeGreaterThan(-1);
    expect(parsed[secondVerseIndex + 1]).toMatchObject({ type: 'chord' });
    const nextLyricsTokens = parsed[secondVerseIndex + 2]?.tokens || [];
    const lyricsText = nextLyricsTokens.map((tokenObj) => tokenObj.token).join('');
    expect(lyricsText).toContain('Line baru');
  });

  test("parseLines treats standalone style-tagged repeat section as the same section reference", () => {
    const parsed = parseLines([
      '[Bridge]',
      'Bm F#m',
      '[Bridge - Koplo]',
      '[Chorus]',
      '[Chorus]'
    ], 0);

    const repeatIndexes = parsed
      .map((lineObj, idx) => ({ lineObj, idx }))
      .filter(({ lineObj }) => lineObj?.type === 'structure' && lineObj.label.startsWith('Bridge'))
      .map(({ idx }) => idx);

    expect(repeatIndexes).toHaveLength(2);
    expect(parsed[repeatIndexes[1]].isRepeatedReference).toBe(true);
  });

  test("parseLines does not repeat a section when the tag is followed by lyric or chord content", () => {
    const parsed = parseLines([
      '[Bridge]',
      'Bm F#m',
      '[Bridge - Koplo]',
      'ngene men anak sing rusak omahe..',
      '[Chorus]',
      '[Chorus]'
    ], 0);

    expect(parsed[2].isRepeatedReference).toBeUndefined();
    expect(parsed[2]).toMatchObject({ type: 'structure', label: 'Bridge - Koplo' });
  });

  test("parseLines strips parentheses and keeps inline instrument labels in full-row lyric flow", () => {
    const parsed = parseLines(['(Gitar)      (Suling)', 'lirik lirik  lirk lagu'], 0);
    expect(parsed[0]).toMatchObject({ type: 'lyrics' });
    expect(parsed[0].tokens).toContainEqual({ token: 'Gitar', isInstrument: true });
    expect(parsed[0].tokens).toContainEqual({ token: 'Suling', isInstrument: true });
    expect(parsed[0].tokens.some((token) => token.token === '(Gitar)')).toBe(false);
    expect(parsed[0].tokens.some((token) => token.token === '(Suling)')).toBe(false);
    expect(parsed[1].tokens).toContainEqual({ token: 'lirik', isInstrument: undefined });
  });

  test("parseLines keeps parenthetical instrument phrases intact when they are a single tag", () => {
    const parsed = parseLines(['(Strings Stac.)', '(Gitar & Fill-in)', '(Biola: Lead utama)', '(teks apapun Gitar)'], 0);
    expect(parsed[0].tokens).toContainEqual({ token: 'Strings Stac.', isInstrument: true });
    expect(parsed[1].tokens).toContainEqual({ token: 'Gitar & Fill-in', isInstrument: true });
    expect(parsed[2].tokens).toContainEqual({ token: 'Biola: Lead utama', isInstrument: true });
    expect(parsed[3].tokens).toContainEqual({ token: 'Gitar', isInstrument: true });
  });

  test("parseLines detects instrument labels with colons and display cue tags in inline flow", () => {
    const parsed = parseLines(['Gitar: teks apapun', '(teks apapun Gitar)', '(Aksen)', '(Stop)', '(BBreak)', '(Fill-in)', '(Fade in/out)', 'Cue: Gitar', 'Cue: (Sax)', 'Cue: Mainkan Piano Melodi Chorus', 'Dm (Sax) Em | G |', '(Sax)(Stop) Am | Dm G |'], 0);
    expect(parsed[0].tokens).toContainEqual({ token: 'Gitar', isInstrument: true });
    expect(parsed[1].tokens).toContainEqual({ token: 'Gitar', isInstrument: true });
    expect(parsed[2].tokens).toContainEqual({ token: 'Aksen', isCueMark: true });
    expect(parsed[3].tokens).toContainEqual({ token: 'Stop', isCueMark: true });
    expect(parsed[4].tokens).toContainEqual({ token: 'BBreak', isCueMark: true });
    expect(parsed[5].tokens).toContainEqual({ token: 'Fill-in', isCueMark: true });
    expect(parsed[6].tokens).toContainEqual({ token: 'Fade in/out', isCueMark: true });
    expect(parsed[7]).toMatchObject({ type: 'metadata' });
    expect(parsed[8]).toMatchObject({ type: 'metadata' });
    expect(parsed[9]).toMatchObject({ type: 'metadata' });
    expect(parsed[10].tokens).toContainEqual({ token: 'Sax', isInstrument: true });
    expect(parsed[11].tokens).toContainEqual({ token: 'Sax', isInstrument: true });
    expect(parsed[11].tokens).toContainEqual({ token: 'Stop', isCueMark: true });
  });

  test("extractDetectedInstrumentsFromLyrics keeps real instruments and ignores cue tags", () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      'Gitar: teks apapun',
      '(teks apapun Gitar)',
      '(Aksen)',
      '(Stop)',
      '(Sax)(Stop) Am | Dm G |',
      'Cue: Mainkan Piano Melodi Chorus',
      'Dm (Sax) Em | G |',
      'Biola: Lead utama',
    ].join('\n'));

    expect(instruments).toEqual(['Gitar', 'Sax', 'Piano', 'Biola']);
  });

  test("extractDetectedInstrumentsFromLyrics reads instruments from structure labels", () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      '[Intro - Koplo / Piano, Kenong, Gamelan]',
      'Am F',
    ].join('\n'));

    expect(instruments).toEqual(['Piano', 'Kenong', 'Gamelan']);
  });

  test("parseSection detects modulation lines", () => {
    expect(parseSection('Modulation: G')).toEqual({ type: 'modulation', label: 'G' });
    expect(parseSection('Key change: A')).toEqual({ type: 'modulation', label: 'A' });
  });

  test("parseSection detects pre and post chorus labels", () => {
    expect(parseSection('Pre-Chorus:')).toEqual({ type: 'structure', label: 'Pre-Chorus' });
    expect(parseSection('[Post-Chorus]')).toEqual({ type: 'structure', label: 'Post-Chorus' });
  });

  test("parseSection does not treat substring inside a word as structure", () => {
    expect(parseSection('stuck in reverse')).toBe(null);
  });

  test("parseSection keeps section annotation metadata in the display label", () => {
    expect(parseSection('[Intro] (Intensitas 1 - Stage Piano + Warm Pad)')).toEqual({
      type: 'structure',
      label: 'Intro (Intensitas 1 - Stage Piano + Warm Pad)'
    });
  });

  test("parseSection supports bracketed structure labels with numbers and instrumentation notes", () => {
    expect(parseSection('[Intro - Piano & Biola]')).toEqual({
      type: 'structure',
      label: 'Intro - Piano & Biola'
    });
    expect(parseSection('[Verse 2]')).toEqual({
      type: 'structure',
      label: 'Verse 2'
    });
  });

  test("parseSection ignores bare instrument labels and keeps them as inline display-only tags", () => {
    expect(parseSection('(Sax)')).toBe(null);
    expect(parseSection('(Suling)')).toBe(null);
    expect(parseSection('Sax')).toBe(null);
    expect(parseSection('Suling')).toBe(null);
  });

  test("parseLines keeps bracket metadata tags renderable in mixed section lines", () => {
    const parsed = parseLines(['[Verse 2] [Style: Pop] [Cue: Fill Bell]'], 0);
    expect(parsed[0]).toEqual({ type: 'structure', label: 'Verse 2' });
    expect(parsed[1]).toMatchObject({ type: 'metadata', text: '[Style: Pop]' });
    expect(parsed[2]).toMatchObject({ type: 'metadata', text: '[Cue: Fill Bell]' });
  });

  test("parseSection still accepts bracketed structure labels with instrumentation annotations", () => {
    expect(parseSection('[Intro - Piano & Biola]')).toEqual({
      type: 'structure',
      label: 'Intro - Piano & Biola'
    });
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

  test("parseLines treats parenthesized and apostrophe-number tokens as numbered notation", () => {
    const parsed = parseLines(['(5) 6\' 7'], 0);
    expect(parsed[0]).toMatchObject({ type: 'number' });
    expect(parsed[0].tokens).toContainEqual({ token: "(5)", isNumber: true });
    expect(parsed[0].tokens).toContainEqual({ token: "6'", isNumber: true });
  });

  test("Roman numeral chord mode is not available", async () => {
    const utils = await import('../utils/chordUtils');
    expect(utils.chordToRomanNumeral).toBeUndefined();
    expect(utils.chordTextToRomanNumeralText).toBeUndefined();
  });

  test("parseLines treats dotted and parenthesized numeric bar patterns as number notation", () => {
    const parsed = parseLines(['| 3 . . (4 3) | 2 . . . . |'], 0);
    expect(parsed[0]).toMatchObject({ type: 'number' });
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '3')).toBe(true);
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '.')).toBe(true);
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '(4')).toBe(true);
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '3)')).toBe(true);
  });

  test("chordTextToJazzText reharmonizes common chord qualities into jazzier voicings", () => {
    expect(chordTextToJazzText('C G Am F')).toBe('Cmaj7 Gmaj7 Am7 Fmaj7');
    expect(chordTextToJazzText('Cmaj7 Gm7 Fdim Aaug')).toBe('Cmaj9 Gm9 Fm7b5 A7#5');
    expect(chordTextToJazzText('Bbmaj9.. Cm.. D7/G')).toBe('Bbmaj9.. Cm7.. D13/G');
  });

  test("chordTextToSimpleText reduces extended chords into simpler playable shapes", () => {
    expect(chordTextToSimpleText('Cmaj7 G13 Am9 Fadd9')).toBe('C G7 Am F');
    expect(chordTextToSimpleText('Bbmaj9.. Cm7.. D13/G')).toBe('Bb.. Cm.. D7/G');
    expect(chordTextToSimpleText('Fsus4 Gdim7 A7#5')).toBe('Fsus Gdim Aaug');
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

  test("transpose compact slash chord token with hyphen separators", () => {
    const parsed = parseLines(['B-F#/A#'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: 'C#-G#/C', isChord: true }
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
    expect(lines[1]).toMatch(/\| C\s+\|/);
  });

  test("alignSelectedBarlines aligns shared measure boundaries even with uneven bars per line", () => {
    const input = `| Am   | E/G#   | Gm | D/F# |
| Bb/F | C/F    | Eb/Ab |
| Dm   | Bb/D   | Dm6 | G#dim7 |
| C#m7 | Dsus2  | Bm | Bm/A |
| Bm/G | G#dim7 |
| F#   | F#/E   | F#/D | F#/C# |`;

    const result = alignSelectedBarlines(input);
    const barlinePositions = result.split('\n').map((line) => {
      const positions = [];
      const regex = /(\|:|:\||\|\||\|)/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        positions.push(match.index);
      }
      return positions;
    });

    const firstMeasureBoundaries = barlinePositions
      .filter((positions) => positions.length > 1)
      .map((positions) => positions[1]);
    const secondMeasureBoundaries = barlinePositions
      .filter((positions) => positions.length > 2)
      .map((positions) => positions[2]);

    expect(new Set(firstMeasureBoundaries).size).toBe(1);
    expect(new Set(secondMeasureBoundaries).size).toBe(1);
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

  test("getChordUsageCounts returns descending usage frequency", () => {
    const parsedSong = {
      lines: [
        { type: 'line_with_chords', chords: [{ chord: 'C' }, { chord: 'G' }, { chord: 'Am' }, { chord: 'F' }] },
        { type: 'line_with_chords', chords: [{ chord: 'C' }, { chord: 'G' }, { chord: 'F' }, { chord: 'C' }] },
      ],
    };

    expect(getChordUsageCounts(parsedSong)).toEqual([
      { chord: 'C', count: 3 },
      { chord: 'F', count: 2 },
      { chord: 'G', count: 2 },
      { chord: 'Am', count: 1 },
    ]);
  });

  test("estimateKeyFromChordUsage infers C major progression", () => {
    const estimation = estimateKeyFromChordUsage([
      { chord: 'C', count: 6 },
      { chord: 'G', count: 5 },
      { chord: 'Am', count: 4 },
      { chord: 'F', count: 4 },
      { chord: 'Dm', count: 2 },
    ]);

    expect(estimation).toBeTruthy();
    expect(estimation).toHaveProperty('key', 'C');
    expect(estimation).toHaveProperty('mode', 'major');
    expect(estimation).toHaveProperty('confidence');
    expect(estimation).toHaveProperty('alternatives');
    expect(Array.isArray(estimation.alternatives)).toBe(true);
    expect(estimation.alternatives.length).toBeGreaterThan(0);
  });

  test("detectChordModulations identifies key shift between sections", () => {
    const parsedSong = {
      lines: [
        {
          type: 'line_with_chords',
          sourceLine: 2,
          chords: [{ chord: 'C' }, { chord: 'G' }, { chord: 'Am' }, { chord: 'F' }],
        },
        {
          type: 'line_with_chords',
          sourceLine: 4,
          chords: [{ chord: 'C' }, { chord: 'G' }, { chord: 'F' }, { chord: 'Dm' }],
        },
        {
          type: 'line_with_chords',
          sourceLine: 8,
          chords: [{ chord: 'D' }, { chord: 'A' }, { chord: 'Bm' }, { chord: 'G' }],
        },
        {
          type: 'line_with_chords',
          sourceLine: 10,
          chords: [{ chord: 'D' }, { chord: 'A' }, { chord: 'G' }, { chord: 'Em' }],
        },
      ],
    };

    const modulation = detectChordModulations(parsedSong, { lineWindow: 1, minSegmentLines: 2, minDetectedConfidence: 45 });
    expect(modulation.hasModulation).toBe(true);
    expect(modulation.modulationCount).toBeGreaterThanOrEqual(1);
    expect(modulation.transitions[0]).toHaveProperty('fromKey', 'C');
    expect(modulation.transitions[0]).toHaveProperty('toKey', 'D');
    expect(modulation.transitions[0]).toHaveProperty('startLine', 8);
  });

  test("detectChordModulations does not report modulation for stable key", () => {
    const parsedSong = {
      lines: [
        {
          type: 'line_with_chords',
          sourceLine: 1,
          chords: [{ chord: 'C' }, { chord: 'G' }, { chord: 'Am' }, { chord: 'F' }],
        },
        {
          type: 'line_with_chords',
          sourceLine: 3,
          chords: [{ chord: 'C' }, { chord: 'Dm' }, { chord: 'G' }, { chord: 'F' }],
        },
        {
          type: 'line_with_chords',
          sourceLine: 5,
          chords: [{ chord: 'Am' }, { chord: 'F' }, { chord: 'C' }, { chord: 'G' }],
        },
      ],
    };

    const modulation = detectChordModulations(parsedSong, { lineWindow: 1, minSegmentLines: 2, minDetectedConfidence: 45 });
    expect(modulation.hasModulation).toBe(false);
    expect(modulation.modulationCount).toBe(0);
    expect(modulation.transitions).toEqual([]);
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

  test("isMetadataLine detects patch/layer metadata segments", () => {
    expect(isMetadataLine('Patch: Stage Piano | Layer: Warm Pad (Volume 30%)')).toBe(true);
    expect(isMetadataLine('Aku bilang: kamu hebat')).toBe(false);
  });

  test("parseInstrumentPatchLine extracts patch instrument fields", () => {
    const parsedPatch = parseInstrumentPatchLine('Patch: Stage Piano | Layer: Warm Pad (Volume 30%)');
    expect(parsedPatch).toMatchObject({
      type: 'instrument_patch',
      text: 'Patch: Stage Piano | Layer: Warm Pad (Volume 30%)',
      fields: {
        patch: 'Stage Piano',
        layer: 'Warm Pad (Volume 30%)',
      },
    });
    expect(parsedPatch.midi).toBeTruthy();
    expect(parsedPatch.midi.channel).toBe(1);
    expect(Number.isFinite(parsedPatch.midi.program)).toBe(true);
  });

  test("parsePresetCueLine parses cue label and optional MIDI options", () => {
    expect(parsePresetCueLine('[Chorus: Lead Synth + Strings | PC: 81 | CH: 2 | BankMSB: 1 | BankLSB: 32]')).toEqual({
      type: 'preset_cue',
      section: 'Chorus',
      patch: 'Lead Synth + Strings',
      label: 'Chorus: Lead Synth + Strings',
      text: '[Chorus: Lead Synth + Strings | PC: 81 | CH: 2 | BankMSB: 1 | BankLSB: 32]',
      midi: {
        program: 81,
        channel: 2,
        bankMsb: 1,
        bankLsb: 32,
      },
    });
  });

  test("extractPresetCuesFromLyrics returns cue list in order", () => {
    const cues = extractPresetCuesFromLyrics(`
[Verse: Acoustic Piano]
| C | G |
[Chorus: Lead Synth + Strings | PC: 80 | CH: 1]
| Am | F |
`);

    expect(cues).toHaveLength(2);
    expect(cues[0].label).toBe('Verse: Acoustic Piano');
    expect(cues[0].midi).toBeTruthy();
    expect(cues[0].midi.channel).toBe(1);
    expect(Number.isFinite(cues[0].midi.program)).toBe(true);
    expect(cues[1].label).toBe('Chorus: Lead Synth + Strings');
    expect(cues[1].midi).toEqual({ program: 80, channel: 1 });
  });

  test("extractMidiProgramCuesFromLyrics includes keyboard patch metadata lines", () => {
    const cues = extractMidiProgramCuesFromLyrics(`
Patch: Acoustic Grand Piano | Instrument: Keyboard | PC: 0 | CH: 1
[Chorus: Lead 2 (sawtooth) | PC: 81 | CH: 2]
`);

    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({
      type: 'instrument_patch',
      patch: 'Acoustic Grand Piano',
      midi: { program: 0, channel: 1 },
    });
    expect(cues[1]).toMatchObject({
      type: 'preset_cue',
      patch: 'Lead 2 (sawtooth)',
      midi: { program: 81, channel: 2 },
    });
  });

  test("parsePresetCueLine accepts [Keys: ...] and [Guitar: ...] notation", () => {
    const keysCue = parsePresetCueLine('[Keys: EP Soft]');
    expect(keysCue).toMatchObject({
      type: 'preset_cue',
      section: 'Keys',
      patch: 'EP Soft',
    });
    expect(keysCue.midi).toBeTruthy();
    expect(keysCue.midi.channel).toBe(1);
    expect(Number.isFinite(keysCue.midi.program)).toBe(true);

    expect(parsePresetCueLine('[Guitar: Crunch Lead | PC: 30 | CH: 3]')).toMatchObject({
      type: 'preset_cue',
      section: 'Guitar',
      patch: 'Crunch Lead',
      midi: { program: 30, channel: 3 },
    });
  });

  test("extractMidiProgramCuesFromLyrics picks up [Keys: ...] and [Guitar: ...] cues", () => {
    const cues = extractMidiProgramCuesFromLyrics(`
[Keys: Acoustic Grand Piano | PC: 0 | CH: 1]
[Guitar: Distortion Guitar | PC: 30 | CH: 2]
`);

    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({
      type: 'preset_cue',
      section: 'Keys',
      patch: 'Acoustic Grand Piano',
      midi: { program: 0, channel: 1 },
    });
    expect(cues[1]).toMatchObject({
      type: 'preset_cue',
      section: 'Guitar',
      patch: 'Distortion Guitar',
      midi: { program: 30, channel: 2 },
    });
  });

  test("extractMidiProgramCuesFromLyrics auto-detects program change from [Keys: Piano] and [Guitar: Distortion]", () => {
    const cues = extractMidiProgramCuesFromLyrics(`
[Keys: Piano]
[Guitar: Distortion]
`);

    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({
      section: 'Keys',
      patch: 'Piano',
      midi: { program: 0, channel: 1 },
    });
    expect(cues[1]).toMatchObject({
      section: 'Guitar',
      patch: 'Distortion',
      midi: { program: 30, channel: 2 },
    });
  });

  test("parseInstrumentPatchLine does not classify plain sentence metadata", () => {
    expect(parseInstrumentPatchLine('Catatan: intro masuk pelan')).toBe(null);
  });

  test("parseLines classifies metadata line separately from chord line", () => {
    const parsed = parseLines([
      '[Intro] (Intensitas 1 - Stage Piano + Warm Pad)',
      'Patch: Stage Piano | Layer: Warm Pad (Volume 30%)',
      'D | Bm | C | A'
    ], 0);

    expect(parsed[0]).toEqual({ type: 'structure', label: 'Intro (Intensitas 1 - Stage Piano + Warm Pad)' });
    expect(parsed[1]).toEqual({
      type: 'instrument_patch',
      text: 'Patch: Stage Piano | Layer: Warm Pad (Volume 30%)',
      fields: {
        patch: 'Stage Piano',
        layer: 'Warm Pad (Volume 30%)',
      },
      midi: {
        program: 0,
        channel: 1,
      },
    });
    expect(parsed[2].type).toBe('chord');
  });

  test("extractTimestampSeconds finds unique sorted timestamps from lyrics and chord lines", () => {
    const text = `
[Intro]
[00:12]
C  G  Am  F [01:30]
Repeat [00:12] then [1:02:03]
`;

    expect(extractTimestampSeconds(text)).toEqual([12, 90, 3723]);
  });

  test("mergeDetectedTimestampsIntoMarkers appends missing timestamps and preserves existing labels", () => {
    const lyrics = 'Verse [00:30]\nChorus [01:00]';
    const existing = [
      { time: 30, label: 'Intro cue' },
      { time: '90', label: 'Bridge cue' },
    ];

    expect(mergeDetectedTimestampsIntoMarkers(lyrics, existing)).toEqual([
      { time: 30, label: 'Intro cue' },
      { time: 60, label: 'Timestamp 1:00' },
      { time: 90, label: 'Bridge cue' },
    ]);
  });

  test("mergeDetectedTimestampsIntoMarkers uses following section label when timestamp precedes structure tag", () => {
    const lyrics = `[00:30]\n[Verse]\nC G Am F\n[01:00]\n[Chorus]\nF G C`;

    expect(mergeDetectedTimestampsIntoMarkers(lyrics, [])).toEqual([
      { time: 30, label: 'Verse' },
      { time: 60, label: 'Chorus' },
    ]);
  });
});
