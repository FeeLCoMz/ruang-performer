/**
 * youtubeTrendingSettings.js
 *
 * Pengaturan on/off untuk modul Trending YouTube
 * (plugin-style, sama seperti midiSettings & transcriberSettings).
 *
 * - Persisten di localStorage, sehingga pilihan pengguna bertahan antar sesi.
 * - Halaman modul membaca status lewat fungsi di sini — bukan langsung dari
 *   localStorage — supaya toggle di ModulesPage langsung berlaku.
 *
 * API:
 *   - isYouTubeTrendingEnabled(): boolean
 *   - setYouTubeTrendingEnabled(enabled): void
 *   - subscribeYouTubeTrendingEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:youtube-trending-enabled';
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

export const isYouTubeTrendingEnabled = () => readStoredValue();

export const setYouTubeTrendingEnabled = (enabled) => {
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

export const subscribeYouTubeTrendingEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isYouTubeTrendingEnabled());
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

export const subscribe = subscribeYouTubeTrendingEnabled;

export const DEFAULT_YOUTUBE_TRENDING_ENABLED = DEFAULT_ENABLED;
