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
 * UTILITAS
 * ------------------------------------------------------------------
 * Kapitalisasi kata kunci untuk ditampilkan di popup:
 *   kata pendek/teknis -> KAPITAL penuh ('fx' -> 'FX', 'pc' -> 'PC')
 *   kata lain          -> Title Case  ('pre-chorus' -> 'Pre-Chorus')
 */
const titleCaseKeyword = (keyword) => keyword
  .split(/([\s-]+)/)
  .map((part) => (/^[a-z]+$/.test(part) && part.length > 2
    ? part[0].toUpperCase() + part.slice(1)
    : part.toUpperCase()))
  .join('');

/** Hapus duplikat dari sebuah daftar (urutan tetap terjaga). */
const dedupe = (list) => [...new Set(list)];

/* ------------------------------------------------------------------
 * 1. SECTION / STRUKTUR LAGU
 * ------------------------------------------------------------------
 * Kata kunci yang dikenali parseSection() sebagai struktur lagu.
 * Label harus mengandung kata ini sebagai kata utuh, contoh:
 *   "Verse 1", "Pre-Chorus", "Bridge - Koplo", "Interlude 2".
 */
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
 * Label yang ditawarkan autocompletion — DITURUNKAN dari STRUCTURE_SECTION_KEYWORDS,
 * sehingga autocomplete dan parser SELALU memakai kata kunci yang sama.
 */
export const AUTOCOMPLETE_SECTION_LABELS = STRUCTURE_SECTION_KEYWORDS.map(titleCaseKeyword);

/* ------------------------------------------------------------------
 * 2. MODULATION / KEY CHANGE
 * ------------------------------------------------------------------
 * Kata kunci pengganti key di tengah lagu. Chord setelah baris ini
 * ditranspose mengikuti label yang ditulis (contoh: Modulation: G).
 */
export const MODULATION_KEYWORDS = ['modulation', 'key change'];

/* ------------------------------------------------------------------
 * 3. METADATA / PATCH KEYBOARD
 * ------------------------------------------------------------------
 * Format baris:  Key: Value | Key2: Value2   (segment dipisah "|")
 */

/** Semua key metadata yang dikenali (isMetadataLine). */
export const METADATA_KEYS = [
  // patch & sound
  'patch', 'preset', 'sound', 'tone', 'program',
  'instrument', 'instrumen',
  // layering & split keyboard
  'layer', 'split', 'zone',
  // MIDI routing
  'pc', 'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
  // dinamika & feel
  'intensitas', 'intensity', 'dynamics', 'dinamik',
  'groove', 'feel', 'style', 'texture', 'voicing',
  // catatan & efek
  'cue', 'notes', 'catatan',
  'fx', 'effect', 'effects',
  // lain-lain
  'scene', 'part', 'fill',
];

/** Key yang WAJIB ada agar baris dianggap instrument_patch (punya MIDI).
 *  Baris "Layer: Warm Pad" saja TIDAK jadi patch tanpa key dari daftar ini. */
export const PATCH_DEFINING_KEYS = [
  'patch', 'preset', 'sound', 'tone', 'instrument', 'instrumen', 'program', 'pc',
];

/** Key yang boleh muncul di baris instrument patch (parseInstrumentPatchLine) —
 *  PATCH_DEFINING_KEYS + layering & MIDI routing. */
export const INSTRUMENT_PATCH_KEYS = dedupe([
  ...PATCH_DEFINING_KEYS,
  'layer', 'split', 'zone', 'scene',
  'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
]);

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
 * "Gitar: teks", "(Sax)", "Cue: (Sax)", dst), dikelompokkan per keluarga.
 */
export const INSTRUMENT_KEYWORDS = [
  // senar (strings)
  'gitar', 'guitar', 'bass', 'ukulele', 'mandolin', 'sape',
  // keyboard
  'piano', 'keyboard', 'organ', 'synth', 'keys', 'synthesizer',
  'pianika', 'melodika', 'epiano',
  // brass
  'brass', 'horn section', 'horns', 'trombone', 'tuba', 'euphonium', 'cornet',
  // woodwind
  'saxophone', 'saksofon', 'sax', 'saxo', 'saxofon', 'trumpet', 'terompet',
  'flute', 'suling', 'clarinet', 'klarinet', 'bansi',
  // strings orkestra
  'violin', 'biola', 'cello', 'kontrabas', 'strings',
  // vokal
  'vokal', 'vocal', 'vocalist', 'vokalist', 'choir', 'vokal grup',
  // perkusi & ritmis
  'drum', 'drums', 'perkusi', 'percussion', 'cajon', 'tamborin', 'marakas',
  'rebana',
  // tradisional
  'kenong', 'gamelan', 'kendang', 'gong', 'angklung', 'rebab',
  // efek/lain-lain
  'bell', 'bell pads', 'pads',
];

/** Suffix deskriptor yang digabung ke label instrumen (mis. "Piano Warm"). */
export const INSTRUMENT_DESCRIPTOR_SUFFIXES = [
  // distorsi & waveforms
  'dist', 'distortion', 'saw', 'sawtooth', 'square', 'triangle', 'pulse',
  'sine', 'wave',
  // karakter suara
  'pad', 'warm', 'bright', 'dark', 'clean', 'ambient', 'pluck', 'sub', 'noise',
  // stereo & teknik
  'mono', 'stereo', 'perc', 'percussion', 'stac', 'staccato',
];

/* ------------------------------------------------------------------
 * 7. AUTOCOMPLETION DI EDITOR
 * ------------------------------------------------------------------
 * Entri metadata yang ditawarkan autocompletion — DITURUNKAN dari
 * METADATA_KEYS + MODULATION_KEYWORDS di atas, sehingga autocomplete dan
 * parser SELALU memakai daftar key yang sama.
 * Tabel di bawah hanya menyimpan deskripsi popup per key (boleh dikosongkan);
 * key tanpa entri tetap ditawarkan tanpa deskripsi.
 */

/** Deskripsi yang dipakai beberapa key sekaligus (sinonim). */
const DETAIL_PATCH = {
  detail: 'Patch keyboard',
  info: 'Contoh: Patch: Stage Piano | Layer: Warm Pad',
};
const DETAIL_INSTRUMENT = {
  detail: 'Label instrumen',
  info: 'Menandai instrumen yang bermain di bagian ini.',
};
const DETAIL_MODULATION = {
  detail: 'Ganti key di tengah lagu',
  info: 'Chord ikut ditranspose. Contoh: Modulation: G',
};
const DETAIL_CUE = {
  detail: 'Catatan perform',
  info: 'Contoh: Cue: Drum masuk di bar 9',
};
const DETAIL_INTENSITAS = { detail: 'Tingkat intensitas', info: '' };
const DETAIL_CATATAN = { detail: 'Catatan aransemen', info: '' };
const DETAIL_FEEL = {
  detail: 'Feel/groove',
  info: 'Contoh: Feel: Half-time',
};
const DETAIL_FX = { detail: 'Efek', info: '' };

const AUTOCOMPLETE_METADATA_DETAILS = {
  patch: DETAIL_PATCH,
  preset: DETAIL_PATCH,
  sound: DETAIL_PATCH,
  tone: DETAIL_PATCH,
  instrument: DETAIL_INSTRUMENT,
  instrumen: DETAIL_INSTRUMENT,
  modulation: DETAIL_MODULATION,
  'key change': DETAIL_MODULATION,
  cue: DETAIL_CUE,
  intensitas: DETAIL_INTENSITAS,
  intensity: DETAIL_INTENSITAS,
  notes: DETAIL_CATATAN,
  catatan: DETAIL_CATATAN,
  feel: DETAIL_FEEL,
  fx: DETAIL_FX,
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
export const AUTOCOMPLETE_INSTRUMENTS = dedupe(INSTRUMENT_KEYWORDS.map(titleCaseKeyword));
