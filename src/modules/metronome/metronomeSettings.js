/**
 * metronomeSettings.js
 *
 * Pengaturan on/off untuk modul Metronome & Tap Tempo.
 *
 * Default aktif: modul ini tidak butuh API eksternal dan tidak memicu izin
 * perangkat saat halaman dibuka (AudioContext baru dibuat setelah diklik).
 *
 * API:
 *   - isMetronomeEnabled(): boolean
 *   - setMetronomeEnabled(enabled): void
 *   - subscribeMetronomeEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:metronome-enabled';
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

export const isMetronomeEnabled = () => readStoredValue();

export const setMetronomeEnabled = (enabled) => {
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

export const subscribeMetronomeEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isMetronomeEnabled());
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

export const subscribe = subscribeMetronomeEnabled;

export const DEFAULT_METRONOME_ENABLED = DEFAULT_ENABLED;
