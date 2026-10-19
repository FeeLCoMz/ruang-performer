/**
 * midiSettings.js
 *
 * Pengaturan on/off untuk seluruh modul MIDI (plugin-style).
 *
 * - Persisten di localStorage, sehingga pilihan pengguna bertahan antar sesi.
 * - Semua konsumen modul MIDI (VirtualPiano, hook, test) harus membaca lewat
 *   fungsi di sini — bukan langsung membaca navigator/Web MIDI — supaya
 *   enable/disable berlaku konsisten di seluruh aplikasi.
 *
 * API:
 *   - isMidiEnabled(): boolean
 *   - setMidiEnabled(enabled): void
 *   - subscribeMidiEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:midiEnabled';
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

export const isMidiEnabled = () => {
  try {
    return readStoredValue();
  } catch {
    return DEFAULT_ENABLED;
  }
};

export const setMidiEnabled = (enabled) => {
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

export const subscribeMidiEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const subscribe = subscribeMidiEnabled;

export const DEFAULT_MIDI_ENABLED = DEFAULT_ENABLED;
