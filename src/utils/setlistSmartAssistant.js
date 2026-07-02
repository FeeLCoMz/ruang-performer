const KEY_INDEX = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

function parseTempo(tempo) {
  const value = parseInt(String(tempo ?? '').replace(/,/g, '.'), 10);
  if (Number.isNaN(value)) return 110;
  return Math.max(50, Math.min(220, value));
}

function normalizeRootKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const match = rawKey.trim().match(/[A-Ga-g](#|b)?/);
  if (!match) return null;
  const token = match[0];
  const upper = token.charAt(0).toUpperCase();
  const accidental = token.slice(1);
  return `${upper}${accidental}`;
}

function keyDistance(keyA, keyB) {
  const rootA = normalizeRootKey(keyA);
  const rootB = normalizeRootKey(keyB);
  if (!rootA || !rootB) return 3;
  const a = KEY_INDEX[rootA];
  const b = KEY_INDEX[rootB];
  if (typeof a !== 'number' || typeof b !== 'number') return 3;
  const diff = Math.abs(a - b);
  return Math.min(diff, 12 - diff);
}

function parseMarkerSeconds(marker) {
  if (typeof marker === 'number') return marker;
  if (typeof marker === 'string') {
    const parts = marker.split(':').map((part) => parseInt(part, 10));
    if (parts.some(Number.isNaN)) return null;
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }
  if (marker && typeof marker === 'object') {
    if (typeof marker.time === 'number') return marker.time;
    if (typeof marker.time === 'string') return parseMarkerSeconds(marker.time);
    if (typeof marker.timestamp === 'number') return marker.timestamp;
    if (typeof marker.timestamp === 'string') return parseMarkerSeconds(marker.timestamp);
  }
  return null;
}

function estimateDurationSeconds(song) {
  const directSeconds = [song?.durationSec, song?.duration, song?.lengthSec]
    .map((item) => Number(item))
    .find((value) => Number.isFinite(value) && value > 0);

  if (directSeconds) return Math.round(directSeconds);

  const durationMs = Number(song?.durationMs);
  if (Number.isFinite(durationMs) && durationMs > 0) {
    return Math.round(durationMs / 1000);
  }

  const markers = Array.isArray(song?.time_markers) ? song.time_markers : [];
  if (markers.length > 0) {
    const maxMarker = markers
      .map(parseMarkerSeconds)
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);

    if (maxMarker > 0) {
      // Add tail room after the last marker to avoid under-estimation.
      return Math.round(maxMarker + 25);
    }
  }

  const tempo = parseTempo(song?.tempo);
  const estimated = 215 - Math.round((tempo - 110) * 0.45);
  return Math.max(140, Math.min(360, estimated));
}

function computeEnergy(song) {
  const tempo = parseTempo(song?.tempo);
  let score = (tempo - 50) / 170;

  const genre = String(song?.genre || '').toLowerCase();
  const title = String(song?.title || '').toLowerCase();

  if (/rock|punk|metal|dance|edm|funk/.test(genre)) score += 0.11;
  if (/ballad|acoustic|worship|jazz|ambient|slow/.test(genre)) score -= 0.1;
  if (/live|anthem|party|hype/.test(title)) score += 0.05;

  return Math.max(0.05, Math.min(0.95, score));
}

function transitionCost(previous, next, strategy) {
  const tempoA = parseTempo(previous?.tempo);
  const tempoB = parseTempo(next?.tempo);
  const tempoJump = Math.abs(tempoA - tempoB) / 180;
  const keyJump = keyDistance(previous?.key, next?.key) / 6;
  const energyJump = Math.abs(previous?.energy - next?.energy);

  if (strategy === 'smooth') {
    return tempoJump * 0.45 + keyJump * 0.45 + energyJump * 0.1;
  }

  if (strategy === 'energy') {
    const targetJump = next.energy >= previous.energy ? 0.04 : 0.09;
    return keyJump * 0.2 + tempoJump * 0.2 + Math.abs(energyJump - targetJump) * 0.6;
  }

  // balanced
  return tempoJump * 0.35 + keyJump * 0.35 + energyJump * 0.3;
}

function selectShowBlock(orderedSongs, targetMinutes) {
  if (!targetMinutes || targetMinutes <= 0) return orderedSongs.map((song) => song.id);

  const targetSeconds = Math.round(targetMinutes * 60);
  const selected = [];
  let running = 0;

  for (const song of orderedSongs) {
    const nextSum = running + song.durationSec;
    if (selected.length < 3) {
      selected.push(song.id);
      running = nextSum;
      continue;
    }

    const currentGap = Math.abs(targetSeconds - running);
    const nextGap = Math.abs(targetSeconds - nextSum);

    if (nextGap <= currentGap || running < targetSeconds * 0.85) {
      selected.push(song.id);
      running = nextSum;
    }

    if (running >= targetSeconds * 1.08) break;
  }

  if (selected.length === 0 && orderedSongs.length > 0) {
    selected.push(orderedSongs[0].id);
  }

  return selected;
}

export function buildSmartSetlistPlan(inputSongs, options = {}) {
  const strategy = options.strategy || 'balanced';
  const targetMinutes = Number(options.targetMinutes) || 0;

  const songs = (inputSongs || [])
    .filter((song) => song && song.id)
    .map((song) => ({
      ...song,
      tempo: parseTempo(song.tempo),
      durationSec: estimateDurationSeconds(song),
      energy: computeEnergy(song),
    }));

  if (songs.length <= 1) {
    const onlyIds = songs.map((song) => song.id);
    return {
      orderedSongIds: onlyIds,
      featuredSongIds: onlyIds,
      estimatedMinutes: Math.round((songs.reduce((sum, song) => sum + song.durationSec, 0) / 60) * 10) / 10,
      featuredMinutes: Math.round((songs.reduce((sum, song) => sum + song.durationSec, 0) / 60) * 10) / 10,
      strategy,
    };
  }

  const sortedByEnergy = [...songs].sort((a, b) => a.energy - b.energy);
  const opener = sortedByEnergy[Math.floor(sortedByEnergy.length * 0.45)] || sortedByEnergy[0];

  const remaining = songs.filter((song) => song.id !== opener.id);
  const ordered = [opener];

  while (remaining.length > 0) {
    const previous = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestCost = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const phase = ordered.length / (songs.length - 1);
      const arcTarget = 0.45 + Math.sin(phase * Math.PI) * 0.35;
      const arcPenalty = Math.abs(candidate.energy - arcTarget) * (strategy === 'energy' ? 0.8 : 0.45);
      const cost = transitionCost(previous, candidate, strategy) + arcPenalty;
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
      }
    }

    const [picked] = remaining.splice(bestIdx, 1);
    ordered.push(picked);
  }

  const featuredSongIds = selectShowBlock(ordered, targetMinutes);
  const featuredSet = new Set(featuredSongIds);
  const fallbackSongs = ordered.filter((song) => !featuredSet.has(song.id)).map((song) => song.id);
  const orderedSongIds = [...featuredSongIds, ...fallbackSongs];

  const totalMinutes = Math.round((ordered.reduce((sum, song) => sum + song.durationSec, 0) / 60) * 10) / 10;
  const featuredMinutes = Math.round(
    (ordered
      .filter((song) => featuredSet.has(song.id))
      .reduce((sum, song) => sum + song.durationSec, 0) / 60) * 10
  ) / 10;

  return {
    orderedSongIds,
    featuredSongIds,
    estimatedMinutes: totalMinutes,
    featuredMinutes,
    strategy,
  };
}
