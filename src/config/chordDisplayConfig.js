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

/* ==================================================================
 * GRUP A — STRUKTUR LAGU (menentukan tampilan & navigasi)
 * ================================================================== */

/* ------------------------------------------------------------------
 * 1. SECTION / STRUKTUR LAGU
 * ------------------------------------------------------------------
 * Kata kunci yang dikenali parseSection() sebagai struktur lagu.
 * Label harus mengandung kata ini sebagai kata utuh, contoh:
 *   "Verse 1", "Pre-Chorus", "Bridge - Koplo", "Interlude 2".
 *
 * Dikelompokkan: pembuka/penutup, vokal utama, bagian pelengkap,
 * lalu singkatan. Semua tetap satu array karena parseSection memindainya
 * sebagai satu kumpulan.
 */
export const STRUCTURE_SECTION_KEYWORDS = [
  // pembuka & penutup
  'intro', 'outro', 'coda',
  // bagian vokal utama
  'verse', 'pre-chorus', 'chorus', 'post-chorus', 'reff', 'refrain',
  // bagian pelengkap / instrumental
  'bridge', 'interlude', 'instrumental', 'musik', 'music', 'solo',
  // singkatan & varian ejaan
  'int.',
];

/**
 * Label yang ditawarkan autocompletion — DITURUNKAN dari STRUCTURE_SECTION_KEYWORDS,
 * sehingga autocomplete dan parser SELALU memakai kata kunci yang sama.
 */
export const AUTOCOMPLETE_SECTION_LABELS = STRUCTURE_SECTION_KEYWORDS.map(titleCaseKeyword);

/* ==================================================================
 * GRUP B — ARAH TRANSPOSE (mengubah nada chord)
 * ================================================================== */

/* ------------------------------------------------------------------
 * 2. MODULATION / KEY CHANGE
 * ------------------------------------------------------------------
 * Kata kunci pengganti key di tengah lagu. Chord setelah baris ini
 * ditranspose mengikuti label yang ditulis (contoh: Modulation: G).
 * Bentuk ber-bracket ("[Modulation: G]") juga dikenali.
 */
export const MODULATION_KEYWORDS = ['modulation', 'key change'];

/* ==================================================================
 * GRUP C — METADATA INFORMASI (tidak mempengaruhi transpose / MIDI)
 * GRUP D — ROUTING & PATCH MIDI (bisa mengirim Program Change)
 * ==================================================================
 *
 * Format baris:  Key: Value | Key2: Value2   (segment dipisah "|")
 *
 * Dikelompokkan per FUNGSI, bukan per jenis baris: Grup C tidak pernah
 * mengirim MIDI, Grup D bisa. Bedanya penting di panggung — itulah sebabnya
 * Tidak ada key Grup C yang masuk PATCH_DEFINING_KEYS.
 */

/** Grup C — info lagu (informasional, tidak mempengaruhi transpose). */
export const SONG_INFO_KEYS = [
  'original key', 'time signature',
];

/** Grup C — petunjuk permainan (cara memainkan, bukan alat/bank). */
export const PERFORMANCE_HINT_KEYS = [
  'intensitas', 'intensity', 'dynamics', 'dinamik',
  'groove', 'feel', 'style', 'texture', 'voicing',
];

/** Grup C — catatan & efek. Tidak memicu Program Change. */
export const NOTE_KEYS = [
  'cue', 'notes', 'catatan',
  'fx', 'effect', 'effects',
];

/**
 * Semua key metadata yang dikenali (isMetadataLine).
 * Termasuk Grup D supaya baris patch tetap dikenali sebagai metadata.
 */
export const METADATA_KEYS = dedupe([
  // Grup D — nama suara
  'patch', 'preset', 'sound', 'tone', 'program',
  'instrument', 'instrumen',
  // Grup D — layering & split keyboard
  'layer', 'split', 'zone', 'scene',
  // Grup D — MIDI routing
  'pc', 'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
  // Grup C — info lagu, petunjuk, catatan & efek
  ...SONG_INFO_KEYS,
  ...PERFORMANCE_HINT_KEYS,
  ...NOTE_KEYS,
]);

/** Key yang WAJIB ada agar baris dianggap instrument_patch (punya MIDI).
 *  Baris "Layer: Warm Pad" saja TIDAK jadi patch tanpa key dari daftar ini.
 *
 *  'tone' sengaja TIDAK di sini: "Tone: Bright" menyebut karakter suara, bukan
 *  suara. Memperlakukannya sebagai patch membuat inferensi jatuh ke program
 *  hasil tebakan (Program 1) yang terkirim salah saat tampil. 'sound' tetap
 *  diizinkan karena memang dipakai untuk nama suara ("Sound: Strings"). */
export const PATCH_DEFINING_KEYS = [
  'patch', 'preset', 'program', 'pc', 'instrument', 'instrumen', 'sound',
];

/** Key yang boleh muncul di baris instrument patch (parseInstrumentPatchLine) —
 *  PATCH_DEFINING_KEYS + layering & MIDI routing + konteks instrumen. */
export const INSTRUMENT_PATCH_KEYS = dedupe([
  ...PATCH_DEFINING_KEYS,
  'tone',
  'layer', 'split', 'zone', 'scene',
  'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
]);

/* ==================================================================
 * GRUP H — SINTAKS CHORD (bukan keyword, tapi dipakai parser)
 * ================================================================== */

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

/* ==================================================================
 * GRUP E — CUE MARK INLINE (aksi permainan di baris chord/lirik)
 * ================================================================== */

/* ------------------------------------------------------------------
 * 5. CUE MARKS (INLINE)
 * ------------------------------------------------------------------
 * Kata yang ditandai sebagai cue saat muncul inline dalam baris
 * chord/lirik, biasanya dalam kurung: (Stop), (Aksen), (Hit), (Tutti).
 */
/**
 * Satu sumber kebenaran untuk cue mark.
 *
 * `displayAsInstrument`: ikut tampil di panel instrumen. Aksen/stop/fill/fade
 * adalah aksi permainan, bukan alat — jadi tidak ditampilkan sebagai instrumen.
 * Dua daftar lama (keyword + non-display) bisa tidak sinkron; satu daftar objek
 * menghilangkan kemungkinan itu.
 */
export const CUE_MARKS = [
  // aksi yang masih relevan sebagai label instrumen/kategori
  { keyword: 'tutti', displayAsInstrument: true },
  { keyword: 'hit', displayAsInstrument: true },
  { keyword: 'ritardando', displayAsInstrument: true },
  { keyword: 'rit.', displayAsInstrument: true },
  // aksi permainan, bukan instrumen
  { keyword: 'aksen', displayAsInstrument: false },
  { keyword: 'stop', displayAsInstrument: false },
  { keyword: 'break', displayAsInstrument: false },
  { keyword: 'bbreak', displayAsInstrument: false },
  { keyword: 'fill-in', displayAsInstrument: false },
  { keyword: 'fill in', displayAsInstrument: false },
  { keyword: 'fade in', displayAsInstrument: false },
  { keyword: 'fade out', displayAsInstrument: false },
  { keyword: 'fade in/out', displayAsInstrument: false },
];

/** Kata kunci cue (diturunkan dari CUE_MARKS). */
export const CUE_MARK_KEYWORDS = CUE_MARKS.map((cue) => cue.keyword);

/** Cue marks yang TIDAK ditampilkan sebagai instrumen di panel. */
export const NON_DISPLAY_INSTRUMENT_CUES = CUE_MARKS
  .filter((cue) => !cue.displayAsInstrument)
  .map((cue) => cue.keyword);

/* ==================================================================
 * GRUP F — INSTRUMEN (identitas alat)
 * GRUP G — DESKRIPTOR INSTRUMEN (menjelaskan alat, bukan alat)
 * ================================================================== */

/* ------------------------------------------------------------------
 * 6. INSTRUMEN
 * ------------------------------------------------------------------
 * Kata kunci instrumen yang dikenali parser (highlight inline
 * "Gitar: teks", "(Sax)", "Cue: (Sax)", dst), dikelompokkan per keluarga.
 */
export const INSTRUMENT_KEYWORDS = [
  // senar (strings)
  'gitar', 'guitar', 'bass', 'ukulele', 'okulele', 'mandolin', 'sape',
  // keyboard & synth
  'piano', 'keyboard', 'organ', 'synth', 'keys', 'synthesizer',
  'pianika', 'melodika', 'epiano', 'akordeon', 'accordion',
  // brass
  'brass', 'horn section', 'horns', 'trombone', 'tuba', 'euphonium', 'cornet',
  // woodwind
  'saxophone', 'saksofon', 'sax', 'saxo', 'saxofon', 'trumpet', 'terompet',
  'flute', 'suling', 'seruling', 'clarinet', 'klarinet', 'bansi',
  // strings orkestra
  'violin', 'biola', 'cello', 'kontrabas', 'kontrabass', 'strings', 'harp',
  // vokal
  'vokal', 'vocal', 'vocalist', 'vokalist', 'choir', 'vokal grup',
  // perkusi & ritmis
  'drum', 'drums', 'perkusi', 'percussion', 'cajon', 'tamborin', 'tambourine',
  'marakas', 'shaker', 'rebana', 'timpani', 'marimba', 'xylophone',
  // tradisional
  'kenong', 'gamelan', 'kendang', 'gong', 'angklung', 'rebab', 'sitar',
  // efek/lain-lain
  'bell', 'bell pads', 'pads',
];

/**
 * Grup G — qualifier/deskriptor yang MENJELASKAN instrumen (mis. "Piano Warm").
 * Bukan instrumen itu sendiri. Jangan masukkan kata yang juga ada di
 * INSTRUMENT_KEYWORDS (dulu 'perc'/'percussion' ada di dua tempat).
 */
export const INSTRUMENT_DESCRIPTOR_SUFFIXES = [
  // distorsi & waveforms
  'dist', 'distortion', 'saw', 'sawtooth', 'square', 'triangle', 'pulse',
  'sine', 'wave',
  // karakter suara
  'pad', 'warm', 'bright', 'dark', 'clean', 'ambient', 'pluck', 'sub', 'noise',
  // stereo & teknik
  'mono', 'stereo', 'stac', 'staccato',
];

/* ==================================================================
 * 7. AUTOCOMPLETION DI EDITOR (turunan dari Grup A–D)
 * ================================================================== */

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
const DETAIL_ORIGINAL_KEY = {
  detail: 'Nada dasar asli',
  info: 'Hanya informasi; chord tidak ditranspose. Contoh: Original Key: G',
};
const DETAIL_TIME_SIGNATURE = {
  detail: 'Birama lagu',
  info: 'Contoh: Time Signature: 4/4',
};
const DETAIL_LAYER = {
  detail: 'Layering / split keyboard',
  info: 'Tidak mengubah suara; hanya susunan layer. Contoh: Layer: Warm Pad',
};
const DETAIL_ROUTING = {
  detail: 'Routing MIDI',
  info: 'Contoh: CH: 1 | Bank MSB: 0 | Bank LSB: 0',
};
const DETAIL_GROOVE = {
  detail: 'Groove/karakter permainan',
  info: 'Contoh: Groove: Shuffle',
};
const DETAIL_STYLE = {
  detail: 'Gaya aransemen',
  info: 'Contoh: Style: Koplo',
};
const DETAIL_TEXTURE = {
  detail: 'Tekstur/voicing',
  info: 'Contoh: Texture: Open',
};
const DETAIL_DYNAMICS = {
  detail: 'Dinamika',
  info: 'Contoh: Dynamics: mf',
};

const AUTOCOMPLETE_METADATA_DETAILS = {
  patch: DETAIL_PATCH,
  preset: DETAIL_PATCH,
  sound: DETAIL_PATCH,
  program: DETAIL_PATCH,
  tone: DETAIL_PATCH,
  instrument: DETAIL_INSTRUMENT,
  instrumen: DETAIL_INSTRUMENT,
  modulation: DETAIL_MODULATION,
  'key change': DETAIL_MODULATION,
  cue: DETAIL_CUE,
  intensitas: DETAIL_INTENSITAS,
  intensity: DETAIL_INTENSITAS,
  dynamics: DETAIL_DYNAMICS,
  dinamik: DETAIL_DYNAMICS,
  notes: DETAIL_CATATAN,
  catatan: DETAIL_CATATAN,
  effect: DETAIL_FX,
  effects: DETAIL_FX,
  feel: DETAIL_FEEL,
  groove: DETAIL_GROOVE,
  style: DETAIL_STYLE,
  texture: DETAIL_TEXTURE,
  voicing: DETAIL_TEXTURE,
  fx: DETAIL_FX,
  layer: DETAIL_LAYER,
  split: DETAIL_LAYER,
  zone: DETAIL_LAYER,
  scene: DETAIL_LAYER,
  pc: DETAIL_ROUTING,
  ch: DETAIL_ROUTING,
  channel: DETAIL_ROUTING,
  bank: DETAIL_ROUTING,
  bankmsb: DETAIL_ROUTING,
  banklsb: DETAIL_ROUTING,
  msb: DETAIL_ROUTING,
  lsb: DETAIL_ROUTING,
  'original key': DETAIL_ORIGINAL_KEY,
  'time signature': DETAIL_TIME_SIGNATURE,
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
