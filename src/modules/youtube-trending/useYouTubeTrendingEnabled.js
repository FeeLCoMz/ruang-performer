import { useEffect, useState } from 'react';
import {
  isYouTubeTrendingEnabled,
  setYouTubeTrendingEnabled,
  subscribeYouTubeTrendingEnabled,
} from './youtubeTrendingSettings.js';

/**
 * useYouTubeTrendingEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul Trending YouTube.
 *
 * Returns: [enabled, setEnabled]
 */
export const useYouTubeTrendingEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isYouTubeTrendingEnabled());

  useEffect(() => subscribeYouTubeTrendingEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setYouTubeTrendingEnabled(value);

  return [enabled, setEnabled];
};

export default useYouTubeTrendingEnabled;
