import { describe, expect, test } from 'vitest';
import { inferSongMood } from '../utils/songMoodUtils.js';

describe('inferSongMood', () => {
  test('classifies low tempo songs as calm', () => {
    const mood = inferSongMood({ tempo: '68', genre: 'Pop' });
    expect(mood.tone).toBe('calm');
    expect(mood.label).toBe('Tenang');
  });

  test('raises intensity for energetic genres', () => {
    const mood = inferSongMood({ tempo: '118', genre: 'EDM' });
    expect(mood.tone).toBe('energetic');
  });

  test('falls back to genre hint when tempo is missing', () => {
    const mood = inferSongMood({ genre: 'Acoustic worship' });
    expect(mood.sourceHint).toBe('genre dan style');
    // Soft genres pull the level down from the tempo-less baseline.
    expect(mood.tone).toBe('warm');

    const energeticGenre = inferSongMood({ genre: 'Metal' });
    expect(energeticGenre.tone).not.toBe(mood.tone);
  });
});
