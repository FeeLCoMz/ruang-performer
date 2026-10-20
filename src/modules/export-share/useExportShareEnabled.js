import { useEffect, useState } from 'react';
import {
  isExportShareEnabled,
  setExportShareEnabled,
  subscribeExportShareEnabled,
} from './exportShareSettings.js';

/**
 * useExportShareEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul Export & Share.
 *
 * Nilainya juga bisa dipakai sebagai gate langsung:
 *   `const { enabled } = useExportShareEnabled();`
 *
 * Returns: [enabled, setEnabled]
 */
export const useExportShareEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isExportShareEnabled());

  useEffect(() => subscribeExportShareEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setExportShareEnabled(value);

  return [enabled, setEnabled];
};

export default useExportShareEnabled;
