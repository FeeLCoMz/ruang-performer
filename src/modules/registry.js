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
import {
  isTranscriberEnabled,
  setTranscriberEnabled,
  subscribeTranscriberEnabled,
  DEFAULT_TRANSCRIBER_ENABLED,
} from './chord-transcriber/transcriberSettings.js';
import {
  isYouTubeTrendingEnabled,
  setYouTubeTrendingEnabled,
  subscribeYouTubeTrendingEnabled,
  DEFAULT_YOUTUBE_TRENDING_ENABLED,
} from './youtube-trending/youtubeTrendingSettings.js';

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
  {
    id: 'chord-transcriber',
    name: 'AI Chord & Sheet Music Transcriber',
    description:
      'Rekam suara latihan atau unggah file audio/MIDI, lalu AI mengubahnya menjadi draf lirik + chord dan Not Angka yang siap dipakai sebagai repertoire baru.',
    icon: '🤖',
    path: '/chord-transcriber',
    defaultEnabled: DEFAULT_TRANSCRIBER_ENABLED,
    storageKey: 'ruang-performer:module:chord-transcriber-enabled',
    isEnabled: isTranscriberEnabled,
    setEnabled: setTranscriberEnabled,
    subscribe: subscribeTranscriberEnabled,
  },
  {
    id: 'youtube-trending',
    name: 'Trending YouTube',
    description:
      'Daftar lagu musik paling populer di YouTube (berdasarkan YouTube Data API), lengkap dengan info channel, jumlah tayangan, dan tombol bagikan ke media sosial.',
    icon: '📺',
    path: '/youtube-trending',
    defaultEnabled: DEFAULT_YOUTUBE_TRENDING_ENABLED,
    storageKey: 'ruang-performer:module:youtube-trending-enabled',
    isEnabled: isYouTubeTrendingEnabled,
    setEnabled: setYouTubeTrendingEnabled,
    subscribe: subscribeYouTubeTrendingEnabled,
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
