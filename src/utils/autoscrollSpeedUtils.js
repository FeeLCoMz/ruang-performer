/**
 * autoscrollSpeedUtils
 * Utilitas perhitungan kecepatan autoscroll untuk dua mode:
 *
 * - 'MUSICAL': kecepatan dihitung otomatis dari parameter musik (BPM,
 *   time signature, jumlah bar/chord per baris).
 * - 'MANUAL' : kecepatan dari slider/preset konvensional (Level 1-10,
 *   sekitar 10-100 piksel per detik).
 */

export const AUTO_SCROLL_MODES = {
  MUSICAL: 'MUSICAL',
  MANUAL: 'MANUAL',
};

export const MANUAL_SPEED_BASE_MULTIPLIER = 4; // piksel/detik per level (level bawah)
export const MIN_MANUAL_SPEED_LEVEL = 1;
export const MAX_MANUAL_SPEED_LEVEL = 10;
export const DEFAULT_MANUAL_SPEED_LEVEL = 5;

/** Beat per chord default bila tidak ditentukan (mis. 1 chord = 1 bar = 4 beat). */
export const DEFAULT_BEATS_PER_CHORD = 4;

export const normalizeAutoScrollMode = (mode) => (
  String(mode).toUpperCase() === AUTO_SCROLL_MODES.MANUAL
    ? AUTO_SCROLL_MODES.MANUAL
    : AUTO_SCROLL_MODES.MUSICAL
);

export const clampManualSpeedLevel = (level) => {
  const numeric = Math.round(Number(level));
  if (!Number.isFinite(numeric)) return DEFAULT_MANUAL_SPEED_LEVEL;
  return Math.max(MIN_MANUAL_SPEED_LEVEL, Math.min(MAX_MANUAL_SPEED_LEVEL, numeric));
};

/**
 * Ambil pembilang (numerator) dari time signature "4/4" -> 4.
 */
export const parseTimeSignatureNumerator = (timeSignature) => {
  const match = String(timeSignature || '4/4').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return 4;
  const numerator = Number(match[1]);
  if (!Number.isFinite(numerator) || numerator <= 0) return 4;
  return Math.max(1, Math.min(12, numerator));
};

/**
 * Durasi satu baris (detik) berdasarkan parameter musik.
 *
 * - Jika ada barCount   : T = barCount   * (60 / BPM) * timeSignatureNumerator
 * - Jika TIDAK ada      : T = chordCount * (60 / BPM) * beatsPerChord
 */
export const computeMusicalLineDuration = ({
  barCount,
  chordCount,
  bpm = 120,
  timeSignatureNumerator = 4,
  beatsPerChord = DEFAULT_BEATS_PER_CHORD,
} = {}) => {
  const normalizedBpm = Math.max(20, Math.min(300, Number(bpm) || 120));
  const secondsPerBeat = 60 / normalizedBpm;

  const normalizedBarCount = Math.max(0, Math.round(Number(barCount) || 0));
  if (normalizedBarCount > 0) {
    const numerator = Math.max(1, Math.round(Number(timeSignatureNumerator) || 4));
    return normalizedBarCount * secondsPerBeat * numerator;
  }

  const normalizedChordCount = Math.max(0, Math.round(Number(chordCount) || 0));
  if (normalizedChordCount > 0) {
    const beats = Number(beatsPerChord) > 0 ? Number(beatsPerChord) : DEFAULT_BEATS_PER_CHORD;
    return normalizedChordCount * secondsPerBeat * beats;
  }

  // Tidak ada data musik sama sekali: fallback satu bar penuh 4/4.
  return secondsPerBeat * 4;
};

/**
 * Kecepatan gulir mode MUSICAL (piksel/detik) untuk satu baris:
 * V_scroll = lineHeightsPx / T_baris
 */
export const computeMusicalScrollSpeed = (options = {}) => {
  const heightPx = Math.max(1, Number(options.lineHeightsPx) || 0);
  const duration = computeMusicalLineDuration(options);
  if (duration <= 0) return 0;
  return heightPx / duration;
};

/**
 * Kecepatan gulir mode MANUAL (piksel/detik), skala progresif supaya level
 * rendah benar-benar lambat:
 *   level 1 = 1.5 px/s, level 5 = 30 px/s, level 10 = 90 px/s.
 * Rumus: multiplier * level^1.55 (level rendah jauh lebih lambat dari linear).
 */
export const computeManualScrollSpeed = ({
  userSpeedLevel = DEFAULT_MANUAL_SPEED_LEVEL,
  baseSpeedMultiplier = MANUAL_SPEED_BASE_MULTIPLIER,
} = {}) => {
  const level = clampManualSpeedLevel(userSpeedLevel);
  const multiplier = Math.max(1, Number(baseSpeedMultiplier) || MANUAL_SPEED_BASE_MULTIPLIER);
  const scaled = Math.pow(level, 1.55);
  return multiplier * scaled;
};

/**
 * Estimasi jumlah bar pada satu baris chord.
 * Baris "C | G | F |" -> 4 bar. Bila tidak ada separator bar (|),
 * kembalikan 0 dan gunakan chordCount sebagai fallback.
 */
export const estimateBarCount = (lineText = '') => {
  const text = String(lineText || '');
  if (!text.includes('|')) return 0;
  const segments = text
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length;
};

/**
 * Estimasi jumlah chord pada satu baris (dipisah spasi), fallback mode MUSICAL.
 */
export const estimateChordCount = (lineText = '') => {
  const text = String(lineText || '').replace(/\|/g, ' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
};
