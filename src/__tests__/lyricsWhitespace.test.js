/**
 * Perapian whitespace lirik:
 *   1. parser membuang spasi di ujung baris sebelum memarse;
 *   2. penyimpanan memangkas trailing space + baris kosong ganda;
 *   3. aturan yang sama berlaku di API (server/_lyrics.js).
 */
import { describe, test, expect } from 'vitest';
import { parseLines } from '../utils/chordUtils.js';
import {
  compactLyricsBlankLines,
  trimLyricsTrailingWhitespace,
} from '../utils/chord/lyricsWhitespace.js';
import { normalizeLyricsForStorage } from '../../server/_lyrics.js';

describe('trimLyricsTrailingWhitespace', () => {
  test('membuang spasi & tab di akhir baris, indentasi awal tetap', () => {
    expect(trimLyricsTrailingWhitespace('C   G   \n   ku menunggu\t '))
      .toBe('C   G\n   ku menunggu');
  });

  test('spasi ganda di tengah baris tidak dirapatkan', () => {
    expect(trimLyricsTrailingWhitespace('C    G    Am')).toBe('C    G    Am');
  });

  test('baris berisi spasi saja menjadi baris kosong', () => {
    expect(trimLyricsTrailingWhitespace('[Intro]\n   \nku menunggu')).toBe('[Intro]\n\nku menunggu');
  });

  test('baris kosong ganda dipadatkan menjadi satu', () => {
    expect(trimLyricsTrailingWhitespace('[Intro]\n\n[Verse]\n\nku menunggu'))
      .toBe('[Intro]\n\n[Verse]\n\nku menunggu');
  });

  test('baris kosong di awal dan akhir dokumen dibuang', () => {
    expect(trimLyricsTrailingWhitespace('\n\n[Intro]\nku menunggu\n')).toBe('[Intro]\nku menunggu');
  });

  test('CRLF dinormalisasi menjadi LF', () => {
    expect(trimLyricsTrailingWhitespace('[Intro]  \r\nku menunggu  \r\n')).toBe('[Intro]\nku menunggu');
  });

  test('teks kosong / bukan string aman', () => {
    expect(trimLyricsTrailingWhitespace('')).toBe('');
    expect(trimLyricsTrailingWhitespace(null)).toBe('');
    expect(trimLyricsTrailingWhitespace(undefined)).toBe('');
  });
});

describe('compactLyricsBlankLines (dipakai parser)', () => {
  test('tidak membuang baris kosong di awal: jumlah baris tetap', () => {
    const input = '\n[Intro]  \n\n[Verse]\n';
    expect(compactLyricsBlankLines(input).split('\n')).toHaveLength(5);
  });
});

describe('parser memangkas trailing space', () => {
  test('tag seksi dengan spasi di ujung tetap seksi, bukan baris gabungan', () => {
    const rows = parseLines(['[Intro]   ', '[Verse]\t', 'C G   '], 0);
    expect(rows.map((row) => row.type)).toEqual(['structure', 'structure', 'chord']);
    expect(rows[0].label).toBe('Intro');
    expect(rows[1].label).toBe('Verse');
    // Nomor baris sumber tidak bergeser.
    expect(rows.map((row) => row.sourceLine)).toEqual([1, 2, 3]);
  });

  test('baris kosong di awal tetap mempertahankan nomor baris sumber', () => {
    const rows = parseLines(['', '[Intro]  ', 'ku menunggu'], 0);
    expect(rows[0].type).toBe('empty');
    expect(rows[1].sourceLine).toBe(2);
    expect(rows[1].label).toBe('Intro');
  });
});

describe('penyimpanan di server', () => {
  test('lirik dirapikan sebelum disimpan', () => {
    expect(normalizeLyricsForStorage('[Intro]   \n\nku menunggu   '))
      .toBe('[Intro]\n\nku menunggu');
  });

  test('bukan string menjadi string kosong', () => {
    expect(normalizeLyricsForStorage(null)).toBe('');
    expect(normalizeLyricsForStorage({})).toBe('');
    expect(normalizeLyricsForStorage('')).toBe('');
  });
});
