import { useEffect, useState } from 'react';
// Pastikan path import sesuai struktur project
import { parseChordPro, getAllChords, getChordUsageCounts, estimateKeyFromChordUsage, detectChordModulations } from '../utils/chordUtils.js';

/**
 * Custom hook untuk analisis chord dari lirik lagu
 * @param {string} lyrics - Lirik lagu
 * @returns {{ chords: string[], count: number, usageCounts: Array<{chord: string, count: number}>, detectedKey: {key: string, mode: string, confidence: number, alternatives: string[]} | null, modulation: {hasModulation: boolean, modulationCount: number, transitions: Array<{fromKey: string, toKey: string, startLine: number, endLine: number, confidence: number}>, timeline: Array<{key: string, startSourceLine: number, endSourceLine: number, lineCount: number, confidence: number}>} }}
 */
export default function useChordStats(lyrics) {
  const [chordStats, setChordStats] = useState({ chords: [], count: 0, usageCounts: [], detectedKey: null, modulation: { hasModulation: false, modulationCount: 0, transitions: [], timeline: [] } });

  useEffect(() => {
    if (!lyrics) {
      setChordStats({ chords: [], count: 0, usageCounts: [], detectedKey: null, modulation: { hasModulation: false, modulationCount: 0, transitions: [], timeline: [] } });
      return;
    }
    try {
      const parsed = parseChordPro(lyrics);
      const chords = getAllChords(parsed);
      const usageCounts = getChordUsageCounts(parsed);
      const detectedKey = estimateKeyFromChordUsage(usageCounts);
      const modulation = detectChordModulations(parsed);
      const totalChordCount = usageCounts.reduce((total, item) => total + item.count, 0);
      setChordStats({
        chords,
        count: totalChordCount,
        usageCounts,
        detectedKey,
        modulation,
      });
    } catch (err) {
      setChordStats({ chords: [], count: 0, usageCounts: [], detectedKey: null, modulation: { hasModulation: false, modulationCount: 0, transitions: [], timeline: [] } });
    }
  }, [lyrics]);

  return chordStats;
}
