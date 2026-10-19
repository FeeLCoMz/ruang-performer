/**
 * registry.js
 *
 * Pusat pendaftaran (registry) modul aplikasi.
 *
 * Setiap modul di `src/modules/<nama>/` mendaftar di sini dengan metadata:
 *   - id           : string unik (harus sama dengan nama folder modul)
 *   - name         : nama tampilan untuk UI
 *   - description  : penjelasan singkat fungsi modul
 *   - icon         : emoji untuk daftar/halaman modul
 *   - defaultEnabled: status on/off saat pertama kali (belum pernah diubah user)
 *   - storageKey   : key localStorage tempat status on/off disimpan
 *   - isEnabled()  : fungsi baca status on/off modul
 *   - setEnabled(v): fungsi ubah status on/off modul
 *
 * Halaman ModulesPage membaca registry ini secara otomatis — menambah modul
 * baru cukup dengan membuat foldernya dan mendaftarkan satu entri di sini.
 */

import {
  isMidiEnabled,
  setMidiEnabled,
  DEFAULT_MIDI_ENABLED,
} from './midi/midiSettings.js';

export const MODULES_REGISTRY = [
  {
    id: 'midi',
    name: 'MIDI',
    description:
      'Input keyboard MIDI fisik via Web MIDI API: VirtualPiano menerima note on/off dari perangkat MIDI (USB/MIDI controller).',
    icon: '🎹',
    defaultEnabled: DEFAULT_MIDI_ENABLED,
    storageKey: 'ruang-performer:midiEnabled',
    isEnabled: isMidiEnabled,
    setEnabled: setMidiEnabled,
  },
];

export const getModuleById = (id) => MODULES_REGISTRY.find((mod) => mod.id === id) || null;

/**
 * Ambil daftar modul beserta status aktifnya saat ini.
 * @returns {Array<{...moduleMeta, enabled: boolean}>}
 */
export const getModulesWithStatus = () => MODULES_REGISTRY.map((mod) => ({
  ...mod,
  enabled: typeof mod.isEnabled === 'function' ? mod.isEnabled() : mod.defaultEnabled,
}));
