/**
 * aiAutofillSettings.js
 *
 * Pengaturan on/off untuk modul AI Autofill.
 *
 * Berbeda dengan modul lain, default-nya **nonaktif**: setiap pemakaian
 * memanggil Gemini (berbiaya kuota), sehingga opt-in lebih aman. Tanpa
 * aktivasi, tombol "🤖 AI Autofill" tidak tampil dan endpoint tidak dipanggil.
 *
 * API:
 *   - isAIAutofillEnabled(): boolean
 *   - setAIAutofillEnabled(enabled): void
 *   - subscribeAIAutofillEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:ai-autofill-enabled';
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

export const isAIAutofillEnabled = () => readStoredValue();

export const setAIAutofillEnabled = (enabled) => {
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

export const subscribeAIAutofillEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isAIAutofillEnabled());
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

export const subscribe = subscribeAIAutofillEnabled;

export const DEFAULT_AI_AUTOFILL_ENABLED = DEFAULT_ENABLED;
