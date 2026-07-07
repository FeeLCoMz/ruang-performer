export function collectBandSongPool(sourceSetlists = [], bandId) {
  if (!bandId || !Array.isArray(sourceSetlists)) return [];

  const songPool = [];
  for (const setlist of sourceSetlists) {
    if (String(setlist?.bandId || '') !== String(bandId)) continue;
    if (!Array.isArray(setlist?.songs)) continue;
    for (const songId of setlist.songs) {
      if (songId) songPool.push(songId);
    }
  }

  return Array.from(new Set(songPool));
}

export function collectSetlistSongPool(sourceSetlists = [], sourceSetlistId) {
  if (!sourceSetlistId || !Array.isArray(sourceSetlists)) return [];

  const selectedSetlist = sourceSetlists.find(
    (setlist) => String(setlist?.id || '') === String(sourceSetlistId)
  );

  if (!selectedSetlist || !Array.isArray(selectedSetlist.songs)) {
    return [];
  }

  return Array.from(new Set(selectedSetlist.songs.filter(Boolean)));
}

function toTimestamp(value) {
  const t = Date.parse(value || '');
  return Number.isFinite(t) ? t : 0;
}

function buildRecentSongPool(sourceSetlists = [], bandId) {
  if (!bandId || !Array.isArray(sourceSetlists)) return [];

  const scoredSongMap = new Map();
  const bandSetlists = sourceSetlists
    .filter((setlist) => String(setlist?.bandId || '') === String(bandId) && Array.isArray(setlist?.songs))
    .map((setlist) => ({
      songs: setlist.songs || [],
      recency: Math.max(toTimestamp(setlist.updatedAt), toTimestamp(setlist.createdAt)),
    }))
    .sort((a, b) => b.recency - a.recency);

  for (const setlist of bandSetlists) {
    for (let i = 0; i < setlist.songs.length; i += 1) {
      const songId = setlist.songs[i];
      if (!songId) continue;

      const prev = scoredSongMap.get(songId);
      const score = {
        songId,
        recency: setlist.recency,
        position: i,
      };

      if (!prev || score.recency > prev.recency || (score.recency === prev.recency && score.position < prev.position)) {
        scoredSongMap.set(songId, score);
      }
    }
  }

  return Array.from(scoredSongMap.values())
    .sort((a, b) => {
      if (b.recency !== a.recency) return b.recency - a.recency;
      return a.position - b.position;
    })
    .map((entry) => entry.songId);
}

export function pickAutoSongs(songIds = [], requestedCount, options = {}) {
  const uniqueSongIds = Array.from(new Set((Array.isArray(songIds) ? songIds : []).filter(Boolean)));
  if (uniqueSongIds.length === 0) return [];

  const safeCount = Math.max(1, Math.min(Number(requestedCount) || 1, uniqueSongIds.length));
  const strategy = options.strategy === 'ordered' ? 'ordered' : 'random';

  if (strategy === 'ordered') {
    return uniqueSongIds.slice(0, safeCount);
  }

  const randomFn = typeof options.randomFn === 'function' ? options.randomFn : Math.random;
  const shuffled = [...uniqueSongIds];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, safeCount);
}

export function generateAutoSetlistSongs(sourceSetlists = [], bandId, requestedCount, options = {}) {
  const strategy = options.strategy === 'ordered'
    ? 'ordered'
    : options.strategy === 'recent'
      ? 'recent'
      : 'random';

  const pool = strategy === 'recent'
    ? buildRecentSongPool(sourceSetlists, bandId)
    : collectBandSongPool(sourceSetlists, bandId);

  if (pool.length === 0) {
    throw new Error('Band yang dipilih belum punya lagu dari setlist yang bisa digenerate');
  }

  if (strategy === 'recent') {
    const safeCount = Math.max(1, Math.min(Number(requestedCount) || 1, pool.length));
    return pool.slice(0, safeCount);
  }

  return pickAutoSongs(pool, requestedCount, { ...options, strategy });
}
