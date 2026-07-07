import { collectBandSongPool, collectSetlistSongPool, pickAutoSongs, generateAutoSetlistSongs } from '../utils/setlistAutoBuilder.js';

describe('setlistAutoBuilder', () => {
  const sourceSetlists = [
    { id: 'sl1', bandId: 'b1', songs: ['s1', 's2', 's3'], createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    { id: 'sl2', bandId: 'b1', songs: ['s2', 's4'], createdAt: '2024-03-01T00:00:00.000Z', updatedAt: '2024-03-02T00:00:00.000Z' },
    { id: 'sl3', bandId: 'b2', songs: ['x1'], createdAt: '2024-02-01T00:00:00.000Z', updatedAt: '2024-02-01T00:00:00.000Z' },
  ];

  test('collectBandSongPool returns unique songs for selected band', () => {
    const result = collectBandSongPool(sourceSetlists, 'b1');
    expect(result).toEqual(['s1', 's2', 's3', 's4']);
  });

  test('collectSetlistSongPool returns unique songs from selected setlist', () => {
    const result = collectSetlistSongPool(sourceSetlists, 'sl1');
    expect(result).toEqual(['s1', 's2', 's3']);
  });

  test('pickAutoSongs ordered strategy keeps original order', () => {
    const result = pickAutoSongs(['a', 'b', 'c'], 2, { strategy: 'ordered' });
    expect(result).toEqual(['a', 'b']);
  });

  test('pickAutoSongs random strategy can be deterministic via randomFn', () => {
    const randomFn = () => 0;
    const result = pickAutoSongs(['a', 'b', 'c'], 2, { strategy: 'random', randomFn });
    expect(result).toEqual(['b', 'c']);
  });

  test('generateAutoSetlistSongs throws when no source songs', () => {
    expect(() => generateAutoSetlistSongs(sourceSetlists, 'missing-band', 3)).toThrow();
  });

  test('generateAutoSetlistSongs recent strategy prioritizes latest setlist songs', () => {
    const result = generateAutoSetlistSongs(sourceSetlists, 'b1', 3, { strategy: 'recent' });
    expect(result).toEqual(['s2', 's4', 's1']);
  });
});
