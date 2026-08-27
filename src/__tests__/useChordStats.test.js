import { describe, expect, test } from 'vitest';
import { getChordStatsSnapshot } from '../hooks/useChordStats.js';

describe('getChordStatsSnapshot', () => {
  test('returns empty stats for empty lyrics', () => {
    expect(getChordStatsSnapshot('')).toEqual({
      chords: [],
      count: 0,
      usageCounts: [],
      detectedKey: null,
      modulation: {
        hasModulation: false,
        modulationCount: 0,
        transitions: [],
        timeline: [],
      },
    });
  });

  test('detects chord usage and key from lyrics', () => {
    const stats = getChordStatsSnapshot(`
      [Verse]
      C G Am F
    `);

    expect(stats.chords).toEqual(expect.arrayContaining(['C', 'G', 'Am', 'F']));
    expect(stats.count).toBe(4);
    expect(stats.detectedKey).not.toBeNull();
    expect(stats.modulation).toMatchObject({
      hasModulation: false,
      modulationCount: 0,
    });
  });
});
