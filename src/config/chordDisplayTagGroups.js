/**
 * chordDisplayTagGroups.js — KELOMPOK TAG YANG DIDETEKSI CHORDDISPLAY
 * ================================================================
 * Daftar kata kunci yang boleh DIATUR ADMIN lewat halaman Administrator
 * (tab "Tag & Deteksi"). Berbeda dengan chordDisplayConfig.js yang memegang
 * nilai default kode, setiap grup di sini menyebut:
 *
 *   - storageKey : key localStorage tempat versi yang diedit admin disimpan
 *   - fallback   : bawaan (nilai dari chordDisplayConfig.js)
 *   - normalize  : cara menyimpan satu keyword (huruf kecil, buang duplikat)
 *   - maxLength  : panjang maksimum satu keyword (mencegah regex tak wajar)
 *
 * Urutan grup = urutan tampil di panel admin. Menambah grup baru cukup dengan
 * menambah satu entri di sini; panel admin, preview, dan fungsi reset tidak
 * perlu diubah.
 */
import * as chordConfig from './chordDisplayConfig.js';

/**
 * Nama default diambil SAAT DIPANGGIL, bukan saat impor.
 *
 * chordDisplayConfig.js mengimpor chordDisplayTags.js (alias & tone seksi),
 * dan chordDisplayTags.js mengimpor file ini — siklus ESM. Binding `import { X }`
 * pada modul yang pertama dievaluasi bisa masih kosong, sedangkan properti
 * namespace import baru dibaca ketika fungsi di bawah dipanggil.
 */
const configValue = (name, fallbackValue) => (
  chordConfig[name] === undefined ? fallbackValue : chordConfig[name]
);

// Fallback statis untuk kasus ekstrem (mis. modul diuji terpisah): daftar kunci
// MIDI tidak berubah dari config, jadi salinannya aman di sini.
const FALLBACK_MIDI_ROUTING = [
  'patch', 'preset', 'sound', 'tone', 'program', 'instrument', 'instrumen',
  'layer', 'split', 'zone', 'scene',
  'pc', 'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
];
const FALLBACK_MIDI_ALSO_INSTRUMENT = ['keys'];

/** Daftar kunci MIDI (routing) untuk grup kunci MIDI. */
export const getMidiRoutingKeywords = () => [
  ...configValue('MIDI_ROUTING_KEYS', FALLBACK_MIDI_ROUTING),
  ...configValue('MIDI_KEYS_ALSO_INSTRUMENT', FALLBACK_MIDI_ALSO_INSTRUMENT),
];

/** Huruf kecil dan rapikan spasi ("Pre  Chorus" -> "pre chorus"). */
export const normalizeKeyword = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

/** Kata kunci boleh berhuruf/angka, spasi, underscore, tanda hubung, titik, dan garis miring. */
const KEYWORD_PATTERN = /^[a-z0-9][a-z0-9 ._'-/]*$/;
const MAX_KEYWORD_LENGTH = 40;

/**
 * Validasi satu keyword yang diketik admin.
 * @returns {{ok: true, value: string} | {ok: false, reason: string}}
 */
export const validateKeyword = (raw = '') => {
  const value = normalizeKeyword(raw);
  if (!value) return { ok: false, reason: 'Kosong' };
  if (value.length > MAX_KEYWORD_LENGTH) {
    return { ok: false, reason: `Lebih dari ${MAX_KEYWORD_LENGTH} karakter` };
  }
  const lower = value.toLowerCase();
  if (!KEYWORD_PATTERN.test(lower)) {
    return { ok: false, reason: 'Hanya huruf, angka, spasi, titik, garis miring, atau tanda hubung' };
  }
  return { ok: true, value: lower };
};

/**
 * Pecah teks editor (satu keyword per baris, koma, atau titik koma) menjadi
 * daftar keyword. Baris berawalan '#' dibaca sebagai komentar.
 * @returns {{value: string, reason: string}[]}
 */
export const parseKeywordList = (text = '') => {
  const tokens = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .flatMap((line) => line.split(/[,;]/))
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.map((token) => {
    const result = validateKeyword(token);
    return result.ok
      ? { value: result.value, reason: '' }
      : { value: token, reason: result.reason };
  });
};

/**
 * Ubah daftar keyword menjadi teks editor satu kata per baris.
 */
export const formatKeywordList = (keywords = []) => keywords.join('\n');

/**
 * Satu grup tag. `fallback` DIBACA SAAT INI — bangun daftar grup pada saat
 * pertama kali dipakai, bukan saat modul dimuat (lihat tagGroups().apply).
 */
const identityGroup = (id, label, icon, description, storageKey, fallback, extra = {}) => ({
  id,
  label,
  icon,
  description,
  storageKey,
  fallback,
  normalize: (keyword) => keyword,
  ...extra,
});

let groupsCache = null;

/**
 * Daftar grup tag, dibangun saat pertama dipakai (bukan saat modul dimuat)
 * supaya fallback diambil dari chordDisplayConfig yang sudah terinisialisasi
 * meskipun file ini dievaluasi lebih dulu dalam siklus impor.
 */
export const getTagGroups = () => {
  if (groupsCache) return groupsCache;

  groupsCache = [
  {
    ...identityGroup(
      'sections',
      'Struktur Lagu (Section)',
      '🎬',
      'Label seksi lagu yang dikenali ChordDisplay dan editor lirik. Alias (mis. "Bait" → "Verse") tidak ditawarkan di autocomplete dan tidak dihitung sebagai seksi terpisah.',
      'ruang-performer:chorddisplay:sections',
      configValue('STRUCTURE_SECTION_KEYWORDS', []),
    ),
    // Alias tampil sebagai keterangan "alias → bentuk baku" dan tidak
    // ditawarkan autocomplete, sama seperti perilaku parser.
    aliases: configValue('SECTION_NAME_ALIASES', {}),
  },
  identityGroup(
    'modulation',
    'Modulasi / Ganti Key',
    '🎚️',
    'Kata kunci baris pengganti key di tengah lagu ("Modulation: G"). Chord setelahnya ikut ditranspose.',
    'ruang-performer:chorddisplay:modulation',
    configValue('MODULATION_KEYWORDS', []),
  ),
  identityGroup(
    'metadata',
    'Metadata Informasi',
    '🏷️',
    'Key metadata yang ditampilkan sebagai chip informasi (tidak mempengaruhi transpose), mis. "Original Key:", "Time Signature:", "Feel:".',
    'ruang-performer:chorddisplay:metadata',
    configValue('METADATA_KEYS', []),
  ),
  identityGroup(
    'performance',
    'Petunjuk Permainan',
    '🥁',
    'Catatan cara memainkan: intensitas, groove, feel, style, texture, voicing.',
    'ruang-performer:chorddisplay:performance',
    configValue('PERFORMANCE_HINT_KEYS', []),
  ),
  identityGroup(
    'cueMarks',
    'Cue Mark Inline',
    '🔔',
    'Aksi permainan di baris chord/lirik, ditulis dalam braket siku: [Stop], [Hit], [Tutti].',
    'ruang-performer:chorddisplay:cue-marks',
    configValue('CUE_MARK_KEYWORDS', []),
  ),
  identityGroup(
    'instruments',
    'Instrumen',
    '🎸',
    'Nama instrumen yang dikenali sebagai label: [Gitar], [Suling], [Gitar: Dist].',
    'ruang-performer:chorddisplay:instruments',
    configValue('INSTRUMENT_KEYWORDS', []),
  ),
  identityGroup(
    'noChord',
    'Tanda "Tanpa Chord"',
    '🚫',
    'Token yang dibaca sebagai No Chord, mis. N.C., NC, No Chord.',
    'ruang-performer:chorddisplay:no-chord',
    configValue('NO_CHORD_TOKENS', []),
  ),
  identityGroup(
    'midiKeys',
    'Kunci MIDI (milik modul MIDI)',
    '🎹',
    'Baris "[Keys: ... | PC: 1]" dibaca modul MIDI, bukan ChordDisplay. Kunci di sini membuat baris ber-key tersebut tidak dianggap instrumen/metadata ChordDisplay.',
    'ruang-performer:chorddisplay:midi-keys',
    getMidiRoutingKeywords(),
  ),
  ];

  // Fallback kosong berarti config belum siap (siklus impor) — jangan simpan.
  if (groupsCache.some((group) => !group.fallback.length)) {
    const partial = groupsCache;
    groupsCache = null;
    return partial;
  }
  return groupsCache;
};

/**
 * Nama lama, dipertahankan untuk impor yang sudah ada. Dibaca malas: setiap
 * akses memanggil getTagGroups() sehingga aman saat modul sudah selesai dimuat.
 */
export const CHORD_DISPLAY_TAG_GROUPS = {
  get length() { return getTagGroups().length; },
  map: (fn) => getTagGroups().map(fn),
  forEach: (fn) => getTagGroups().forEach(fn),
  filter: (fn) => getTagGroups().filter(fn),
  find: (fn) => getTagGroups().find(fn),
  some: (fn) => getTagGroups().some(fn),
  [Symbol.iterator]: () => getTagGroups()[Symbol.iterator](),
};

export const getTagGroup = (id) => getTagGroups().find((group) => group.id === id) || null;

export default CHORD_DISPLAY_TAG_GROUPS;
