import { parseSection, parsePresetCueLine, isChordLine } from './chordUtils.js';

/**
 * Helpers that power the "professional" song editor: a completeness score that
 * tells the user what is still missing, and lightweight lyric analysis used by
 * the section navigator. Everything here is pure so it can be unit tested.
 */

const WEIGHTS = {
  title: 18,
  artist: 12,
  key: 12,
  tempo: 10,
  timeSignature: 8,
  genre: 8,
  lyrics: 20,
  sections: 7,
  chords: 5,
};

/** Minimum number of recognised [Section] tags before we count structure as present. */
const MIN_SECTIONS = 2;

/**
 * Analyse the lyrics field once and reuse it for every check that needs it.
 * Parsing is done a single time so the score stays cheap to compute on each keystroke.
 */
export function analyseLyrics(lyrics = '') {
  const text = String(lyrics || '');
  if (!text.trim()) {
    return {
      hasLyrics: false,
      lineCount: 0,
      sectionCount: 0,
      chordLineCount: 0,
      instrumentCueCount: 0,
      hasChords: false,
      hasStructure: false,
    };
  }

  const lines = text.split(/\r?\n/);
  let sectionCount = 0;
  let chordLineCount = 0;
  let instrumentCueCount = 0;

  lines.forEach((line) => {
    if (!line.trim()) return;
    if (parsePresetCueLine(line)) {
      instrumentCueCount += 1;
      return;
    }
    const section = parseSection(line);
    if (section?.type === 'structure') {
      sectionCount += 1;
      return;
    }
    if (section?.type === 'instrument' || section?.type === 'instrument_patch') {
      instrumentCueCount += 1;
      return;
    }
    if (isChordLine(line)) {
      chordLineCount += 1;
    }
  });

  return {
    hasLyrics: true,
    lineCount: lines.length,
    sectionCount,
    chordLineCount,
    instrumentCueCount,
    hasChords: chordLineCount > 0,
    hasStructure: sectionCount >= MIN_SECTIONS,
  };
}

/**
 * Weighted completeness score for the song form.
 * Returns 0-100 plus a list of actionable items the user can still fill in.
 */
export function computeSongCompleteness(song = {}, lyricsAnalysis = null) {
  const analysis = lyricsAnalysis || analyseLyrics(song.lyrics);
  const has = (value) => Boolean(String(value ?? '').trim());

  const checks = [
    { key: 'title', label: 'Judul lagu', weight: WEIGHTS.title, done: has(song.title) },
    { key: 'artist', label: 'Artist / band', weight: WEIGHTS.artist, done: has(song.artist) },
    { key: 'key', label: 'Key lagu', weight: WEIGHTS.key, done: has(song.key) },
    { key: 'tempo', label: 'Tempo', weight: WEIGHTS.tempo, done: has(song.tempo) },
    {
      key: 'timeSignature',
      label: 'Time signature',
      weight: WEIGHTS.timeSignature,
      done: has(song.timeSignature),
    },
    { key: 'genre', label: 'Genre', weight: WEIGHTS.genre, done: has(song.genre) },
    { key: 'lyrics', label: 'Lirik', weight: WEIGHTS.lyrics, done: analysis.hasLyrics },
    {
      key: 'sections',
      label: `Struktur bagian (min. ${MIN_SECTIONS} tag seperti [Intro], [Chorus])`,
      weight: WEIGHTS.sections,
      done: analysis.hasStructure,
    },
    {
      key: 'chords',
      label: 'Chord pada lirik',
      weight: WEIGHTS.chords,
      done: analysis.hasChords,
      // Only meaningful once there is lyrics to hold the chords.
      applicable: analysis.hasLyrics,
    },
  ].filter((check) => check.applicable !== false);

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => (check.done ? sum + check.weight : sum), 0);
  const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;

  return {
    score,
    checks,
    missing: checks.filter((check) => !check.done).map((check) => check.label),
  };
}

/**
 * Ordered list of sections found in the lyrics, used by the section navigator.
 * `lineNumber` is 1-based to match what the user sees in the editor gutter.
 * Repeated sections get a numbered label ([Chorus], [Chorus 2]) so they stay distinguishable.
 */
export function extractSectionOverview(lyrics = '') {
  const text = String(lyrics || '');
  if (!text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const overview = [];
  const occurrences = new Map();

  lines.forEach((line, index) => {
    const section = parseSection(line);
    if (section?.type !== 'structure') return;

    const normalizedLabel = String(section.label || '').trim() || 'Section';
    const seen = (occurrences.get(normalizedLabel) || 0) + 1;
    occurrences.set(normalizedLabel, seen);

    overview.push({
      key: buildSectionKey(normalizedLabel, seen),
      label: normalizedLabel,
      occurrence: seen,
      lineNumber: index + 1,
      lineIndex: index,
    });
  });

  return overview;
}

/**
 * Split a section label into a stable key so repeated sections ("[Chorus]", "[Chorus]")
 * can be numbered for the navigator.
 */
export function buildSectionKey(label, occurrence) {
  const normalized = String(label || 'section')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  return `${normalized}-${occurrence}`;
}

const VALID_KEY_REGEX = /^[A-G][#b]?m?$/;
const VALID_TIME_DENOMINATORS = [1, 2, 4, 8, 16];

/**
 * Validate the musical fields that would otherwise be stored blindly.
 * Every field is optional, so empty input is always accepted.
 * Returns one message per field; an empty string means the value is fine.
 */
export function validateMusicalFields({ key, timeSignature, tempo }) {
  const errors = { key: '', timeSignature: '', tempo: '' };

  const trimmedKey = String(key ?? '').trim();
  if (trimmedKey && !VALID_KEY_REGEX.test(trimmedKey)) {
    errors.key = 'Format key tidak dikenal. Contoh: C, Am, F#, Bb.';
  }

  const trimmedTime = String(timeSignature ?? '').trim();
  if (trimmedTime) {
    const match = trimmedTime.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
    if (!match) {
      errors.timeSignature = 'Format birama harus angka/angka. Contoh: 4/4, 3/4, 6/8.';
    } else {
      const numerator = Number(match[1]);
      const denominator = Number(match[2]);
      if (numerator < 1 || numerator > 16) {
        errors.timeSignature = 'Jumlah ketukan harus antara 1 dan 16.';
      } else if (!VALID_TIME_DENOMINATORS.includes(denominator)) {
        errors.timeSignature = 'Penyebut birama harus 1, 2, 4, 8, atau 16.';
      }
    }
  }

  const trimmedTempo = String(tempo ?? '').trim();
  if (trimmedTempo) {
    const numeric = Number(trimmedTempo);
    if (!Number.isFinite(numeric)) {
      errors.tempo = 'Tempo harus berupa angka.';
    } else if (numeric < 40 || numeric > 240) {
      errors.tempo = 'Tempo di luar rentang wajar (40-240 BPM).';
    }
  }

  return errors;
}

/**
 * Find MIDI cue conflicts that would misbehave on stage.
 *
 * The dangerous case: two cues target the same channel with different programs,
 * but the earlier one is never reset — so whichever fires last wins silently.
 * Also flags a cue whose program/channel is out of MIDI range.
 *
 * Returns a list of { severity, lineNumber, message } plus per-channel usage.
 */
export function detectMidiCueConflicts(lyrics = '') {
  const text = String(lyrics || '');
  if (!text.trim()) return { conflicts: [], cueCount: 0, channels: {} };

  const lines = text.split(/\r?\n/);
  const cues = [];

  lines.forEach((line, index) => {
    const parsed = parsePresetCueLine(line);
    if (!parsed?.midi) return;

    // The cue parser clamps out-of-range values to defaults (PC 200 -> program 0,
    // CH 20 -> channel 1), so range checking has to read the raw numbers from
    // the source line. Otherwise a broken cue looks identical to a valid one.
    const rawProgram = Number.parseInt((line.match(/\bPC\s*[:=]?\s*(-?\d+)/i) || [])[1], 10);
    const rawChannel = Number.parseInt((line.match(/\bCH\s*[:=]?\s*(-?\d+)/i) || [])[1], 10);

    const channel = Number.isFinite(rawChannel)
      ? rawChannel
      : Number.isFinite(Number(parsed.midi.channel))
        ? Number(parsed.midi.channel)
        : null;
    const program = Number.isFinite(rawProgram)
      ? rawProgram
      : Number.isFinite(Number(parsed.midi.program))
        ? Number(parsed.midi.program)
        : null;

    cues.push({
      lineNumber: index + 1,
      label: parsed.label,
      channel,
      program,
    });
  });

  const conflicts = [];
  const channels = {};

  for (const cue of cues) {
    if (cue.channel === null) continue;
    if (!channels[cue.channel]) channels[cue.channel] = [];
    channels[cue.channel].push(cue);

    if (cue.channel < 1 || cue.channel > 16) {
      conflicts.push({
        severity: 'error',
        lineNumber: cue.lineNumber,
        message: `Channel ${cue.channel} di luar rentang MIDI (1-16) pada ${cue.label}.`,
      });
    }
    if (cue.program !== null && (cue.program < 0 || cue.program > 127)) {
      conflicts.push({
        severity: 'error',
        lineNumber: cue.lineNumber,
        message: `Program ${cue.program} di luar rentang MIDI (0-127) pada ${cue.label}.`,
      });
    }
  }

  // Same channel, different programs: the later cue silently replaces the earlier.
  for (const [channel, channelCues] of Object.entries(channels)) {
    const withProgram = channelCues.filter((cue) => cue.program !== null);
    if (withProgram.length < 2) continue;

    const distinctPrograms = new Set(withProgram.map((cue) => cue.program));
    if (distinctPrograms.size > 1) {
      conflicts.push({
        severity: 'warning',
        lineNumber: withProgram[withProgram.length - 1].lineNumber,
        message:
          `Channel ${channel} dipakai ${withProgram.length} cue dengan program berbeda ` +
          `(${withProgram.map((c) => c.label).join(' → ')}). ` +
          'Cue terakhir akan menimpa yang sebelumnya.',
      });
    }
  }

  return { conflicts, cueCount: cues.length, channels };
}
