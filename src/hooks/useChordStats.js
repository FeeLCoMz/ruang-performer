import { useEffect, useState } from 'react';
// Pastikan path import sesuai struktur project
import { parseChordPro, getAllChords, getChordUsageCounts, estimateKeyFromChordUsage } from '../utils/chordUtils.js';

/**
 * Custom hook untuk analisis chord dari lirik lagu
 * @param {string} lyrics - Lirik lagu
 * @returns {{ chords: string[], count: number, usageCounts: Array<{chord: string, count: number}>, detectedKey: {key: string, mode: string, confidence: number, alternatives: string[]} | null }}
 */
export default function useChordStats(lyrics) {
  const [chordStats, setChordStats] = useState({ chords: [], count: 0, usageCounts: [], detectedKey: null });

  useEffect(() => {
    if (!lyrics) {
      setChordStats({ chords: [], count: 0, usageCounts: [], detectedKey: null });
      return;
    }
    try {
      const parsed = parseChordPro(lyrics);
      const chords = getAllChords(parsed);
      const usageCounts = getChordUsageCounts(parsed);
      const detectedKey = estimateKeyFromChordUsage(usageCounts);
      const totalChordCount = usageCounts.reduce((total, item) => total + item.count, 0);
      setChordStats({
        chords,
        count: totalChordCount,
        usageCounts,
        detectedKey,
      });
    } catch (err) {
      setChordStats({ chords: [], count: 0, usageCounts: [], detectedKey: null });
    }
  }, [lyrics]);

  return chordStats;
}
