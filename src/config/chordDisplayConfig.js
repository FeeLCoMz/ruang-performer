/**
 * chordDisplayConfig.js — KONFIGURASI MANUAL ChordDisplay
 * =========================================================
 * File ini DIBACA OLEH APLIKASI. Semua daftar di bawah dipakai langsung oleh:
 *   - src/utils/chordUtils.js        (parser chord/lirik)
 *   - src/utils/lyricsCompletion.js  (autocompletion editor)
 *
 * Edit daftar di sini — tidak perlu menyentuh file lain.
 * Urutan item mempengaruhi prioritas pencocokan (item lebih awal = dipilih dulu).
 * Semua pencocokan kata kunci tidak peka huruf besar/kecil.
 * =========================================================
 */

/* ------------------------------------------------------------------
 * 1. SECTION / STRUKTUR LAGU
 * ------------------------------------------------------------------
 * Kata kunci yang dikenali parseSection() sebagai struktur lagu.
 * Label harus mengandung kata ini sebagai kata utuh, contoh:
 *   "Verse 1", "Pre-Chorus", "Bridge - Koplo", "Interlude 2".
 */

/** Dipakai parser (parseSection) untuk mendeteksi [Section] / Section: */
export const STRUCTURE_SECTION_KEYWORDS = [
  'intro',
  'verse',
  'pre-chorus',
  'chorus',
  'post-chorus',
  'reff',
  'refrain',
  'bridge',
  'interlude',
  'solo',
  'outro',
  'coda',
  'musik',
  'instrumental',
];

/**
 * Label yang ditawarkan autocompletion — DITURUNKAN dari STRUCTURE_SECTION_KEYWORDS
 * di atas, sehingga autocomplete dan parser SELALU memakai kata kunci yang sama.
 * Huruf kapital di awal kata otomatis (contoh: 'pre-chorus' -> 'Pre-Chorus').
 */
const titleCaseKeyword = (keyword) => keyword
  .split(/([\s-]+)/)
  .map((part) => (/^[a-z]+$/.test(part) && part.length > 2 ? part[0].toUpperCase() + part.slice(1) : part.toUpperCase()))
  .join('');

export const AUTOCOMPLETE_SECTION_LABELS = STRUCTURE_SECTION_KEYWORDS.map(titleCaseKeyword);

/* ------------------------------------------------------------------
 * 2. MODULATION / KEY CHANGE
 * ------------------------------------------------------------------
 * Kata kunci pengganti key di tengah lagu. Chord setelah baris ini
 * ditranspose mengikuti label yang ditulis (contoh: Modulation: G).
 * Kata "modulation" dan "key change" selalu aktif; tambah di sini
 * jika ingin menerima sinonim lain (misal "modulasi").
 */
export const MODULATION_KEYWORDS = ['modulation', 'key change'];

/* ------------------------------------------------------------------
 * 3. METADATA / PATCH KEYBOARD
 * ------------------------------------------------------------------
 * Format baris:  Key: Value | Key2: Value2   (segment dipisah "|")
 */

/** Semua key metadata yang dikenali (isMetadataLine). */
export const METADATA_KEYS = [
  'patch', 'layer', 'intensitas', 'intensity', 'dynamics', 'dinamik',
  'cue', 'notes', 'catatan',
  'instrument', 'instrumen',
  'sound', 'tone', 'fx', 'effect', 'effects', 'voicing', 'texture',
  'split', 'zone', 'program', 'preset', 'scene', 'part', 'fill',
  'groove', 'feel',
  'pc', 'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
  'style',
];

/** Key yang WAJIB ada agar baris dianggap instrument_patch (punya MIDI).
 *  Baris "Layer: Warm Pad" saja TIDAK jadi patch tanpa key dari daftar ini. */
export const PATCH_DEFINING_KEYS = [
  'patch', 'preset', 'sound', 'tone', 'instrument', 'instrumen',
  'program', 'pc',
];

/** Key yang boleh muncul di baris instrument patch (parseInstrumentPatchLine). */
export const INSTRUMENT_PATCH_KEYS = [
  'patch', 'layer', 'split', 'zone', 'program', 'preset', 'scene',
  'sound', 'tone', 'instrument', 'instrumen',
  'pc', 'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
];

/** Label seksi yang membuat "[Label: Patch]" dianggap preset cue walau
 *  tanpa opsi MIDI (parsePresetCueLine). */
export const PRESET_CUE_SECTION_KEYWORDS = [
  'intro', 'verse', 'chorus', 'bridge', 'outro', 'interlude', 'coda',
  'reff', 'refrain', 'pre-chorus', 'post-chorus', 'solo', 'musik',
  'instrumental', 'hook', 'drop', 'ending', 'ending tag',
  'keys', 'keyboard', 'guitar', 'gitar',
];

/* ------------------------------------------------------------------
 * 4. CHORD
 * ------------------------------------------------------------------
 * Regex chord valid (satu token). Catatan: case-insensitive.
 * Contoh yang cocok: C, C#, Bb, Cm, Cmaj7, Cm7b5, C7#11, Csus4,
 * Cadd9, Am, F#m7, Bbmaj7, G/B, C#maj7#11, Amadd9.
 */
export const CHORD_REGEX_SOURCE =
  '^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m)*(?:\\d+)?(?:[#b]\\d+)*(?:\\/[A-G][#b]?)?$';

/** Token yang dianggap "No Chord". */
export const NO_CHORD_TOKENS = ['n.c.', 'nc', 'no chord', 'no chords'];

/* ------------------------------------------------------------------
 * 5. CUE MARKS (INLINE)
 * ------------------------------------------------------------------
 * Kata yang ditandai sebagai cue saat muncul inline dalam baris
 * chord/lirik, biasanya dalam kurung: (Stop), (Aksen), (Hit), (Tutti).
 */
export const CUE_MARK_KEYWORDS = [
  'tutti', 'hit', 'aksen', 'stop', 'break', 'bbreak',
  'fill-in', 'fill in', 'fade in', 'fade out', 'fade in/out',
  'ritardando', 'rit.',
];

/** Cue marks yang TIDAK ditampilkan sebagai instrumen di panel. */
export const NON_DISPLAY_INSTRUMENT_CUES = [
  'aksen', 'stop', 'break', 'bbreak',
  'fill-in', 'fill in', 'fade in', 'fade out', 'fade in/out',
];

/* ------------------------------------------------------------------
 * 6. INSTRUMEN
 * ------------------------------------------------------------------
 * Kata kunci instrumen yang dikenali parser (highlight inline
 * "Gitar: teks", "(Sax)", "Cue: (Sax)", dst).
 */
export const INSTRUMENT_KEYWORDS = [
  'gitar', 'guitar', 'bass', 'ukulele', 'mandolin', 'sape',
  'piano', 'keyboard', 'organ', 'synth', 'keys', 'synthesizer',
  'pianika', 'melodika', 'epiano',
  'brass', 'horn section', 'horns', 'trombone', 'tuba', 'euphonium', 'cornet',
  'saxophone', 'saksofon', 'sax', 'saxo', 'saxofon', 'trumpet', 'terompet',
  'flute', 'suling', 'clarinet', 'klarinet', 'bansi',
  'violin', 'biola', 'cello', 'kontrabas', 'strings',
  'vokal', 'vocal', 'vocalist', 'vokalist', 'choir', 'vokal grup',
  'drum', 'drums', 'perkusi', 'percussion', 'cajon', 'tamborin', 'marakas',
  'rebana',
  'kenong', 'gamelan', 'kendang', 'gong', 'angklung', 'rebab',
  'bell', 'bell pads', 'pads',
];

/** Suffix deskriptor yang digabung ke label instrumen (mis. "Piano Warm"). */
export const INSTRUMENT_DESCRIPTOR_SUFFIXES = [
  'dist', 'distortion', 'saw', 'sawtooth', 'square', 'triangle', 'pulse',
  'sine', 'wave', 'pad', 'warm', 'bright', 'dark', 'clean', 'mono', 'stereo',
  'ambient', 'pluck', 'sub', 'noise', 'perc', 'percussion', 'stac', 'staccato',
];

/* ------------------------------------------------------------------
 * 7. AUTOCOMPLETION DI EDITOR
 * ------------------------------------------------------------------
 */

/**
 * Entri metadata yang ditawarkan autocompletion — DITURUNKAN dari
 * METADATA_KEYS + MODULATION_KEYWORDS di atas, sehingga autocomplete dan
 * parser SELALU memakai daftar key yang sama.
 *   detail : deskripsi singkat di popup (override per-key, boleh kosong)
 *   info   : penjelasan panjang (override per-key, boleh kosong)
 */
const AUTOCOMPLETE_METADATA_DETAILS = {
  patch: {
    detail: 'Patch keyboard',
    info: 'Contoh: Patch: Stage Piano | Layer: Warm Pad',
  },
  preset: { detail: 'Preset keyboard', info: '' },
  instrument: {
    detail: 'Label instrumen',
    info: 'Menandai instrumen yang bermain di bagian ini.',
  },
  instrumen: {
    detail: 'Label instrumen',
    info: 'Menandai instrumen yang bermain di bagian ini.',
  },
  modulation: {
    detail: 'Ganti key di tengah lagu',
    info: 'Chord ikut ditranspose. Contoh: Modulation: G',
  },
  cue: {
    detail: 'Catatan perform',
    info: 'Contoh: Cue: Drum masuk di bar 9',
  },
  intensitas: { detail: 'Tingkat intensitas', info: '' },
  intensity: { detail: 'Tingkat intensitas', info: '' },
  feel: {
    detail: 'Feel/groove',
    info: 'Contoh: Feel: Half-time',
  },
  fx: { detail: 'Efek', info: '' },
  notes: { detail: 'Catatan aransemen', info: '' },
  catatan: { detail: 'Catatan aransemen', info: '' },
};

export const AUTOCOMPLETE_METADATA = [
  ...METADATA_KEYS,
  ...MODULATION_KEYWORDS,
].map((keyword) => ({
  label: `${titleCaseKeyword(keyword)}:`,
  detail: AUTOCOMPLETE_METADATA_DETAILS[keyword]?.detail || '',
  info: AUTOCOMPLETE_METADATA_DETAILS[keyword]?.info || '',
}));

/**
 * Nama instrumen yang ditawarkan autocompletion — DITURUNKAN dari
 * INSTRUMENT_KEYWORDS di atas, sehingga autocomplete dan parser SELALU
 * memakai kata kunci yang sama (dimasukkan sebagai "Nama: ").
 */
export const AUTOCOMPLETE_INSTRUMENTS = INSTRUMENT_KEYWORDS.map(titleCaseKeyword);
