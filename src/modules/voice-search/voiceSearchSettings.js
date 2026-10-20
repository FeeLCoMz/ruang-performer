/**
 * voiceSearchSettings.js
 *
 * Pengaturan on/off untuk modul Voice Search.
 *
 * Default NONAKTIF: Web Speech API hanya tersedia di sebagian browser
 * (Chrome/Edge, umumnya butuh koneksi ke layanan vendor) dan meminta izin
 * mikrofon. Fitur ini opt-in agar user tanpa dukungan tidak melihat tombol
 * yang selalu gagal.
 *
 * API:
 *   - isVoiceSearchEnabled(): boolean
 *   - setVoiceSearchEnabled(enabled): void
 *   - subscribeVoiceSearchEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:voice-search-enabled';
const DEFAULT_ENABLED = false;

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

export const isVoiceSearchEnabled = () => readStoredValue();

export const setVoiceSearchEnabled = (enabled) => {
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

export const subscribeVoiceSearchEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isVoiceSearchEnabled());
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

export const subscribe = subscribeVoiceSearchEnabled;

export const DEFAULT_VOICE_SEARCH_ENABLED = DEFAULT_ENABLED;
