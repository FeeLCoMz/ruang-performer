/**
 * midiAccess.js
 *
 * Wrapper tipis di atas Web MIDI API (navigator.requestMIDIAccess).
 * Tidak punya dependency ke React / komponen apa pun — cukup callback,
 * sehingga bisa dipakai VirtualPiano, hook useMidi, maupun test.
 *
 * Ekspor:
 *   - isWebMidiSupported()
 *   - requestMidiAccess({ sysex })
 *   - connectMidi({ onMessage, onStateChange, sysex })
 *
 * Semua fungsi di sini MENGHORMATI toggle on/off modul MIDI dari
 * midiSettings.js: saat MIDI dinonaktifkan pengguna, requestMidiAccess
 * dan connectMidi langsung gagal (throw) tanpa menyentuh perangkat.
 */

import { isMidiEnabled } from './midiSettings.js';

/**
 * Cek dukungan Web MIDI API di browser saat ini.
 * @returns {boolean}
 */
export const isWebMidiSupported = () => (
  typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
);

/**
 * Minta akses MIDI mentah. Untuk pemakaian lanjutan; umumnya cukup connectMidi().
 * @param {object} [options]
 * @param {boolean} [options.sysex=false] - Minta akses System Exclusive.
 * @returns {Promise<MIDIAccess>}
 */
export const requestMidiAccess = async ({ sysex = false } = {}) => {
  if (!isMidiEnabled()) {
    throw new Error('Modul MIDI dinonaktifkan pengguna');
  }
  if (!isWebMidiSupported()) {
    throw new Error('Web MIDI API tidak didukung browser ini');
  }
  return navigator.requestMIDIAccess({ sysex });
};

/**
 * Hubungkan ke semua input MIDI dan pasang callback pesan.
 *
 * @param {object} [options]
 * @param {(event: MIDIMessageEvent) => void} [options.onMessage]
 *        Dipanggil untuk setiap pesan MIDI dari semua input.
 * @param {() => void} [options.onStateChange]
 *        Dipanggil saat daftar perangkat berubah (device hot-plug).
 * @param {boolean} [options.sysex=false]
 * @returns {Promise<{ dispose: () => void }>}
 *          dispose() melepas semua listener. Aman dipanggil berulang.
 */
export const connectMidi = async ({ onMessage, onStateChange, sysex = false } = {}) => {
  const access = await requestMidiAccess({ sysex });

  const attachInputs = () => {
    Array.from(access.inputs.values()).forEach((input) => {
      input.onmidimessage = (event) => {
        if (typeof onMessage === 'function') onMessage(event);
      };
    });
  };

  const handleStateChange = () => {
    attachInputs();
    if (typeof onStateChange === 'function') onStateChange(access);
  };

  attachInputs();
  access.onstatechange = handleStateChange;

  return {
    access,
    dispose: () => {
      access.onstatechange = null;
      Array.from(access.inputs.values()).forEach((input) => {
        input.onmidimessage = null;
      });
    },
  };
};
