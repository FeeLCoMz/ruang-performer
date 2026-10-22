/**
 * analysis.js
 *
 * Analisis lagu berbasis chord: parseChordPro (format chord di atas lirik),
 * statistik penggunaan chord, estimasi key/modulasi, dan rekomendasi key
 * yang ramah piano.
 */
import {
  CHORD_REGEX_GLOBAL,
  isChordLine,
  normalizeChordToken,
  toCleanChord,
  getNoteIndex,
  transposeChord,
} from './chordTokens.js';

// Fungsi untuk expand compact chord format (D..Gm..Bb) menjadi format spaced
const expandCompactChords = (line) => {
  // Check if line contains compact format (chord..chord..chord or chord-chord).
  // Non-global on purpose: a /g regex keeps lastIndex between calls, and the
  // old test matched against the line before split() consumed it.
  const compactPattern = /(?<![A-Za-z0-9\/])[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?(?:\.\.|-)/;

  if (!compactPattern.test(line)) return line;

  // Split by .. or - and join with spaces for proper spacing
  const chords = line.split(/(?:\.\.|-)/).map(c => c.trim()).filter(c => c);
  return chords.join('   '); // Add spacing between chords
};

// Fungsi untuk mengkonversi format standard (chord di atas lirik) ke ChordPro-like format
const parseStandardFormat = (lines) => {
  const parsed = [];
  let currentSection = null;

  const normalizeSection = (name) => {
    const n = name.toLowerCase().replace(/[.:]+$/, ''); // Remove trailing dots/colons
    if (n.includes('intro')) return 'intro';
    if (n.includes('verse')) return 'verse';
    if (n.includes('pre') && n.includes('chorus')) return 'pre-chorus';
    if (n.includes('post') && n.includes('chorus')) return 'post-chorus';
    if (n.includes('chorus')) return 'chorus';
    if (n.includes('bridge')) return 'bridge';
    if (n.includes('outro')) return 'outro';
    if (n.includes('coda')) return 'coda';
    if (n.includes('interlude') || n === 'int') return 'interlude';
    if (n.includes('solo')) return 'solo';
    if (n.includes('refrain') || n.includes('reff')) return 'refrain';
    if (n.includes('musik')) return 'musik';
    return null;
  };

  /** Tutup seksi yang sedang berjalan lalu buka seksi baru. */
  const startSection = (structure) => {
    if (currentSection) {
      parsed.push({ type: 'structure_end', structure: currentSection });
    }
    parsed.push({ type: 'structure_start', structure });
    currentSection = structure;
  };

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    if (!currentLine.trim()) {
      parsed.push({ type: 'empty', line: '' });
      continue;
    }

    const trimmedLine = currentLine.trim();

    // Tambahan: Deteksi struktur dengan braket [Section]
    const bracketSectionMatch = trimmedLine.match(/^\[([A-Za-z0-9 .:-_]+)\]$/);
    if (bracketSectionMatch) {
      const normalizedSectionName = normalizeSection(bracketSectionMatch[1].trim());
      if (normalizedSectionName) {
        startSection(normalizedSectionName);
        continue;
      }
    }

    // Check for standalone section header (e.g., "Int.", "Intro", "Intro:", "Intro :" on its own line)
    const standaloneSectionMatch = trimmedLine.match(/^([A-Za-z.]+)\s*:?\s*$/);
    if (standaloneSectionMatch) {
      const normalizedSectionName = normalizeSection(standaloneSectionMatch[1].trim());
      if (normalizedSectionName) {
        startSection(normalizedSectionName);
        continue;
      }
    }

    // Check for section header with inline chords (e.g., "Int. C G Am", "Int: C G Am", "Int : D..Gm..Bb")
    const sectionWithChordsMatch = trimmedLine.match(/^([A-Za-z.]+)\s*:?\s+(.+)$/);
    if (sectionWithChordsMatch) {
      const possibleSection = sectionWithChordsMatch[1].trim();
      const possibleChords = sectionWithChordsMatch[2].trim();
      const normalizedSectionName = normalizeSection(possibleSection);

      // If section matches, always treat it as section (even if rest is not chords)
      if (normalizedSectionName) {
        startSection(normalizedSectionName);

        // Expand compact format if present
        const expandedChords = expandCompactChords(possibleChords);

        // Parse the chord line using CHORD_REGEX_GLOBAL
        const chords = [...expandedChords.matchAll(CHORD_REGEX_GLOBAL)].map((match) => ({
          chord: match[0],
          position: match.index + possibleSection.length + 1,
        }));

        // Lirik baris berikutnya (bukan chord, bukan kosong) ikut menempel.
        let lyricText = '';
        if (nextLine && nextLine.trim() && !isChordLine(nextLine)) {
          lyricText = nextLine;
          i++; // Skip next line since we consumed it
        }

        parsed.push({
          type: 'line_with_chords',
          chords,
          text: lyricText,
          barText: expandedChords, // Preserve bars and chord spacing source
          sourceLine: i + 1,
        });
        continue;
      }
    }

    // Deteksi metadata sederhana
    if (currentLine.includes(':') && currentLine.length < 50) {
      const colonIndex = currentLine.indexOf(':');
      const keyRaw = currentLine.substring(0, colonIndex).trim().toLowerCase();
      const value = currentLine.substring(colonIndex + 1).trim();

      const normalizedKey = (() => {
        if (['original key', 'original_key'].includes(keyRaw)) return 'original_key';
        if (keyRaw === 'time signature') return 'time';
        return keyRaw;
      })();

      if (['title', 'artist', 'key', 'tempo', 'time', 'original_key'].includes(normalizedKey)) {
        parsed.push({ type: 'metadata', key: normalizedKey, value });
        continue;
      }

      // Section header detection (e.g., "Verse:", "Chorus:")
      const sectionName = normalizeSection(keyRaw);
      if (sectionName) {
        startSection(sectionName);
        continue;
      }
    }

    // Cek apakah baris ini adalah baris chord
    if (isChordLine(currentLine)) {
      // Expand compact format if present (D..Gm..Bb -> D   Gm   Bb)
      const expandedLine = expandCompactChords(currentLine);

      // Extract chords using CHORD_REGEX_GLOBAL
      const chords = [...expandedLine.matchAll(CHORD_REGEX_GLOBAL)].map((match) => ({
        chord: match[0],
        position: match.index,
      }));

      const hasLyricBelow = Boolean(nextLine && !isChordLine(nextLine) && nextLine.trim());
      parsed.push({
        type: 'line_with_chords',
        chords,
        text: hasLyricBelow ? nextLine : '',
        barText: expandedLine, // Keep expanded chord line for bar detection
        sourceLine: i + 1,
      });

      // Skip next line karena sudah diproses satu paket dengan chord di atasnya.
      if (hasLyricBelow) i++;
    } else {
      // Baris teks biasa
      parsed.push({
        type: 'text',
        line: currentLine,
      });
    }
  }

  if (currentSection) {
    parsed.push({ type: 'structure_end', structure: currentSection });
  }

  return parsed;
};

export const parseChordPro = (text) => {
  // Hanya gunakan format standar (chord di atas lirik, tanpa tag ChordPro)
  if (!text) return { metadata: {}, lines: [], structures: {} };

  const lines = text.split('\n');
  const parsedLines = parseStandardFormat(lines);
  const metadata = {};

  // Extract metadata dari parsed lines
  const contentLines = parsedLines.filter(line => {
    if (line.type === 'metadata') {
      metadata[line.key] = line.value;
      return false;
    }
    return true;
  });

  // Kumpulkan struktur dari parsedLines
  const structures = {};
  let currentStruct = null;
  let structLines = [];
  contentLines.forEach((line) => {
    if (line.type === 'structure_start') {
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = line.structure;
      structLines = [];
    } else if (line.type === 'structure_end') {
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = null;
      structLines = [];
    } else if (currentStruct) {
      structLines.push(line);
    }
  });
  if (currentStruct && structLines.length > 0) {
    structures[currentStruct] = [...structLines];
  }

  return { metadata, lines: contentLines, structures };
};

/** Ambil root chord (tanpa passing dash, bracket, atau titik durasi). */
const extractChordRoot = (chord) => {
  if (!chord || typeof chord !== 'string') return null;
  const match = toCleanChord(chord).match(/^([A-G][#b]?)/);
  return match ? match[1] : null;
};

/** Susun [{ chord, count }] urut dari paling sering lalu alfabetis. */
const sortUsageCounts = (usageMap) => Array.from(usageMap.entries())
  .map(([chord, count]) => ({ chord, count }))
  .sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.chord.localeCompare(b.chord);
  });

export const getAllChords = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const chordSet = new Set();

  parsedSong.lines.forEach((line) => {
    if (line.type !== 'line_with_chords' || !line.chords) return;
    line.chords.forEach(({ chord }) => {
      const cleanChord = toCleanChord(chord);
      if (cleanChord) chordSet.add(cleanChord);
    });
  });

  return Array.from(chordSet).sort();
};

/**
 * Hitung frekuensi penggunaan setiap chord.
 * Return: [{ chord: 'C', count: 5 }, ...] urut dari paling sering.
 */
export const getChordUsageCounts = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const usageMap = new Map();

  parsedSong.lines.forEach((line) => {
    if (line.type !== 'line_with_chords' || !line.chords) return;

    line.chords.forEach(({ chord }) => {
      const cleanChord = toCleanChord(chord);
      if (!cleanChord) return;

      usageMap.set(cleanChord, (usageMap.get(cleanChord) || 0) + 1);
    });
  });

  return sortUsageCounts(usageMap);
};

const buildUsageCountsFromChordList = (chords = []) => {
  if (!Array.isArray(chords) || chords.length === 0) return [];

  const usageMap = new Map();
  chords.forEach((chord) => {
    const cleanChord = toCleanChord(chord);
    if (!cleanChord) return;
    usageMap.set(cleanChord, (usageMap.get(cleanChord) || 0) + 1);
  });

  return sortUsageCounts(usageMap);
};

const MAJOR_SCALE_PROFILE = {
  intervals: [0, 2, 4, 5, 7, 9, 11],
  qualities: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
};

const MINOR_SCALE_PROFILE = {
  intervals: [0, 2, 3, 5, 7, 8, 10],
  qualities: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
};

/** Nada dasar tiap pitch class (0..11), memilih enharmonik yang paling umum. */
const KEY_ROOT_BY_PITCH_CLASS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const getChordQualityFamily = (chord) => {
  if (!chord || typeof chord !== 'string') return 'major';
  const match = toCleanChord(chord).match(/^([A-G][#b]?)(.*)$/);
  if (!match) return 'major';

  const suffix = (match[2] || '').toLowerCase();
  if (suffix.includes('dim') || suffix.includes('m7b5')) return 'diminished';
  if (suffix.includes('aug') || suffix.includes('#5')) return 'augmented';
  if (/^(m|min)(?!aj)/.test(suffix)) return 'minor';
  return 'major';
};

/**
 * Estimasi key dari kumpulan chord berdasarkan kecocokan skala diatonik.
 */
export const estimateKeyFromChordUsage = (usageCounts = []) => {
  if (!Array.isArray(usageCounts) || usageCounts.length === 0) return null;

  const candidates = [];

  for (let tonic = 0; tonic < 12; tonic += 1) {
    const majorMembership = new Map();
    MAJOR_SCALE_PROFILE.intervals.forEach((interval, idx) => {
      majorMembership.set((tonic + interval) % 12, MAJOR_SCALE_PROFILE.qualities[idx]);
    });

    const minorMembership = new Map();
    MINOR_SCALE_PROFILE.intervals.forEach((interval, idx) => {
      minorMembership.set((tonic + interval) % 12, MINOR_SCALE_PROFILE.qualities[idx]);
    });

    const scoreCandidate = (mode, membership) => {
      let score = 0;
      let matchedWeight = 0;
      let totalWeight = 0;

      usageCounts.forEach(({ chord, count }) => {
        const root = extractChordRoot(chord);
        const rootIdx = getNoteIndex(root);
        if (rootIdx == null) return;

        const weight = Number(count) || 0;
        if (weight <= 0) return;
        totalWeight += weight;

        const expectedQuality = membership.get(rootIdx);
        if (!expectedQuality) {
          score -= weight * 0.45;
          return;
        }

        matchedWeight += weight;
        score += weight * 1.4;

        const actualQuality = getChordQualityFamily(chord);
        if (actualQuality === expectedQuality) {
          score += weight * 0.8;
        }
      });

      // C major and A minor share the exact same diatonic chords, so the
      // membership score alone can never separate them. Break the tie with
      // the tonic itself: heavier use of the tonic chord favours that mode.
      const tonicUsage = usageCounts
        .filter(({ chord }) => getNoteIndex(extractChordRoot(chord)) === tonic)
        .reduce((sum, { count }) => sum + (Number(count) || 0), 0);
      score += tonicUsage * 0.3;

      const tonicLabel = KEY_ROOT_BY_PITCH_CLASS[tonic];
      const key = mode === 'major' ? tonicLabel : `${tonicLabel}m`;

      return {
        key,
        mode,
        score,
        matchedWeight,
        totalWeight,
      };
    };

    candidates.push(scoreCandidate('major', majorMembership));
    candidates.push(scoreCandidate('minor', minorMembership));
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;

  const alternatives = candidates
    .slice(1)
    .map((candidate) => candidate.key)
    .filter((value, idx, arr) => arr.indexOf(value) === idx)
    .slice(0, 2);
  const second = candidates[1] || null;

  const matchRatio = best.totalWeight > 0 ? best.matchedWeight / best.totalWeight : 0;
  const confidenceRaw = Math.min(1, Math.max(0, matchRatio * 0.75 + ((best.score - (second?.score || 0)) / 10) * 0.25));
  const confidence = Math.round(confidenceRaw * 100);

  return {
    key: best.key,
    mode: best.mode,
    confidence,
    alternatives,
  };
};

/** Estimasi key untuk satu jendela chord, null bila keyakinan di bawah ambang. */
const detectWindowKey = (chords, minConfidence) => {
  if (!Array.isArray(chords) || chords.length === 0) return null;
  const estimation = estimateKeyFromChordUsage(buildUsageCountsFromChordList(chords));
  return estimation && estimation.confidence >= minConfidence ? estimation : null;
};

/**
 * Deteksi modulasi berdasarkan pergeseran estimasi key antar blok chord berurutan.
 */
export const detectChordModulations = (parsedSong, options = {}) => {
  if (!parsedSong || !Array.isArray(parsedSong.lines)) {
    return { hasModulation: false, modulationCount: 0, transitions: [], timeline: [] };
  }

  const {
    lineWindow = 2,
    minDetectedConfidence = 48,
    minSegmentLines = 2,
  } = options;

  const chordLines = [];
  parsedSong.lines.forEach((line, index) => {
    if (line.type !== 'line_with_chords' || !Array.isArray(line.chords)) return;

    const chords = line.chords.map(({ chord }) => toCleanChord(chord)).filter(Boolean);
    if (!chords.length) return;

    chordLines.push({
      sourceLine: Number(line.sourceLine) > 0 ? Number(line.sourceLine) : index + 1,
      chords,
    });
  });

  if (chordLines.length < lineWindow + 1) {
    return { hasModulation: false, modulationCount: 0, transitions: [], timeline: [] };
  }

  // Estimasi key dihitung per jendela (lineWindow baris chord terakhir).
  const keyPerLine = chordLines.map((line, idx) => {
    const windowStart = Math.max(0, idx - lineWindow + 1);
    const windowChords = [];
    for (let i = windowStart; i <= idx; i += 1) {
      windowChords.push(...chordLines[i].chords);
    }

    return {
      ...line,
      detectedKey: detectWindowKey(windowChords, minDetectedConfidence),
    };
  });

  const timeline = [];
  keyPerLine.forEach((line) => {
    const key = line.detectedKey?.key || null;
    const confidence = line.detectedKey?.confidence || 0;

    const lastSegment = timeline[timeline.length - 1];
    if (!key) return;

    if (!lastSegment || lastSegment.key !== key) {
      timeline.push({
        key,
        startSourceLine: line.sourceLine,
        endSourceLine: line.sourceLine,
        lineCount: 1,
        confidenceSum: confidence,
      });
      return;
    }

    lastSegment.endSourceLine = line.sourceLine;
    lastSegment.lineCount += 1;
    lastSegment.confidenceSum += confidence;
  });

  const normalizedTimeline = timeline.map((segment) => ({
    key: segment.key,
    startSourceLine: segment.startSourceLine,
    endSourceLine: segment.endSourceLine,
    lineCount: segment.lineCount,
    confidence: Math.round(segment.confidenceSum / Math.max(1, segment.lineCount)),
  }));

  const stableSegments = normalizedTimeline.filter((segment) => segment.lineCount >= minSegmentLines);
  if (stableSegments.length < 2) {
    return {
      hasModulation: false,
      modulationCount: 0,
      transitions: [],
      timeline: normalizedTimeline,
    };
  }

  const transitions = [];
  for (let i = 1; i < stableSegments.length; i += 1) {
    const prev = stableSegments[i - 1];
    const next = stableSegments[i];
    if (!prev.key || !next.key || prev.key === next.key) continue;

    transitions.push({
      fromKey: prev.key,
      toKey: next.key,
      startLine: next.startSourceLine,
      endLine: next.endSourceLine,
      confidence: Math.round((prev.confidence + next.confidence) / 2),
    });
  }

  return {
    hasModulation: transitions.length > 0,
    modulationCount: transitions.length,
    transitions,
    timeline: normalizedTimeline,
  };
};

// Mengelompokkan chord berdasarkan bar (|) pada setiap baris chord
export const getChordsByBar = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const bars = [];
  parsedSong.lines.forEach(line => {
    if (line.type === 'line_with_chords' && line.barText) {
      // Split berdasarkan bar line
      const barParts = line.barText.split('|').map(part => part.trim()).filter(Boolean);
      barParts.forEach(bar => {
        // Ambil semua chord dalam bar ini
        const chords = [...bar.matchAll(CHORD_REGEX_GLOBAL)].map(match =>
          normalizeChordToken(match[0].replace(/^-/, ''))
        ).filter(Boolean);
        if (chords.length > 0) {
          bars.push(chords);
        }
      });
    }
  });
  return bars;
};

const KEY_SIGNATURE_ACCIDENTALS = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  'C#': 7,
  F: 1,
  Bb: 2,
  Eb: 3,
  Ab: 4,
  Db: 5,
  Gb: 6,
  Cb: 7,
};

const getPianoPlayabilityBreakdown = (chords = [], steps = 0) => {
  const accidentalChordCount = chords.reduce((count, chord) => {
    const transposedChord = transposeChord(chord, steps);
    const root = extractChordRoot(transposedChord);
    if (!root) return count;

    // Chord dengan accidental cenderung lebih menantang untuk mayoritas pemain piano.
    return /[#b]/.test(root) ? count + 1 : count;
  }, 0);

  return {
    accidentalChordCount,
    totalChords: chords.length,
    chordPenalty: accidentalChordCount * 2,
  };
};

/**
 * Rekomendasi nada dasar yang lebih mudah dimainkan di piano.
 * Menilai kandidat key dari perubahan transpose -6..+6 terhadap kondisi saat ini.
 */
export const recommendPianoFriendlyKey = ({ chords = [], key = '', transpose = 0 } = {}) => {
  if (!Array.isArray(chords) || chords.length === 0) {
    return null;
  }

  const keyMatch = typeof key === 'string' ? key.trim().match(/^([A-G][#b]?)(.*)$/) : null;
  const keyRoot = keyMatch ? keyMatch[1] : null;
  const keySuffix = keyMatch ? keyMatch[2] : '';

  const candidates = [];
  for (let relativeShift = -6; relativeShift <= 6; relativeShift += 1) {
    const totalShift = transpose + relativeShift;
    const transposedKeyRoot = keyRoot ? transposeChord(keyRoot, totalShift) : null;
    const transposedKey = transposedKeyRoot ? `${transposedKeyRoot}${keySuffix}` : null;

    const breakdown = getPianoPlayabilityBreakdown(chords, totalShift);
    const chordPenalty = breakdown.chordPenalty;
    const keyPenalty = transposedKeyRoot
      ? (KEY_SIGNATURE_ACCIDENTALS[transposedKeyRoot] || 0) * 0.75
      : 0;

    candidates.push({
      relativeShift,
      totalShift,
      key: transposedKey,
      chordPenalty,
      keyPenalty,
      accidentalChordCount: breakdown.accidentalChordCount,
      totalChords: breakdown.totalChords,
      score: chordPenalty + keyPenalty,
    });
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return Math.abs(a.relativeShift) - Math.abs(b.relativeShift);
  });

  const best = candidates[0];
  const current = candidates.find((candidate) => candidate.relativeShift === 0);
  const improvement = current ? Math.max(0, current.score - best.score) : 0;

  return {
    recommendedKey: best.key,
    transposeFromCurrent: best.relativeShift,
    score: best.score,
    improvement,
    accidentalChordCount: best.accidentalChordCount,
    totalChords: best.totalChords,
    keyAccidentalCount: best.key ? (KEY_SIGNATURE_ACCIDENTALS[extractChordRoot(best.key)] || 0) : 0,
  };
};
