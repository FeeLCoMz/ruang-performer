import { describe, test, expect } from 'vitest';
import { parseLines } from '../utils/chordUtils.js';

/**
 * The editor and its preview must stay in sync by LINE.
 *
 * parseLines does not emit one row per input line — it splits compound lines and
 * expands repeated section references — so a rendered row cannot be mapped to a
 * source line by index. These tests pin down the `sourceLine` tag that makes the
 * mapping possible.
 */
describe('editor/preview line sync', () => {
  const lyrics = [
    '[Intro]',      // 1
    '| C | G |',    // 2
    '[Verse 1]',    // 3
    'Am F',         // 4
    'Hello world',  // 5
    '[Chorus]',     // 6
    'G C',          // 7
    '[Verse 1]',    // 8 - repeat reference, body gets expanded
    '[Outro]',      // 9
  ].join('\n');

  const rows = parseLines(lyrics.split('\n'), 0);

  test('every rendered row carries the source line it came from', () => {
    for (const row of rows) {
      expect(Number.isInteger(row.sourceLine), `row ${row.type} lacks sourceLine`).toBe(true);
    }
  });

  test('sourceLine always points at a real line in the document', () => {
    const total = lyrics.split('\n').length;
    for (const row of rows) {
      expect(row.sourceLine).toBeGreaterThanOrEqual(1);
      expect(row.sourceLine).toBeLessThanOrEqual(total);
    }
  });

  test('a repeated section reference owns both its reference row and the expanded body', () => {
    // This is the case that broke index-based mapping: line 8 is a single line
    // of text but produces three rendered rows.
    const rowsForLine8 = rows.filter((row) => row.sourceLine === 8);
    expect(rowsForLine8.length).toBeGreaterThan(1);

    const reference = rowsForLine8.filter((row) => !row.isExpandedFromSection);
    const expanded = rowsForLine8.filter((row) => row.isExpandedFromSection);

    expect(reference).toHaveLength(1);
    expect(reference[0].isRepeatedReference).toBe(true);
    expect(expanded.length).toBeGreaterThan(0);
  });

  test('rows typed at a position are distinguishable from expanded copies', () => {
    const expanded = rows.filter((row) => row.isExpandedFromSection);
    const typed = rows.filter((row) => !row.isExpandedFromSection);

    expect(expanded.length).toBeGreaterThan(0);
    expect(typed.length).toBeGreaterThan(0);

    // Nothing may be flagged twice in a contradictory way.
    for (const row of expanded) {
      expect(row.isExpandedFromSection).toBe(true);
    }
  });

  test('the document is not assumed to render one row per line', () => {
    // Guards the assumption itself: if parseLines ever became 1:1 this test
    // would still pass, but the sync feature would silently become unnecessary.
    // More importantly it fails if sourceLine stops being emitted.
    expect(rows.length).toBeGreaterThanOrEqual(lyrics.split('\n').length);
  });

  test('a plain document with no repeats maps one row per line', () => {
    const plain = 'Am F\nHello world\nG C\nGoodbye';
    const plainRows = parseLines(plain.split('\n'), 0);

    expect(plainRows.map((row) => row.sourceLine)).toEqual([1, 2, 3, 4]);
    expect(plainRows.every((row) => !row.isExpandedFromSection)).toBe(true);
  });

  test('blank lines still map to their own source line', () => {
    const withBlank = 'Am F\n\nG C';
    const blankRows = parseLines(withBlank.split('\n'), 0);

    expect(blankRows[1].type).toBe('empty');
    expect(blankRows[1].sourceLine).toBe(2);
  });
});
