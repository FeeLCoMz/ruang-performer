import { describe, test, expect } from 'vitest';
import {
  analyseLyrics,
  buildSectionKey,
  computeSongCompleteness,
  extractSectionOverview,
  validateMusicalFields,
} from '../utils/songFormUtils.js';

describe('songFormUtils', () => {
  describe('analyseLyrics', () => {
    test('Given empty lyrics, Then nothing is reported as present', () => {
      expect(analyseLyrics('')).toEqual({
        hasLyrics: false,
        lineCount: 0,
        sectionCount: 0,
        chordLineCount: 0,
        instrumentCueCount: 0,
        hasChords: false,
        hasStructure: false,
      });
    });

    test('Given a full chart, Then sections, chords, and cues are counted', () => {
      const lyrics = [
        '[Intro]',
        'C G Am F',
        '[Verse 1]',
        'Am F',
        'Hello world',
        '[Chorus]',
        'G C',
        'Na na na',
        '[Keys: Stage Piano | PC: 0 | CH: 1]',
      ].join('\n');

      const result = analyseLyrics(lyrics);
      expect(result.hasLyrics).toBe(true);
      expect(result.sectionCount).toBe(3);
      expect(result.chordLineCount).toBe(3);
      expect(result.instrumentCueCount).toBe(1);
      expect(result.hasChords).toBe(true);
      expect(result.hasStructure).toBe(true);
    });

    test('Given only one section tag, Then structure is not counted as complete', () => {
      const result = analyseLyrics('[Intro]\nHello');
      expect(result.sectionCount).toBe(1);
      expect(result.hasStructure).toBe(false);
    });

    test('Given lyrics without chords, Then hasChords is false', () => {
      const result = analyseLyrics('[Verse]\nHello world\n[Chorus]\nNa na');
      expect(result.hasChords).toBe(false);
      expect(result.hasStructure).toBe(true);
    });
  });

  describe('computeSongCompleteness', () => {
    test('Given an empty song, Then the score is 0 and everything is missing', () => {
      const result = computeSongCompleteness({});
      expect(result.score).toBe(0);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing).toContain('Judul lagu');
    });

    test('Given a fully filled song, Then the score is 100 with nothing missing', () => {
      const lyrics = '[Intro]\nC G\n[Verse 1]\nAm F\nHello';
      const result = computeSongCompleteness({
        title: 'Song A',
        artist: 'Artist A',
        key: 'C',
        tempo: '120',
        timeSignature: '4/4',
        genre: 'Pop',
        lyrics,
      });
      expect(result.score).toBe(100);
      expect(result.missing).toEqual([]);
    });

    test('Given partial data, Then the score sits between the extremes', () => {
      const result = computeSongCompleteness({ title: 'Song A', key: 'C' });
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
      expect(result.missing).toContain('Lirik');
    });

    test('Given no lyrics, Then the chord requirement is excluded from scoring', () => {
      const withLyrics = computeSongCompleteness({ title: 'A', lyrics: 'Hello\nWorld' });
      const checks = withLyrics.checks.map((check) => check.key);
      expect(checks).toContain('chords');

      const withoutLyrics = computeSongCompleteness({ title: 'A' });
      expect(withoutLyrics.checks.map((check) => check.key)).not.toContain('chords');
    });

    test('Given lyrics that already contain chords, Then the chords check is satisfied', () => {
      const result = computeSongCompleteness({
        title: 'A',
        artist: 'B',
        key: 'C',
        tempo: '120',
        timeSignature: '4/4',
        genre: 'Pop',
        lyrics: '[Intro]\nC G\n[Verse]\nAm F\nHello',
      });
      const chordsCheck = result.checks.find((check) => check.key === 'chords');
      expect(chordsCheck.done).toBe(true);
    });

    test('Given an externally supplied analysis, Then it is reused instead of recomputed', () => {
      const analysis = analyseLyrics('[Intro]\nC G\n[Chorus]\nAm F\nHello');
      const result = computeSongCompleteness({ title: 'A', lyrics: 'ignored' }, analysis);
      const chordsCheck = result.checks.find((check) => check.key === 'chords');
      expect(chordsCheck.done).toBe(true);
    });
  });

  describe('extractSectionOverview', () => {
    test('Given no lyrics, Then the overview is empty', () => {
      expect(extractSectionOverview('')).toEqual([]);
    });

    test('Given multiple sections, Then they are listed with 1-based line numbers', () => {
      const lyrics = '[Intro]\nC G\n[Verse 1]\nAm F\n[Chorus]\nG C';
      const overview = extractSectionOverview(lyrics);

      expect(overview.map((section) => section.label)).toEqual(['Intro', 'Verse 1', 'Chorus']);
      expect(overview.map((section) => section.lineNumber)).toEqual([1, 3, 5]);
      expect(overview[0].lineIndex).toBe(0);
    });

    test('Given a repeated section, Then occurrences are numbered distinctly', () => {
      const lyrics = '[Chorus]\nC G\n[Verse]\nAm F\n[Chorus]\nG C';
      const overview = extractSectionOverview(lyrics);
      const choruses = overview.filter((section) => section.label === 'Chorus');

      expect(choruses).toHaveLength(2);
      expect(choruses[0].occurrence).toBe(1);
      expect(choruses[1].occurrence).toBe(2);
      expect(choruses[0].key).not.toBe(choruses[1].key);
    });

    test('Given lines that are not sections, Then they are ignored', () => {
      const overview = extractSectionOverview('C G Am F\nHello world');
      expect(overview).toEqual([]);
    });
  });

  describe('buildSectionKey', () => {
    test('Given a label with spaces, Then the key is slugged', () => {
      expect(buildSectionKey('Pre Chorus', 2)).toBe('pre-chorus-2');
    });

    test('Given a missing label, Then a fallback is used', () => {
      expect(buildSectionKey('', 1)).toBe('section-1');
    });
  });
});

describe('validateMusicalFields', () => {
  test('Given all fields empty, Then nothing is flagged (all optional)', () => {
    const errors = validateMusicalFields({});
    expect(errors).toEqual({ key: '', timeSignature: '', tempo: '' });
  });

  test('Given valid musical values, Then nothing is flagged', () => {
    const errors = validateMusicalFields({ key: 'Am', timeSignature: '4/4', tempo: '120' });
    expect(errors).toEqual({ key: '', timeSignature: '', tempo: '' });
  });

  test('Given an unknown key, Then the key is flagged', () => {
    // "H" is not a note name; the app used to store it without complaint.
    expect(validateMusicalFields({ key: 'H' }).key).not.toBe('');
    expect(validateMusicalFields({ key: 'Cmajor' }).key).not.toBe('');
  });

  test('Given common key spellings, Then they are accepted', () => {
    for (const key of ['C', 'F#', 'Bb', 'Am', 'F#m', 'Ebm']) {
      expect(validateMusicalFields({ key }).key, key).toBe('');
    }
  });

  test('Given a malformed time signature, Then it is flagged', () => {
    expect(validateMusicalFields({ timeSignature: '5/3' }).timeSignature).not.toBe('');
    expect(validateMusicalFields({ timeSignature: '44' }).timeSignature).not.toBe('');
    expect(validateMusicalFields({ timeSignature: 'a/b' }).timeSignature).not.toBe('');
  });

  test('Given a standard time signature, Then it is accepted', () => {
    for (const timeSignature of ['4/4', '3/4', '6/8', '12/8', '5/4', '7/8']) {
      expect(validateMusicalFields({ timeSignature }).timeSignature, timeSignature).toBe('');
    }
  });

  test('Given an out-of-range or non-numeric tempo, Then it is flagged', () => {
    expect(validateMusicalFields({ tempo: 'abc' }).tempo).not.toBe('');
    expect(validateMusicalFields({ tempo: '999' }).tempo).not.toBe('');
    expect(validateMusicalFields({ tempo: '10' }).tempo).not.toBe('');
  });

  test('Given a typical tempo, Then it is accepted', () => {
    expect(validateMusicalFields({ tempo: '120' }).tempo).toBe('');
    expect(validateMusicalFields({ tempo: 96 }).tempo).toBe('');
  });
});
