/**
 * useAIUsage.js
 *
 * Hook kuota AI Autofill bulan ini.
 *
 * - Memuat kuota saat `enabled` true (modul aktif) dan memuat ulang setiap kali
 *   nilainya berubah (mis. setelah satu pemakaian dipakai untuk mengisi form).
 * - Semua kegagalan ditelan: kuota adalah informasi tambahan, bukan penghalang.
 *
 * Returns: { usage: { used, limit, remaining, period } | null, loading, refresh }
 */
import { useCallback, useEffect, useState } from 'react';
import { getAIUsage } from '../../apiClient.js';

export const useAIUsage = (enabled = true) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    setLoading(true);
    try {
      const data = await getAIUsage();
      setUsage(data || null);
      return data;
    } catch {
      setUsage(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { usage, loading, refresh };
};

export default useAIUsage;
