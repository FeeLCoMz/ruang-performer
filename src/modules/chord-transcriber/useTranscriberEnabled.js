import { useEffect, useState } from 'react';
import { isTranscriberEnabled, setTranscriberEnabled, subscribeTranscriberEnabled } from './transcriberSettings.js';

/**
 * useTranscriberEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul
 * AI Chord & Sheet Music Transcriber.
 *
 * Returns: [enabled, setEnabled]
 */
export const useTranscriberEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isTranscriberEnabled());

  useEffect(() => subscribeTranscriberEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setTranscriberEnabled(value);

  return [enabled, setEnabled];
};

export default useTranscriberEnabled;
