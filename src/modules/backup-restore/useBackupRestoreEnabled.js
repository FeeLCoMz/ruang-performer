import { useEffect, useState } from 'react';
import {
  isBackupRestoreEnabled,
  setBackupRestoreEnabled,
  subscribeBackupRestoreEnabled,
} from './backupRestoreSettings.js';

/**
 * useBackupRestoreEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul Backup & Restore.
 *
 * Returns: [enabled, setEnabled]
 */
export const useBackupRestoreEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isBackupRestoreEnabled());

  useEffect(() => subscribeBackupRestoreEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setBackupRestoreEnabled(value);

  return [enabled, setEnabled];
};

export default useBackupRestoreEnabled;
