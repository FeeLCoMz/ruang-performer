/**
 * timestamps.js
 *
 * Parsing dan penggabungan marker waktu ([mm:ss] / [hh:mm:ss]) dengan marker
 * yang sudah ada pada sebuah lagu.
 */
import { parseSection } from './sections.js';

/**
 * Helper: parse [mm:ss] or [hh:mm:ss] timestamp to seconds
 * @param {string} token - Token timestamp (misal: [01:23] atau [1:02:03])
 * @returns {number|null} detik, atau null jika tidak cocok
 */
export function parseTimestampToken(token) {
  if (typeof token !== 'string') return null;

  const m = token.match(/^\[(\d{1,2}):(\d{2})\]$/); // [mm:ss]
  if (m) {
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  const h = token.match(/^\[(\d{1,2}):(\d{2}):(\d{2})\]$/); // [hh:mm:ss]
  if (h) {
    return parseInt(h[1], 10) * 3600 + parseInt(h[2], 10) * 60 + parseInt(h[3], 10);
  }
  return null;
}

/** Fresh regex per call: a shared /g literal keeps lastIndex between calls. */
const createTimestampRegex = () => /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

function formatMarkerTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;

  if (hh > 0) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

function normalizeMarkerTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
      return parseTimestampToken(`[${trimmed}]`);
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.floor(numeric));
    }
  }

  return null;
}

/**
 * Ekstrak semua timestamp [mm:ss] / [hh:mm:ss] dari teks lirik/chord.
 * Return unik, terurut naik (dalam detik).
 */
export function extractTimestampSeconds(text) {
  if (typeof text !== 'string' || !text.trim()) return [];

  const found = new Set();
  const timestampRegex = createTimestampRegex();

  let match;
  while ((match = timestampRegex.exec(text)) !== null) {
    const token = `[${match[1]}:${match[2]}${match[3] ? `:${match[3]}` : ''}]`;
    const seconds = parseTimestampToken(token);
    if (seconds !== null) {
      found.add(seconds);
    }
  }

  return Array.from(found).sort((a, b) => a - b);
}

/**
 * Cari label struktur yang tepat bersebelahan dengan timestamp.
 */
function resolveTimestampLabelsFromLyrics(lyricsText) {
  const lines = typeof lyricsText === 'string' ? lyricsText.split(/\r?\n/) : [];
  const labelByTime = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = String(line || '').trim();
    if (!trimmed) continue;

    const lineTimes = Array.from(trimmed.matchAll(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g))
      .map((match) => parseTimestampToken(`[${match[1]}:${match[2]}${match[3] ? `:${match[3]}` : ''}]`))
      .filter((time) => time !== null);

    if (lineTimes.length === 0) continue;

    const previousSection = parseSection(lines[index - 1]);
    const nextSection = parseSection(lines[index + 1]);
    const adjacentSectionLabel = (nextSection?.type === 'structure' && nextSection.label)
      || (previousSection?.type === 'structure' && previousSection.label)
      || null;

    lineTimes.forEach((time) => {
      if (adjacentSectionLabel) {
        labelByTime.set(time, adjacentSectionLabel);
      }
    });
  }

  return labelByTime;
}

/**
 * Gabungkan marker existing dengan timestamp yang terdeteksi di lirik/chord.
 * Marker existing dipertahankan, timestamp baru ditambahkan jika belum ada.
 */
export function mergeDetectedTimestampsIntoMarkers(lyricsText, existingMarkers = []) {
  const normalizedExisting = Array.isArray(existingMarkers)
    ? existingMarkers
        .map((marker) => {
          const normalizedTime = normalizeMarkerTime(marker?.time);
          if (normalizedTime === null) return null;

          return {
            ...(marker || {}),
            time: normalizedTime,
          };
        })
        .filter(Boolean)
    : [];

  const seenTimes = new Set(normalizedExisting.map((marker) => marker.time));
  const detectedTimes = extractTimestampSeconds(lyricsText);
  const labelsByTime = resolveTimestampLabelsFromLyrics(lyricsText);

  const appended = detectedTimes
    .filter((time) => !seenTimes.has(time))
    .map((time) => ({
      time,
      label: labelsByTime.get(time) || `Timestamp ${formatMarkerTime(time)}`,
    }));

  return [...normalizedExisting, ...appended].sort((a, b) => a.time - b.time);
}
