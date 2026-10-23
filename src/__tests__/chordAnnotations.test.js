/**
 * Anotasi tag: "[Intro: anotasi]", "[Original Key: C]", "[Gitar: anotasi]".
 *
 * Aturan: isi anotasi TIDAK boleh ikut transpose — walaupun isinya berupa chord
 * ("[Intro: Am F C G]"). Chord di luar braket tetap ditranspose seperti biasa.
 */
import { describe, test, expect } from 'vitest';
import { parseLines, classifyLine } from '../utils/chordUtils.js';
import {
  autoTagSongSections,
  standardizeChordNotation,
  transposeLyricsText,
} from '../utils/lyricsEditorUtils.js';

describe('anotasi tag', () => {
  test('anotasi diseksi, metadata, dan instrumen tetap terbaca sebagai tag', () => {
    expect(classifyLine('[Intro: anotasi]')).toMatchObject({ kind: 'structure' });
    expect(classifyLine('[Original Key: G]')).toMatchObject({ kind: 'metadata' });
    expect(classifyLine('[Gitar: anotasi]')).toMatchObject({ kind: 'instrument' });
  });

  test('chord di dalam anotasi dibekukan, chord di luar braket tetap ditranspose', () => {
    const rows = parseLines(['[Intro: Am F C G]', 'C G Am F'], 2);

    // Baris anotasi: satu baris seksi, chord di anotasi TIDAK dipecah/ditranspose.
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe('structure');
    expect(rows[0].label).toContain('Am F C G');

    // Baris chord biasa tetap naik dua langkah.
    expect(rows[1].tokens.map((t) => t.token).join('')).toBe('D A Bm G');
  });

  test('anotasi inline pada baris lirik tidak ikut transpose', () => {
    const rows = parseLines(['ku main di [Intro: G] saja'], 2);
    const annotation = rows[0].tokens.find((token) => token.isAnnotation);
    expect(annotation?.token).toBe('[Intro: G]');
  });

  test('transposeLyricsText melindungi anotasi, termasuk yang berisi chord', () => {
    const input = [
      '[Intro: anotasi]',
      '[Original Key: G]',
      '[Gitar: anotasi]',
      '[Intro: Am F C G]',
      '[Intro] C G',
    ].join('\n');

    expect(transposeLyricsText(input, 2)).toBe(
      [
        '[Intro: anotasi]',
        '[Original Key: G]',
        '[Gitar: anotasi]',
        '[Intro: Am F C G]',
        '[Intro] D A',
      ].join('\n'),
    );
  });

  test('standardizeChordNotation tidak mengubah chord di dalam anotasi', () => {
    expect(standardizeChordNotation('[Intro: cmajor7]')).toBe('[Intro: cmajor7]');
    expect(standardizeChordNotation('cmajor7 dminor')).toBe('| Cmaj7 | Dm |');
  });

  test('autoTagSongSections mempertahankan anotasi di kanan titik dua', () => {
    const result = autoTagSongSections('Intro: anotasi\nGitar: anotasi\nIntro: C G');
    expect(result).toBe('[Intro] anotasi\n[Gitar: anotasi]\n[Intro]');
  });

  test('label instrumen dengan detail tetap label instrumen, bukan anotasi', () => {
    expect(classifyLine('[Organ: Dist]')).toMatchObject({ kind: 'instrument' });
    expect(classifyLine('[Keys: EP Soft | PC: 1]')).toMatchObject({ kind: 'lyrics' });
  });
});
