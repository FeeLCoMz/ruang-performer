import { useEffect, useState } from 'react';
import {
  isBulkLyricsEnabled,
  setBulkLyricsEnabled,
  subscribeBulkLyricsEnabled,
} from './bulkLyricsSettings.js';

/**
 * useBulkLyricsEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul Bulk Add Lirik & Chord.
 *
 * Returns: [enabled, setEnabled]
 */
export const useBulkLyricsEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isBulkLyricsEnabled());

  useEffect(() => subscribeBulkLyricsEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setBulkLyricsEnabled(value);

  return [enabled, setEnabled];
};

export default useBulkLyricsEnabled;
