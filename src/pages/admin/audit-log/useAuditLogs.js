/**
 * useAuditLogs.js
 *
 * State + filter audit log, dipakai bersama oleh panel di halaman
 * Administrator (/admin) dan halaman audit log lengkap (/audit-logs).
 * Memuat entri dari endpoint /api/audit-logs saat `enabled` bernilai true.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuditLogs } from '../../../apiClient.js';
import { filterAuditLogs, generateAuditReport } from '../../../utils/auditLogger.js';

export const AUDIT_FILTER_DEFAULTS = { category: '', severity: '', status: '' };

export function useAuditLogs({ limit = 50, enabled = true } = {}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  // Salin objek default: kalau state memakai referensi konstanta yang sama,
  // resetFilters() mengirim objek identik dan React mengabaikan update-nya.
  const [filters, setFilters] = useState({ ...AUDIT_FILTER_DEFAULTS });

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const data = await getAuditLogs({ limit });
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      if (data?.warning) setWarning(data.warning);
    } catch (err) {
      setError(err.message || 'Gagal memuat audit log');
    }
    setLoading(false);
  }, [enabled, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters({ ...AUDIT_FILTER_DEFAULTS }), []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filteredLogs = useMemo(() => filterAuditLogs(logs, filters), [logs, filters]);
  const report = useMemo(() => generateAuditReport(filteredLogs), [filteredLogs]);

  return {
    logs,
    filteredLogs,
    report,
    loading,
    error,
    warning,
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    reload: load,
  };
}

export default useAuditLogs;
