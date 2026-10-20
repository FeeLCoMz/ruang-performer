/**
 * useSqlRestore.js
 *
 * State + handler untuk restore database dari file .sql.
 * Dipindah dari ToolsPage agar modul Backup & Restore mandiri.
 */
import { useRef, useState } from 'react';
import { getAuthHeader } from '../../utils/auth.js';

export function useSqlRestore() {
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreSuccess, setRestoreSuccess] = useState(null);
  const sqlInputRef = useRef();

  const handleRestore = async (e) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    setRestoring(true);
    const file = e.target.files[0];
    if (!file) { setRestoring(false); return; }
    try {
      const sql = await file.text();
      if (!sql || !sql.trim()) {
        setRestoreError('Restore gagal: File SQL kosong atau tidak terbaca.');
        setRestoring(false);
        sqlInputRef.current.value = '';
        return;
      }
      const res = await fetch('/api/tools/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ sql }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Restore gagal');
      setRestoreSuccess('Restore database berhasil!');
    } catch (err) {
      setRestoreError('Restore gagal: ' + (err.message || err));
    }
    setRestoring(false);
    sqlInputRef.current.value = '';
  };

  return { restoring, restoreError, restoreSuccess, sqlInputRef, handleRestore };
}

export default useSqlRestore;
