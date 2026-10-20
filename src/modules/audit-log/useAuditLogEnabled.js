import { useEffect, useState } from 'react';
import {
  isAuditLogEnabled,
  setAuditLogEnabled,
  subscribeAuditLogEnabled,
} from './auditLogSettings.js';

/**
 * useAuditLogEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul Audit Log.
 *
 * Returns: [enabled, setEnabled]
 */
export const useAuditLogEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isAuditLogEnabled());

  useEffect(() => subscribeAuditLogEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setAuditLogEnabled(value);

  return [enabled, setEnabled];
};

export default useAuditLogEnabled;
