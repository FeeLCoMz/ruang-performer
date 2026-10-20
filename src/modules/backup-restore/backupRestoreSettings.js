/**
 * backupRestoreSettings.js
 *
 * Pengaturan on/off untuk modul Backup & Restore Database.
 *
 * Pola sama dengan modul lain (lihat bulk-lyrics/bulkLyricsSettings.js):
 * status disimpan di localStorage, dan halaman Modul membaca lewat fungsi di
 * sini supaya toggle langsung berlaku tanpa reload.
 *
 * API:
 *   - isBackupRestoreEnabled(): boolean
 *   - setBackupRestoreEnabled(enabled): void
 *   - subscribeBackupRestoreEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:backup-restore-enabled';
const DEFAULT_ENABLED = true;

const listeners = new Set();

const readStoredValue = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_ENABLED;
    return raw === 'true';
  } catch {
    return DEFAULT_ENABLED;
  }
};

export const isBackupRestoreEnabled = () => readStoredValue();

export const setBackupRestoreEnabled = (enabled) => {
  const next = !!enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
  } catch {
    // localStorage bisa gagal (private mode); tetap berlaku untuk sesi ini.
  }
  listeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // jangan biarkan satu listener error menghentikan yang lain
    }
  });
};

export const subscribeBackupRestoreEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isBackupRestoreEnabled());
  listeners.add(handler);
  // Sinkron antar tab.
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) handler();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(handler);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
};

export const subscribe = subscribeBackupRestoreEnabled;

export const DEFAULT_BACKUP_RESTORE_ENABLED = DEFAULT_ENABLED;
