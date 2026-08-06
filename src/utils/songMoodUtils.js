function parseTempoValue(tempo) {
  const value = parseInt(String(tempo ?? '').replace(/,/g, '.'), 10);
  return Number.isFinite(value) ? value : null;
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getBaseLevelFromTempo(tempo) {
  if (tempo === null) return 2;
  if (tempo < 76) return 0;
  if (tempo < 96) return 1;
  if (tempo < 121) return 2;
  if (tempo < 146) return 3;
  return 4;
}

function getGenreAdjustment(genreText) {
  if (!genreText) return 0;

  const intenseGenres = ['metal', 'punk', 'hardcore', 'edm', 'dance'];
  if (intenseGenres.some((token) => genreText.includes(token))) return 1;

  const softGenres = ['ballad', 'acoustic', 'worship', 'ambient', 'lullaby'];
  if (softGenres.some((token) => genreText.includes(token))) return -1;

  return 0;
}

function getStyleAdjustment(styleText) {
  if (!styleText) return 0;

  if (styleText.includes('stripped') || styleText.includes('akustik') || styleText.includes('acoustic')) {
    return -1;
  }

  if (styleText.includes('full band') || styleText.includes('festival') || styleText.includes('anthem')) {
    return 1;
  }

  return 0;
}

const LEVEL_TO_MOOD = [
  { tone: 'calm', label: 'Tenang' },
  { tone: 'warm', label: 'Hangat' },
  { tone: 'groove', label: 'Groove' },
  { tone: 'energetic', label: 'Enerjik' },
  { tone: 'peak', label: 'Puncak' },
];

export function inferSongMood(song) {
  const tempo = parseTempoValue(song?.tempo);
  const genreText = normalizeText(song?.genre);
  const styleText = normalizeText(song?.arrangementStyle || song?.arrangement_style);

  const baseLevel = getBaseLevelFromTempo(tempo);
  const adjustedLevel = Math.max(0, Math.min(4, baseLevel + getGenreAdjustment(genreText) + getStyleAdjustment(styleText)));

  const mood = LEVEL_TO_MOOD[adjustedLevel] || { tone: 'neutral', label: 'Netral' };
  const sourceHint = tempo === null ? 'genre dan style' : `tempo ${tempo} BPM`;

  return {
    ...mood,
    sourceHint,
  };
}
