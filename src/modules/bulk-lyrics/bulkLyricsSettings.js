/**
 * bulkLyricsSettings.js
 *
 * Pengaturan on/off untuk modul Bulk Add Lirik & Chord.
 *
 * Pola sama dengan modul lain (lihat chord-transcriber/transcriberSettings.js):
 * status disimpan di localStorage, dan halaman Modul membaca lewat fungsi di
 * sini supaya toggle langsung berlaku tanpa reload.
 *
 * API:
 *   - isBulkLyricsEnabled(): boolean
 *   - setBulkLyricsEnabled(enabled): void
 *   - subscribeBulkLyricsEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:bulk-lyrics-enabled';
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

export const isBulkLyricsEnabled = () => readStoredValue();

export const setBulkLyricsEnabled = (enabled) => {
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

export const subscribeBulkLyricsEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isBulkLyricsEnabled());
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

export const subscribe = subscribeBulkLyricsEnabled;

export const DEFAULT_BULK_LYRICS_ENABLED = DEFAULT_ENABLED;
