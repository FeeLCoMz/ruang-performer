/**
 * midiCueSettings.js
 *
 * Pengaturan on/off untuk modul MIDI Cue.
 *
 * MIDI Cue = parsing & tampilan cue patch dari teks lirik, mis.
 *   [Keys: Stage Piano | PC: 0 | CH: 1]
 * menjadi data MIDI terstruktur (program, channel, bank MSB/LSB).
 *
 * Modul ini SENGAJA terpisah dari modul `midi` (input keyboard fisik):
 * pemusik tanpa controller tetap dapat memakai cue sebagai pengingat sound.
 *
 * Pola sama dengan modul lain: status di localStorage + subscribe antar tab.
 *
 * API:
 *   - isMidiCueEnabled(): boolean
 *   - setMidiCueEnabled(enabled): void
 *   - subscribeMidiCueEnabled(listener): fungsi unsubscribe
 */

const STORAGE_KEY = 'ruang-performer:module:midi-cue-enabled';
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

export const isMidiCueEnabled = () => readStoredValue();

export const setMidiCueEnabled = (enabled) => {
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

export const subscribeMidiCueEnabled = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(isMidiCueEnabled());
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

export const subscribe = subscribeMidiCueEnabled;

export const DEFAULT_MIDI_CUE_ENABLED = DEFAULT_ENABLED;
