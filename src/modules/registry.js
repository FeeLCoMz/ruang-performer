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
import {
  isBulkLyricsEnabled,
  setBulkLyricsEnabled,
  subscribeBulkLyricsEnabled,
  DEFAULT_BULK_LYRICS_ENABLED,
} from './bulk-lyrics/bulkLyricsSettings.js';
import {
  isBackupRestoreEnabled,
  setBackupRestoreEnabled,
  subscribeBackupRestoreEnabled,
  DEFAULT_BACKUP_RESTORE_ENABLED,
} from './backup-restore/backupRestoreSettings.js';
import {
  isAuditLogEnabled,
  setAuditLogEnabled,
  subscribeAuditLogEnabled,
  DEFAULT_AUDIT_LOG_ENABLED,
} from './audit-log/auditLogSettings.js';
import {
  isMidiCueEnabled,
  setMidiCueEnabled,
  subscribeMidiCueEnabled,
  DEFAULT_MIDI_CUE_ENABLED,
} from './midi-cue/midiCueSettings.js';
import {
  isStageModeEnabled,
  setStageModeEnabled,
  subscribeStageModeEnabled,
  DEFAULT_STAGE_MODE_ENABLED,
} from './stage-mode/stageModeSettings.js';

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
  {
    id: 'bulk-lyrics',
    name: 'Bulk Add Lirik & Chord',
    description:
      'Tempel banyak lagu sekaligus (atau impor file .txt/.md), validasi per lagu, lalu simpan semuanya dalam satu proses — lengkap dengan judul, artis, key, tempo, dan chord.',
    icon: '📚',
    path: '/bulk-lyrics',
    defaultEnabled: DEFAULT_BULK_LYRICS_ENABLED,
    storageKey: 'ruang-performer:module:bulk-lyrics-enabled',
    isEnabled: isBulkLyricsEnabled,
    setEnabled: setBulkLyricsEnabled,
    subscribe: subscribeBulkLyricsEnabled,
  },
  {
    id: 'backup-restore',
    name: 'Backup & Restore Database',
    description:
      'Backup seluruh database ke file SQL (dump) dan pulihkan kembali dari file backup — khusus Owner aplikasi.',
    icon: '💾',
    path: '/backup-restore',
    defaultEnabled: DEFAULT_BACKUP_RESTORE_ENABLED,
    storageKey: 'ruang-performer:module:backup-restore-enabled',
    isEnabled: isBackupRestoreEnabled,
    setEnabled: setBackupRestoreEnabled,
    subscribe: subscribeBackupRestoreEnabled,
  },
  {
    id: 'audit-log',
    name: 'Audit Log',
    description:
      'Riwayat aktivitas pengguna (login, perubahan data, aksi kritis) dengan filter kategori & severity serta deteksi aktivitas mencurigakan — khusus Owner.',
    icon: '🔍',
    path: '/audit-logs',
    defaultEnabled: DEFAULT_AUDIT_LOG_ENABLED,
    storageKey: 'ruang-performer:module:audit-log-enabled',
    isEnabled: isAuditLogEnabled,
    setEnabled: setAuditLogEnabled,
    subscribe: subscribeAuditLogEnabled,
  },
  {
    id: 'midi-cue',
    name: 'MIDI Cue & Patch Sound',
    description:
      'Mengubah baris cue di lirik (mis. [Keys: Stage Piano | PC: 0 | CH: 1]) menjadi data MIDI terstruktur: program, channel, dan bank MSB/LSB — tanpa perlu keyboard MIDI fisik. Menonaktifkannya membuat baris cue tampil sebagai teks biasa.',
    icon: '🎼',
    defaultEnabled: DEFAULT_MIDI_CUE_ENABLED,
    storageKey: 'ruang-performer:module:midi-cue-enabled',
    isEnabled: isMidiCueEnabled,
    setEnabled: setMidiCueEnabled,
    subscribe: subscribeMidiCueEnabled,
  },
  {
    id: 'stage-mode',
    name: 'Stage Mode',
    description:
      'Tampilan panggung fullscreen dengan kontras tinggi: lirik besar, autoscroll, transpose, dan panel media — dirancang untuk dibaca dari atas panggung.',
    icon: '🎤',
    defaultEnabled: DEFAULT_STAGE_MODE_ENABLED,
    storageKey: 'ruang-performer:module:stage-mode-enabled',
    isEnabled: isStageModeEnabled,
    setEnabled: setStageModeEnabled,
    subscribe: subscribeStageModeEnabled,
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
