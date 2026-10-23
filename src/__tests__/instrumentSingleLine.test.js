import { describe, test, expect } from 'vitest';
import { parseLines, classifyLine } from '../utils/chordUtils.js';

describe('instrumen satu baris', () => {
  test('[Gitar] [Suling] tetap satu baris dengan dua token instrumen', () => {
    const rows = parseLines(['[Gitar] [Suling]'], 0);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('lyrics');
    const instruments = rows[0].tokens.filter((t) => t.isInstrument).map((t) => t.token);
    expect(instruments).toEqual(['Gitar', 'Suling']);
    expect(classifyLine('[Gitar] [Suling]')).toEqual({ kind: 'lyrics' });
  });

  test('[Gitar] [Organ: Dist] juga satu baris', () => {
    const rows = parseLines(['[Gitar] [Organ: Dist]'], 0);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokens.filter((t) => t.isInstrument).map((t) => t.token)).toEqual(['Gitar', 'Organ: Dist']);
  });

  test('campuran seksi + instrumen tetap tidak pecah seperti sebelumnya', () => {
    const rows = parseLines(['[Intro] [Gitar: Dist]'], 0);
    expect(rows[0]).toMatchObject({ type: 'structure', label: 'Intro' });
  });
});
