/**
 * exportShareSettings.js
 *
 * Pengaturan on/off untuk modul Export & Share.
 *
 * Modul ini mengumpulkan fitur berbagi/ekspor: teks setlist, jadwal gigs,
 * kalender (.ics), poster (JPG/PDF), serta unduhan lirik/chord.
 *
 * Default aktif — fitur ini hanya aktif saat user menekan tombol.
 *
 * API:
 *   - isExportShareEnabled(): boolean
 *   - setExportShareEnabled(enabled): void
 *   - subscribeExportShareEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:export-share-enabled';
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

export const isExportShareEnabled = () => readStoredValue();

export const setExportShareEnabled = (enabled) => {
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

export const subscribeExportShareEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isExportShareEnabled());
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

export const subscribe = subscribeExportShareEnabled;

export const DEFAULT_EXPORT_SHARE_ENABLED = DEFAULT_ENABLED;
