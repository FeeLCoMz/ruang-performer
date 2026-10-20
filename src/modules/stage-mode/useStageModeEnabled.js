import { useEffect, useState } from 'react';
import {
  isStageModeEnabled,
  setStageModeEnabled,
  subscribeStageModeEnabled,
} from './stageModeSettings.js';

/**
 * useStageModeEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul Stage Mode.
 *
 * Returns: [enabled, setEnabled]
 */
export const useStageModeEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isStageModeEnabled());

  useEffect(() => subscribeStageModeEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setStageModeEnabled(value);

  return [enabled, setEnabled];
};

export default useStageModeEnabled;
