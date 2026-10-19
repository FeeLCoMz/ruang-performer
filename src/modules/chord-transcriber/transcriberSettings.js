/**
 * transcriberSettings.js
 *
 * Pengaturan on/off untuk modul AI Chord & Sheet Music Transcriber
 * (plugin-style, sama seperti midiSettings).
 *
 * - Persisten di localStorage, sehingga pilihan pengguna bertahan antar sesi.
 * - Halaman modul membaca status lewat fungsi di sini — bukan langsung dari
 *   localStorage — supaya toggle di ModulesPage langsung berlaku.
 *
 * API:
 *   - isTranscriberEnabled(): boolean
 *   - setTranscriberEnabled(enabled): void
 *   - subscribeTranscriberEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:chord-transcriber-enabled';
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

export const isTranscriberEnabled = () => readStoredValue();

export const setTranscriberEnabled = (enabled) => {
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

export const subscribeTranscriberEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isTranscriberEnabled());
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

export const subscribe = subscribeTranscriberEnabled;

export const DEFAULT_TRANSCRIBER_ENABLED = DEFAULT_ENABLED;
