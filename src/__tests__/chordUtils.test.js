import { describe, test, expect } from 'vitest';
import { isValidChord, chordToNumber, chordTextToNumberText, chordTextToJazzText, chordTextToSimpleText, parseLines, splitSectionLabelWithChords, parseSection, transposeChord, recommendPianoFriendlyKey, alignSelectedBarlines, wrapBarsPerLine, getAllChords, getChordUsageCounts, estimateKeyFromChordUsage, detectChordModulations, isMetadataLine, extractDetectedInstrumentsFromLyrics, extractTimestampSeconds, mergeDetectedTimestampsIntoMarkers, parseChordPro, classifyLine, canonicalSection, parseBarStructure, buildKeywordAlternation } from '../utils/chordUtils';

describe('chordUtils', () => {
  test('splitSectionLabelWithChords separates section label and chord line', () => {
    expect(splitSectionLabelWithChords('Intro: Am..Em..F..C..')).toEqual(['Intro:', 'Am..Em..F..C..']);
  });

  test('parseLines splits a section label with inline chords into section and chord lines', () => {
    const parsed = parseLines(['Intro: Am..Em..F..C..'], 0);
    expect(parsed).toHaveLength(2);
    // toMatchObject, not toEqual: parseLines also tags every row with the
    // source line it came from, which is what the editor/preview sync uses.
    expect(parsed[0]).toMatchObject({ type: 'structure', label: 'Intro' });
    expect(parsed[1].type).toBe('chord');
  });

  test('parseLines keeps ChordDisplay rows and leaves MIDI key lines alone', () => {
    // Baris instrumen ChordDisplay: "[Gitar: Dist]". Tag ber-key MIDI
    // ("[Keys: ...]") bukan keyword ChordDisplay — milik modul MIDI.
    const separateLines = parseLines(['[Intro]', '[Gitar: Dist]', 'Hello'], 0);
    expect(separateLines[0]).toMatchObject({ type: 'structure', label: 'Intro', sourceLine: 1 });
    expect(separateLines[1]).toMatchObject({ type: 'instrument', label: 'Gitar: Dist' });
    expect(separateLines[2]).toMatchObject({ type: 'lyrics' });

    // "[Intro] [Gitar: Dist]": seksi + tag dalam satu baris dibiarkan utuh; yang
    // penting header seksinya tetap terbaca.
    const sameLine = parseLines(['[Intro] [Gitar: Dist]', 'Hello'], 0);
    expect(sameLine[0]).toMatchObject({ type: 'structure', label: 'Intro', sourceLine: 1 });
    expect(sameLine[1]).toMatchObject({ type: 'lyrics' });

    // "[Keys: ...]" dibiarkan untuk slot MIDI, bukan jadi row instrumen.
    const [keysRow] = parseLines(['[Keys: Acoustic Grand Piano]', 'Hello'], 0);
    expect(keysRow.type).not.toBe('instrument');
  });

  test('parseLines expands standalone repeated section labels using previous section content', () => {
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

  test('parseLines keeps section as header when section still has following content', () => {
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

  test('parseLines treats standalone style-tagged repeat section as the same section reference', () => {
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

  test('parseLines does not repeat a section when the tag is followed by lyric or chord content', () => {
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

  test('parseLines marks bracketed instrument tags in full-row lyric flow', () => {
    const parsed = parseLines(['[Gitar] [Suling]', 'lirik lirik  lirk lagu'], 0);
    expect(parsed[0]).toMatchObject({ type: 'lyrics' });
    expect(parsed[0].tokens).toContainEqual({ token: 'Gitar', isInstrument: true });
    // Dua tag berurutan di awal baris tetap satu baris lirik.
    expect(parsed[0].tokens).toContainEqual({ token: 'Suling', isInstrument: true });
    expect(parsed[1].tokens).toContainEqual({ token: 'lirik', isInstrument: undefined });
  });

  test('parseLines ignores parenthesized and bare instrument keywords', () => {
    const parsed = parseLines(['(Gitar) (Suling) ', 'Gitar: teks apapun', '(teks apapun Gitar)', '(Stop)'], 0);
    expect(parsed[0].tokens.some((token) => token.isInstrument)).toBe(false);
    expect(parsed[1].tokens.some((token) => token.isInstrument)).toBe(false);
    expect(parsed[2].tokens.some((token) => token.isInstrument)).toBe(false);
    expect(parsed[3].tokens.some((token) => token.isCueMark)).toBe(false);
  });

  test('parseLines keeps bracketed instrument phrases intact when they are a single tag', () => {
    const parsed = parseLines(['[Strings Stac.]', '[Gitar & Fill-in]', '[teks apapun Gitar]'], 0);
    expect(parsed[0].tokens).toContainEqual({ token: 'Strings Stac.', isInstrument: true });
    expect(parsed[1].tokens).toContainEqual({ token: 'Gitar & Fill-in', isInstrument: true });
    expect(parsed[2].tokens).toContainEqual({ token: 'Gitar', isInstrument: true });
  });

  test('parseLines detects bracketed instrument labels and display cue tags in inline flow', () => {
    const parsed = parseLines(['[Gitar: teks apapun]', '[Aksen]', '[Stop]', '[BBreak]', '[Fill-in]', '[Fade in/out]', 'Cue: Gitar', 'Cue: [Sax]', 'Cue: Mainkan Piano Melodi Chorus', 'Dm [Sax] Em | G |', 'Dm [Sax] Em | G |', '[Sax][Stop] Am | Dm G |'], 0);
    expect(parsed[0]).toMatchObject({ type: 'instrument', label: 'Gitar: teks apapun' });
    // Baris yang hanya berisi cue mark jadi row "cue", bukan lirik satu kata.
    expect(parsed[1]).toMatchObject({ type: 'cue', label: 'Aksen' });
    expect(parsed[2]).toMatchObject({ type: 'cue', label: 'Stop' });
    expect(parsed[3]).toMatchObject({ type: 'cue', label: 'BBreak' });
    expect(parsed[4]).toMatchObject({ type: 'cue', label: 'Fill-in' });
    expect(parsed[5]).toMatchObject({ type: 'cue', label: 'Fade in/out' });
    // "Cue: ..." tetap metadata; kata instrumen di baris itu tidak jadi tag.
    expect(parsed[6]).toMatchObject({ type: 'metadata' });
    expect(parsed[7]).toMatchObject({ type: 'metadata' });
    expect(parsed[8]).toMatchObject({ type: 'metadata' });
    expect(parsed[9].tokens).toContainEqual({ token: 'Sax', isInstrument: true });
    expect(parsed[10].tokens).toContainEqual({ token: 'Sax', isInstrument: true });
    expect(parsed[11].tokens).toContainEqual({ token: 'Sax', isInstrument: true });
    expect(parsed[11].tokens).toContainEqual({ token: 'Stop', isCueMark: true });
  });

  test('extractDetectedInstrumentsFromLyrics keeps real instruments and ignores cue tags', () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      '[Gitar: teks apapun]',
      '[teks apapun Gitar]',
      '(Gitar)',
      '[Aksen]',
      '[Stop]',
      '[Sax][Stop] Am | Dm G |',
      'Cue: Mainkan Piano Melodi Chorus',
      'Dm [Sax] Em | G |',
      '[Gitar: Lead utama]',
    ].join('\n'));

    expect(instruments).toEqual(['Gitar', 'Sax', 'Piano']);
  });

  test('extractDetectedInstrumentsFromLyrics reads instruments from structure labels', () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      '[Intro - Koplo / Piano, Kenong, Gamelan]',
      'Am F',
    ].join('\n'));

    expect(instruments).toEqual(['Piano', 'Kenong', 'Gamelan']);
  });

  test('extractDetectedInstrumentsFromLyrics keeps multi-word single instruments intact and splits comma lists', () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      '[Synth Saw]',
      '[Gitar Dist, Synth Saw]',
    ].join('\n'));

    expect(instruments).toEqual(['Synth Saw', 'Gitar Dist']);
  });

  test('extractDetectedInstrumentsFromLyrics splits comma-delimited instrument lists in one tag', () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      '[Gitar, Organ]',
      '[Piano, Synth Saw]',
    ].join('\n'));

    expect(instruments).toEqual(['Gitar', 'Piano']);
  });

  test('extractDetectedInstrumentsFromLyrics recognizes synth-family variants as a single instrument', () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      '[Synth Square]',
      '[Synth Pluck]',
      '[Synth Perc]',
      '[Gitar Dist, Synth Square]',
    ].join('\n'));

    expect(instruments).toEqual(['Synth Square', 'Synth Pluck', 'Synth Perc', 'Gitar Dist']);
  });

  test('extractDetectedInstrumentsFromLyrics keeps a tagged instrument phrase intact', () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      '[Synth Arp]',
      '[Synth Funky Bass]',
      '[Piano Warm]',
      '[Gitar Dist]',
    ].join('\n'));

    expect(instruments).toEqual(['Synth Arp', 'Synth Funky Bass', 'Piano Warm', 'Gitar Dist']);
  });

  test('extractDetectedInstrumentsFromLyrics ignores instrument words outside square brackets', () => {
    const instruments = extractDetectedInstrumentsFromLyrics([
      'Gitar Dist:',
      '(Suling)',
      'Piano dan Synth Saw',
      'Am F G',
    ].join('\n'));

    expect(instruments).toEqual([]);
  });

  test('parseSection detects modulation lines', () => {
    expect(parseSection('Modulation: G')).toEqual({ type: 'modulation', label: 'G' });
    expect(parseSection('Key change: A')).toEqual({ type: 'modulation', label: 'A' });
  });

  test('parseSection detects pre and post chorus labels', () => {
    expect(parseSection('Pre-Chorus:')).toEqual({ type: 'structure', label: 'Pre-Chorus' });
    expect(parseSection('[Post-Chorus]')).toEqual({ type: 'structure', label: 'Post-Chorus' });
  });

  test('parseSection detects instrumental labels', () => {
    expect(parseSection('[Instrumental]')).toEqual({ type: 'structure', label: 'Instrumental' });
    expect(parseSection('Instrumental:')).toEqual({ type: 'structure', label: 'Instrumental' });
  });

  test('parseSection does not treat substring inside a word as structure', () => {
    expect(parseSection('stuck in reverse')).toBe(null);
  });

  test('parseSection keeps section annotation metadata in the display label', () => {
    expect(parseSection('[Intro] (Intensitas 1 - Stage Piano + Warm Pad)')).toEqual({
      type: 'structure',
      label: 'Intro (Intensitas 1 - Stage Piano + Warm Pad)'
    });
  });

  test('parseSection supports bracketed structure labels with numbers and instrumentation notes', () => {
    expect(parseSection('[Intro - Piano & Biola]')).toEqual({
      type: 'structure',
      label: 'Intro - Piano & Biola'
    });
    expect(parseSection('[Verse 2]')).toEqual({
      type: 'structure',
      label: 'Verse 2'
    });
  });

  test('parseSection ignores bare instrument labels and keeps them as inline display-only tags', () => {
    expect(parseSection('(Sax)')).toBe(null);
    expect(parseSection('(Suling)')).toBe(null);
    expect(parseSection('Sax')).toBe(null);
    expect(parseSection('Suling')).toBe(null);
  });

  test('parseLines keeps bracket metadata tags in one row', () => {
    // Baris gabungan dibiarkan utuh; header seksinya tetap terbaca dan tag
    // metadata tidak dirender sebagai row terpisah.
    const parsed = parseLines(['[Verse 2] [Cue: Fill Bell]'], 0);
    expect(parsed[0]).toMatchObject({ type: 'structure', label: 'Verse 2' });
    expect(parsed).toHaveLength(1);
  });

  test('MIDI-only bracket tags are left untouched for the MIDI module', () => {
    // [Style: Pop] bukan keyword ChordDisplay (Style bukan MIDI key) dan bukan
    // instrumen: baris gabungan dibiarkan utuh dan dibaca sebagai header seksi.
    const parsed = parseLines(['[Verse 2] [Style: Pop]'], 0);
    expect(parsed[0]).toMatchObject({ type: 'structure', label: 'Verse 2' });

    // [Keys: ...] adalah baris perintah MIDI: satu row, bukan label instrumen.
    const [keysRow] = parseLines(['[Keys: EP Soft]'], 0);
    expect(keysRow.type).not.toBe('instrument');
  });

  test('parseSection still accepts bracketed structure labels with instrumentation annotations', () => {
    expect(parseSection('[Intro - Piano & Biola]')).toEqual({
      type: 'structure',
      label: 'Intro - Piano & Biola'
    });
  });

  test('parseSection ignores other structure-like substrings inside words', () => {
    expect(parseSection('this part is chorused')).toBe(null);
    expect(parseSection('deep introspection tonight')).toBe(null);
  });

  test('chordToNumber converts basic chords in C major', () => {
    expect(chordToNumber('C', 'C')).toBe('1');
    expect(chordToNumber('Dm', 'C')).toBe('2m');
    expect(chordToNumber('G7', 'C')).toBe('57');
    expect(chordToNumber('Am', 'C')).toBe('6m');
  });

  test('chordToNumber converts with key signature and sharps/flats', () => {
    expect(chordToNumber('F#', 'E')).toBe('2');
    expect(chordToNumber('Bb', 'F')).toBe('4');
    expect(chordToNumber('Gm', 'Bb')).toBe('6m');
  });

  test('chordTextToNumberText converts inline chord tokens', () => {
    expect(chordTextToNumberText('C G Am F', 'C')).toBe('1 5 6m 4');
    expect(chordTextToNumberText('D.. Gm..', 'C')).toBe('2.. 5m..');
  });

  test('parseLines treats parenthesized and apostrophe-number tokens as numbered notation', () => {
    const parsed = parseLines(['(5) 6\' 7'], 0);
    expect(parsed[0]).toMatchObject({ type: 'number' });
    expect(parsed[0].tokens).toContainEqual({ token: '(5)', isNumber: true });
    expect(parsed[0].tokens).toContainEqual({ token: '6\'', isNumber: true });
  });

  test('Roman numeral chord mode is not available', async () => {
    const utils = await import('../utils/chordUtils');
    expect(utils.chordToRomanNumeral).toBeUndefined();
    expect(utils.chordTextToRomanNumeralText).toBeUndefined();
  });

  test('parseLines treats dotted and parenthesized numeric bar patterns as number notation', () => {
    const parsed = parseLines(['| 3 . . (4 3) | 2 . . . . |'], 0);
    expect(parsed[0]).toMatchObject({ type: 'number' });
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '3')).toBe(true);
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '.')).toBe(true);
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '(4')).toBe(true);
    expect(parsed[0].tokens.some((token) => token.isNumber && token.token === '3)')).toBe(true);
  });

  test('chordTextToJazzText reharmonizes common chord qualities into jazzier voicings', () => {
    expect(chordTextToJazzText('C G Am F')).toBe('Cmaj7 Gmaj7 Am7 Fmaj7');
    expect(chordTextToJazzText('Cmaj7 Gm7 Fdim Aaug')).toBe('Cmaj9 Gm9 Fm7b5 A7#5');
    expect(chordTextToJazzText('Bbmaj9.. Cm.. D7/G')).toBe('Bbmaj9.. Cm7.. D13/G');
  });

  test('chordTextToSimpleText reduces extended chords into simpler playable shapes', () => {
    expect(chordTextToSimpleText('Cmaj7 G13 Am9 Fadd9')).toBe('C G7 Am F');
    expect(chordTextToSimpleText('Bbmaj9.. Cm7.. D13/G')).toBe('Bb.. Cm.. D7/G');
    expect(chordTextToSimpleText('Fsus4 Gdim7 A7#5')).toBe('Fsus Gdim Aaug');
  });

  test('transposeChord handles slash bass chords', () => {
    expect(transposeChord('B/D#', 1)).toBe('C/E');
    expect(transposeChord('Am/G', 2)).toBe('Bm/A');
    expect(transposeChord('F#maj7/D', -1)).toBe('Fmaj7/C#');
  });

  test('minor add9 chords are recognized and transposed', () => {
    expect(isValidChord('Amadd9')).toBe(true);
    const parsed = parseLines(['Amadd9'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toContainEqual({ token: 'Bmadd9', isChord: true });
  });

  test('transpose chord tokens inside parentheses', () => {
    const parsed = parseLines(['Lirik (Am) masih ada'], 2);
    expect(parsed[0].tokens).toContainEqual({ token: '(Bm)', isChord: true });
  });

  test('transpose multiple chord tokens inside one parenthesized group', () => {
    const parsed = parseLines(['| F G Dm (Am C) |'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toContainEqual({ token: '(Bm', isChord: true });
    expect(parsed[0].tokens).toContainEqual({ token: 'D)', isChord: true });
  });

  test('transpose compact chord token in chord line', () => {
    const parsed = parseLines(['D..F# G'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: 'E..G#', isChord: true },
      { token: ' ', isSpace: true },
      { token: 'A', isChord: true }
    ]);
  });

  test('transpose compact chord token with hyphen and dot separators', () => {
    const parsed = parseLines(['Bm-F#m-G..G#m'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: 'C#m-G#m-A..A#m', isChord: true }
    ]);
  });

  test('transpose compact slash chord token with hyphen separators', () => {
    const parsed = parseLines(['B-F#/A#'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: 'C#-G#/C', isChord: true }
    ]);
  });

  test('transpose leading dash chord token', () => {
    const parsed = parseLines(['-A'], 2);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens).toEqual([
      { token: '-B', isChord: true }
    ]);
  });

  test('isValidChord supports complex chord formats with alterations', () => {
    expect(isValidChord('BbMajb5')).toBe(true);
    expect(isValidChord('C#maj7#11')).toBe(true);
    expect(isValidChord('Cm7b5')).toBe(true);
    expect(isValidChord('C7b9')).toBe(true);
    expect(isValidChord('Gmaj9#11')).toBe(true);
    expect(isValidChord('F#dim7')).toBe(true);
    expect(isValidChord('Bbdim')).toBe(true);
    expect(isValidChord('Eaug')).toBe(true);
  });

  test('recommendPianoFriendlyKey returns score breakdown', () => {
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

  test('alignSelectedBarlines aligns barline columns across selected lines', () => {
    const input = `| C  G | Am F |
| Dm    G | C  |`;

    const result = alignSelectedBarlines(input);
    const lines = result.split('\n');

    const firstBars = lines.map(line => line.indexOf('|', 1));
    expect(firstBars[0]).toBe(firstBars[1]);
  });

  test('alignSelectedBarlines keeps text unchanged when less than two lines have barlines', () => {
    const input = `Verse 1
| C G Am F |`;
    expect(alignSelectedBarlines(input)).toBe(input);
  });

  test('alignSelectedBarlines normalizes spacing between chord and bar', () => {
    const input = `|C G|Am F|
|Dm   G|C|`;
    const result = alignSelectedBarlines(input);
    const lines = result.split('\n');

    expect(lines[0]).not.toMatch(/[A-Za-z0-9)]\|/);
    expect(lines[0]).not.toMatch(/\|[A-Za-z0-9(]/);
    expect(lines[1]).toContain('| Dm');
    expect(lines[1]).toMatch(/\| C\s+\|/);
  });

  test('alignSelectedBarlines aligns shared measure boundaries even with uneven bars per line', () => {
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

  test('wrapBarsPerLine wraps chord bars into groups of four', () => {
    const input = '| C | G | Am | F | Dm | G | C | C |';
    const wrapped = wrapBarsPerLine(input, 4);
    const lines = wrapped.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('| C | G | Am | F |');
    expect(lines[1]).toBe('| Dm | G | C | C |');
  });

  test('wrapBarsPerLine keeps non-bar lines unchanged', () => {
    const input = 'Verse 1';
    expect(wrapBarsPerLine(input, 4)).toBe(input);
  });

  test('getAllChords strips wrapping parentheses from used chords', () => {
    const parsedSong = {
      lines: [
        { type: 'line_with_chords', chords: [{ chord: '(Am)' }, { chord: 'F' }, { chord: '(C).' }] },
      ],
    };

    expect(getAllChords(parsedSong)).toEqual(['Am', 'C', 'F']);
  });

  test('getChordUsageCounts returns descending usage frequency', () => {
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

  test('estimateKeyFromChordUsage infers C major progression', () => {
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

  test('detectChordModulations identifies key shift between sections', () => {
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

  test('detectChordModulations does not report modulation for stable key', () => {
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

  test('N.C. (No Chord) is detected as a chord token', () => {
    const parsed = parseLines(['N.C.', 'Am  G  C'], 0);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens[0].token).toBe('N.C.');
    expect(parsed[0].tokens[0].isChord).toBe(true);
  });

  test('N.C. variant \'NC\' is recognized', () => {
    const parsed = parseLines(['NC'], 0);
    expect(parsed[0].type).toBe('chord');
    expect(parsed[0].tokens[0].isChord).toBe(true);
  });

  test('should NOT be transposed', () => {
    const parsed = parseLines(['N.C.  Am  G'], 2);
    const tokens = parsed[0].tokens;
    const ncToken = tokens.find(t => t.token.includes('N.C.'));
    const amToken = tokens.find(t => t.token === 'Bm');
    const gToken = tokens.find(t => t.token === 'A');

    expect(ncToken.token).toBe('N.C.');
    expect(amToken).toBeDefined();
    expect(gToken).toBeDefined();
  });

  test('N.C. in a chord line is detected by isChordLine', () => {
    const lines = [
      'N.C.  |  Am  |  G  |',
      'Some lyrics here with N.C. notation'
    ];
    // First line should be detected as chord line due to N.C. + chords
    expect(parseLines(lines, 0)[0].type).toBe('chord');
  });

  test('isMetadataLine accepts ChordDisplay keys and rejects MIDI-only keys', () => {
    expect(isMetadataLine('[Original Key: C]')).toBe(true);
    expect(isMetadataLine('Cue: Drum masuk di bar 9')).toBe(true);
    expect(isMetadataLine('Aku bilang: kamu hebat')).toBe(false);
    // Keyword MIDI dikelola modul MIDI, bukan ChordDisplay.
    expect(isMetadataLine('Patch: Stage Piano | Layer: Warm Pad (Volume 30%)')).toBe(false);
    expect(isMetadataLine('[Layer: Warm Pad]')).toBe(false);
    expect(isMetadataLine('CH: 3')).toBe(false);
  });

  test('MIDI keyword lines are not ChordDisplay metadata', () => {
    // Keyword patch/MIDI sudah dihapus dari chordDisplayConfig: baris itu bukan
    // metadata ChordDisplay lagi (slot MIDI yang mem-parse-nya sendiri).
    // "[Keys: EP Soft | PC: 4 | CH: 1]" adalah baris perintah MIDI: bukan label
    // instrumen ChordDisplay, dan tidak menghasilkan data MIDI di sini.
    const [keysRow] = parseLines(['[Keys: EP Soft | PC: 4 | CH: 1]'], 0);
    expect(keysRow.type).not.toBe('instrument');
    expect(keysRow.midi).toBeUndefined();
    for (const line of [
      'Preset: Ballad Keys',
      'Instrument: Guitar',
      'Sound: Strings',
      'Layer: Warm Pad',
      'CH: 3',
    ]) {
      const [row] = parseLines([line], 0);
      expect(row, line).not.toMatchObject({ type: 'metadata' });
      expect(row.midi, line).toBeUndefined();
    }
    // "Gitar: Dist" tanpa bracket bukan metadata: tetap lirik.
    const [gitarLine] = parseLines(['Gitar: Dist'], 0);
    expect(gitarLine.type).toBe('lyrics');
  });

  test('bracketed instrument label shows as an instrument row, not a section', () => {
    // Bentuk paling ringkas di panggung: nama alat di kiri titik dua, nama
    // suara di kanan. Tanpa parser patch, baris ini tetap label instrumen.
    const [row] = parseLines(['[Gitar: Dist]'], 0);
    expect(row).toMatchObject({ type: 'instrument', label: 'Gitar: Dist' });
    expect(row.midi).toBeUndefined();

    expect(parseLines(['[Guitar: Chorus Lead]'], 0)[0]).toMatchObject({ type: 'instrument' });

    // Seksi tetap seksi: "[Chorus: ...]" bukan instrumen.
    expect(parseSection('[Chorus: kita bersama]')).toMatchObject({ type: 'structure' });
  });

  test('bracketed instrument label allows an empty patch', () => {
    expect(parseLines(['[Epiano: ]'], 0)[0]).toMatchObject({ type: 'instrument', label: 'Epiano' });
  });

  test('unknown bracket labels are not instrument rows', () => {
    // Daftar singkatan ("gt", "kb") sudah dihapus: hanya nama instrumen yang
    // dikenal INSTRUMENT_KEYWORDS yang diakui.
    expect(parseLines(['[gt: dist]'], 0)[0]).not.toMatchObject({ type: 'instrument' });
    expect(parseLines(['[kb: warm pad]'], 0)[0]).not.toMatchObject({ type: 'instrument' });
  });

  test('instrument rows are not read as song sections', () => {
    expect(parseSection('[Epiano: ]')).toBe(null);

    // Tanpa bracket dan tanpa nama instrumen, ini tetap lirik.
    expect(parseLines(['Gitar: Dist'], 0)[0]).toMatchObject({ type: 'lyrics' });
  });

  test('parseLines classifies metadata line separately from chord line', () => {
    const parsed = parseLines([
      '[Intro] (Intensitas 1 - Stage Piano + Warm Pad)',
      'Patch: Stage Piano | Layer: Warm Pad (Volume 30%)',
      'D | Bm | C | A'
    ], 0);

    expect(parsed[0]).toMatchObject({
      type: 'structure',
      label: 'Intro (Intensitas 1 - Stage Piano + Warm Pad)',
      sourceLine: 1,
    });
    expect(parsed[1]).toMatchObject({
      type: 'lyrics',
      sourceLine: 2,
    });
    expect(parsed[1].midi).toBeUndefined();
    expect(parsed[2].type).toBe('chord');
  });

  test('extractTimestampSeconds finds unique sorted timestamps from lyrics and chord lines', () => {
    const text = `
[Intro]
[00:12]
C  G  Am  F [01:30]
Repeat [00:12] then [1:02:03]
`;

    expect(extractTimestampSeconds(text)).toEqual([12, 90, 3723]);
  });

  test('mergeDetectedTimestampsIntoMarkers appends missing timestamps and preserves existing labels', () => {
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

  test('mergeDetectedTimestampsIntoMarkers uses following section label when timestamp precedes structure tag', () => {
    const lyrics = '[00:30]\n[Verse]\nC G Am F\n[01:00]\n[Chorus]\nF G C';

    expect(mergeDetectedTimestampsIntoMarkers(lyrics, [])).toEqual([
      { time: 30, label: 'Verse' },
      { time: 60, label: 'Chorus' },
    ]);
  });

  test('mergeDetectedTimestampsIntoMarkers uses adjacent structure labels before or after timestamps without leading zeroes', () => {
    const lyrics = '[02:33]\n[intro]\nintro:\n[3:45]';

    expect(mergeDetectedTimestampsIntoMarkers(lyrics, [])).toEqual([
      { time: 153, label: 'intro' },
      { time: 225, label: 'intro' },
    ]);
  });

    test('mergeDetectedTimestampsIntoMarkers does not reuse non-adjacent structure labels', () => {
      const lyrics = '[Intro]\nC G Am F\n[1:20]';
      expect(mergeDetectedTimestampsIntoMarkers(lyrics, [])).toEqual([
        { time: 80, label: 'Timestamp 1:20' },
      ]);
    });
  });

  describe('classifyLine', () => {
    test('agrees with the rows parseLines renders', () => {
      const sourceLines = ['[Verse]', '[Gitar: Dist]', 'Original Key: C', 'C G Am', 'ku menunggu'];
      const rows = parseLines(sourceLines, 0);

      expect(rows.map((row) => row.type)).toEqual([
        'structure', 'instrument', 'metadata', 'chord', 'lyrics',
      ]);
      expect(sourceLines.map((line) => classifyLine(line).kind)).toEqual(rows.map((row) => row.type));
    });

    test('reports kind for each row shape', () => {
      expect(classifyLine('')).toEqual({ kind: 'empty' });
      expect(classifyLine('[Intro]')).toMatchObject({ kind: 'structure', label: 'Intro' });
      expect(classifyLine('Modulation: G')).toEqual({ kind: 'modulation', label: 'G' });
      expect(classifyLine('[Gitar: Dist]')).toEqual({ kind: 'instrument', label: 'Gitar: Dist' });
      expect(classifyLine('Original Key: C')).toEqual({ kind: 'metadata', text: 'Original Key: C' });
      expect(classifyLine('C G Am F')).toEqual({ kind: 'chord' });
      expect(classifyLine('7 5 3 4')).toEqual({ kind: 'number' });
      expect(classifyLine('ku menunggu')).toEqual({ kind: 'lyrics' });
    });
  });

  describe('canonicalSection', () => {
    test('normalizes labels down to the config keywords', () => {
      expect(canonicalSection('Pre-Chorus 2')).toBe('pre-chorus');
      expect(canonicalSection('[Instrumental]')).toBe('instrumental');
      expect(canonicalSection('Int.')).toBe('interlude');
      expect(canonicalSection('Reff')).toBe('chorus');
      expect(canonicalSection('Verse:')).toBe('verse');
    });

    test('returns null for non-section labels', () => {
      expect(canonicalSection('Title')).toBeNull();
      expect(canonicalSection('Soloist')).toBeNull();
      expect(canonicalSection('')).toBeNull();
    });

    test('parseChordPro and parseLines agree on section keywords', () => {
      // 'Instrumental' dulu dikenali parseSection tapi tidak oleh normalizeSection
      // milik parseChordPro; keduanya sekarang memakai daftar config yang sama.
      const lyrics = '[Instrumental]\nC G Am F';
      expect(parseLines(lyrics.split('\n'), 0)[0]).toMatchObject({ type: 'structure', label: 'Instrumental' });
      expect(Object.keys(parseChordPro(lyrics).structures)).toEqual(['instrumental']);
    });

    test('parseChordPro keeps "Verse: ku menunggu" out of the chord lines', () => {
      // Dulu baris ini dibaca sebagai section + baris chord kosong, sehingga
      // "Verse:" tanpa chord ikut terhitung di laporan statistik.
      const parsed = parseChordPro('Verse: ku menunggu');
      expect(parsed.lines.some((line) => line.type === 'line_with_chords')).toBe(false);
      expect(parsed.lines).toContainEqual({ type: 'text', line: 'Verse: ku menunggu' });
    });
  });

describe('parseBarStructure', () => {
  test('splits prefix, boundaries and measures', () => {
    expect(parseBarStructure('Intro |: C G | Am F :|')).toEqual({
      prefix: 'Intro',
      suffix: '',
      boundaries: ['|:', '|', ':|'],
      measures: ['C G', 'Am F'],
    });
  });

  test('keeps text after the last barline as suffix', () => {
    const structure = parseBarStructure('| C G | Am | (2x)');
    expect(structure.prefix).toBe('');
    expect(structure.suffix).toBe('(2x)');
    expect(structure.measures).toEqual(['C G', 'Am']);
  });

  test('returns null when there are fewer than two barlines', () => {
    expect(parseBarStructure('C G Am F')).toBeNull();
    expect(parseBarStructure('C G | Am F')).toBeNull();
  });

  test('alignSelectedBarlines and wrapBarsPerLine read the same bar layout', () => {
    const input = '| C G | Am F | Dm G | C |';
    const aligned = alignSelectedBarlines(`${input}\n${input}`).split('\n');
    expect(aligned[0]).toBe(input);
    expect(aligned[1]).toBe(input);

    const wrapped = wrapBarsPerLine(input, 2);
    expect(wrapped.split('\n')).toHaveLength(2);
    expect(wrapped.startsWith('| C G | Am F')).toBe(true);
  });
});

describe('buildKeywordAlternation', () => {
  test('escapes keywords and applies the separator', () => {
    expect(buildKeywordAlternation(['n.c.', 'no chord'], '\\s*')).toBe('n\\.c\\.|no\\s*chord');
  });

  test('joins escaped keywords with the requested separator', () => {
    expect(buildKeywordAlternation(['n.c.', 'no chord'], '\\s*')).toBe('n\\.c\\.|no\\s*chord');
    expect(new RegExp(`^(?:${buildKeywordAlternation(['no chord', 'nc'])})$`, 'i').test('no chord')).toBe(true);
  });});
