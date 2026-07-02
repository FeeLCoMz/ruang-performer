import { buildSmartSetlistPlan } from '../utils/setlistSmartAssistant.js';

describe('setlistSmartAssistant', () => {
  const sampleSongs = [
    { id: 's1', title: 'Intro Lights', key: 'C', tempo: '92', genre: 'pop', time_markers: [{ time: 180 }] },
    { id: 's2', title: 'City Drive', key: 'G', tempo: '110', genre: 'rock', time_markers: [{ time: 210 }] },
    { id: 's3', title: 'Night Anthem', key: 'D', tempo: '132', genre: 'dance', time_markers: [{ time: 205 }] },
    { id: 's4', title: 'Slow River', key: 'Am', tempo: '74', genre: 'ballad', time_markers: [{ time: 240 }] },
    { id: 's5', title: 'Closer', key: 'F', tempo: '118', genre: 'pop', time_markers: [{ time: 190 }] },
  ];

  test('returns complete order with same unique song ids', () => {
    const plan = buildSmartSetlistPlan(sampleSongs, { strategy: 'balanced' });
    expect(plan.orderedSongIds).toHaveLength(sampleSongs.length);
    expect(new Set(plan.orderedSongIds).size).toBe(sampleSongs.length);
    expect(plan.orderedSongIds).toEqual(expect.arrayContaining(sampleSongs.map((song) => song.id)));
    expect(plan.estimatedMinutes).toBeGreaterThan(0);
  });

  test('supports target duration while preserving all songs', () => {
    const plan = buildSmartSetlistPlan(sampleSongs, {
      strategy: 'smooth',
      targetMinutes: 12,
    });

    expect(plan.featuredSongIds.length).toBeGreaterThan(0);
    expect(plan.featuredMinutes).toBeGreaterThan(0);
    expect(plan.orderedSongIds).toHaveLength(sampleSongs.length);
    expect(plan.orderedSongIds).toEqual(expect.arrayContaining(sampleSongs.map((song) => song.id)));
  });
});
