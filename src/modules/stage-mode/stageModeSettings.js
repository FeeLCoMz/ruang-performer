/**
 * stageModeSettings.js
 *
 * Pengaturan on/off untuk modul Stage Mode.
 *
 * Stage Mode = tampilan panggung: halaman setlist fullscreen, kontras tinggi
 * (`body.stage-mode`), autoscroll, transpose, dan panel media yang bisa
 * disembunyikan. Dipisah menjadi modul supaya bisa dimatikan pada perangkat
 * yang tidak dipakai tampil (mis. HP latihan), sekaligus memisahkan CSS-nya.
 *
 * API:
 *   - isStageModeEnabled(): boolean
 *   - setStageModeEnabled(enabled): void
 *   - subscribeStageModeEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:stage-mode-enabled';
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

export const isStageModeEnabled = () => readStoredValue();

export const setStageModeEnabled = (enabled) => {
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

export const subscribeStageModeEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isStageModeEnabled());
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

export const subscribe = subscribeStageModeEnabled;

export const DEFAULT_STAGE_MODE_ENABLED = DEFAULT_ENABLED;
