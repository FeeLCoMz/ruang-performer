/**
 * chordDisplayConfig.js — KONFIGURASI MANUAL ChordDisplay
 * =========================================================
 * File ini menyimpan daftar BAWAAN. Parser, editor, dan autocomplete membaca
 * daftar aktif lewat src/utils/chord/chordDisplayTags.js, yang mengambil nilai
 * di sini lalu menimpanya dengan kata kunci yang diatur Administrator di
 * halaman /admin (tab "Tag & Deteksi").
 *
 * Edit daftar di sini hanya mengubah BAWAAN: pengaturan admin yang sudah
 * tersimpan di browser tetap menang. Untuk mengembalikan ke bawaan, pakai
 * tombol "Reset" di tab tersebut.
 *
 * Urutan item mempengaruhi prioritas pencocokan (item lebih awal = dipilih dulu).
 * Semua pencocokan kata kunci tidak peka huruf besar/kecil.
 * =========================================================
 */
import { getChordDisplayTags } from '../utils/chord/chordDisplayTags.js';

/* ------------------------------------------------------------------
 * UTILITAS
 * ------------------------------------------------------------------
 * Kapitalisasi kata kunci untuk ditampilkan di popup:
 *   kata pendek/teknis -> KAPITAL penuh ('fx' -> 'FX', 'pc' -> 'PC')
 *   kata lain          -> Title Case  ('pre-chorus' -> 'Pre-Chorus')
 */
/**
 * SATU-SATUNYA fungsi kapitalisasi keyword. Dipakai juga oleh
 * src/utils/lyricsCompletion.js — jangan membuat salinan lokal: dulu cue mark
 * tampil "Fx"/"Rit." di popup sementara metadata tampil "FX", karena file itu
 * punya versi sendiri.
 */
export const titleCaseKeyword = (keyword) => String(keyword)
  .split(/([\s-]+)/)
  .map((part) => (/^[a-z]+$/.test(part) && part.length > 2
    ? part[0].toUpperCase() + part.slice(1)
    : part.toUpperCase()))
  .join('');

/** Hapus duplikat dari sebuah daftar (urutan tetap terjaga). */
const dedupe = (list) => [...new Set(list)];

/** Escape karakter khusus regex pada sebuah string. */
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  'intro', 'opening', 'outro', 'ending', 'coda',
  // bagian vokal utama
  'verse', 'bait', 'pre-chorus', 'chorus', 'post-chorus', 'reff', 'refrain',
  // bagian pelengkap / instrumental
  'bridge', 'interlude', 'instrumental', 'musik', 'music', 'solo',
  // singkatan & varian ejaan
  'int.', 'int',
];

/**
 * Alias label seksi -> bentuk kanonik.
 *
 * Dulu alias ini tinggal di src/utils/chord/sections.js, sementara editor
 * (lyricsEditorUtils, lyricsHighlightExtension) dan ChordDisplay punya regex
 * sendiri dengan kosakata yang berbeda: "[Ending]" diwarnai editor tapi TIDAK
 * dianggap seksi oleh parser. Semua kosakata sekarang ada di sini.
 *
 * Kanonik menentukan hitungan struktur (parseChordPro.structures), jadi sinonim
 * harus menunjuk ke satu kunci yang sama.
 */
export const SECTION_NAME_ALIASES = {
  opening: 'intro',
  ending: 'outro',
  bait: 'verse',
  int: 'interlude',
  'int.': 'interlude',
  music: 'instrumental',
  musik: 'instrumental',
  // "Reff" adalah sebutan paling umum untuk bagian ulangan di lagu Indonesia;
  // dihitung sebagai chorus, bukan refrain, agar statistik struktur tidak pecah.
  reff: 'chorus',
  refrain: 'chorus',
};

/** Bentuk kanonik dari sebuah keyword seksi (alias bila ada). */
export const canonicalSectionKeyword = (keyword = '') => {
  const lower = String(keyword).trim().toLowerCase();
  return SECTION_NAME_ALIASES[lower] || lower;
};

/** Sama seperti canonicalSectionKeyword, tetapi memakai alias yang AKTIF. */
export const getCanonicalSectionKeyword = (keyword = '') => {
  const lower = String(keyword).trim().toLowerCase();
  return getChordDisplayTags().SECTION_NAME_ALIASES[lower] || lower;
};

/**
 * Label yang ditawarkan autocompletion — DITURUNKAN dari STRUCTURE_SECTION_KEYWORDS,
 * sehingga autocomplete dan parser SELALU memakai kata kunci yang sama.
 * Alias tidak ditawarkan: satu label per seksi, memakai bentuk kanonik.
 */
export const AUTOCOMPLETE_SECTION_LABELS = dedupe(
  STRUCTURE_SECTION_KEYWORDS.map((keyword) => titleCaseKeyword(canonicalSectionKeyword(keyword))),
);

/**
 * Bentuk stabil untuk CSS/highlight/ikon. Kosakata `section-*` yang sudah ada
 * di stylesheet hanya intro/chorus/verse; seksi lain dipetakan ke salah satunya.
 * Urutan penting: "pre-chorus" harus dicek sebelum "chorus".
 */
const SECTION_TONE_RULES = [
  { tone: 'intro', keywords: ['intro', 'outro', 'coda', 'interlude', 'instrumental'] },
  { tone: 'chorus', keywords: ['chorus', 'refrain'] },
  { tone: 'verse', keywords: ['verse', 'bridge', 'solo'] },
];

/** Tone editor/highlight untuk label seksi (default: section-verse). */
export const sectionToneOf = (label = '') => {
  const lower = String(label || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!lower) return 'verse';

  const words = lower.split(/[\s:()[\]]+/).filter(Boolean);
  const candidates = new Set([lower, ...words]);
  const aliases = getChordDisplayTags().SECTION_NAME_ALIASES;

  for (const rule of SECTION_TONE_RULES) {
    for (const candidate of candidates) {
      const canonical = aliases[candidate] || canonicalSectionKeyword(candidate);
      if (rule.keywords.includes(canonical)) return rule.tone;
    }
  }

  return 'verse';
};

/** Ikon per seksi di ChordDisplay, dicocokkan dari tone (bukan regex label). */
export const SECTION_ICONS = {
  intro: '🎬',
  verse: '🎤',
  chorus: '🔁',
};

/**
 * Seri alternation regex label seksi, mis. `intro|outro|verse|...`.
 * Dipakai parser bulk-lyrics supaya daftar seksi tidak lagi disalin manual.
 */
export const SECTION_KEYWORD_ALTERNATION = dedupe(
  STRUCTURE_SECTION_KEYWORDS.map((keyword) => escapeRegex(keyword)
    // Titik di akhir singkatan ('int.') bersifat opsional saat dicocokkan.
    .replace(/\.$/, '\\.?')
    .replace(/\s+/g, '[\\s_-]*')),
).join('|');

/** Label seksi lengkap `[Verse 1]` / `Verse 1:` dalam satu format. */
export const SECTION_LABEL_REGEX_SOURCE = `^\\[?\\s*(?:${SECTION_KEYWORD_ALTERNATION})\\b`;

/* ==================================================================
 * GRUP C — METADATA INFORMASI (tidak mempengaruhi transpose)
 * ==================================================================
 *
 * Format baris:  Key: Value | Key2: Value2   (segment dipisah "|")
 *
 * Catatan: parsing patch / preset cue / routing MIDI (Patch:, PC:, CH:,
 * Bank:, [Keys: ... | PC: 1]) DIHAPUS dari ChordDisplay. Keyword yang dibaca
 * modul MIDI (patch, preset, sound, program, tone, layer, split, zone, scene,
 * pc, ch, bank, msb, lsb, ...) TIDAK didaftarkan di sini: daftar keyword MIDI
 * dikelola modulnya sendiri, bukan konfigurasi ChordDisplay. Baris ber-key MIDI
 * tidak lagi jadi metadata — slot MIDI akan mem-parse-nya sendiri.
 */

/** Grup C — info lagu (informasional, tidak mempengaruhi transpose). */
export const SONG_INFO_KEYS = [
  'original key', 'time signature',
  // Ganti key di tengah lagu. Dulu grup/parser modulasi terpisah; sekarang
  // baris "Modulation: G" / "Key Change: G" hanya info metadata seperti
  // "Original Key" — chord TIDAK ikut ditranspose.
  'modulation', 'key change',
];

/**
 * Semua key metadata yang dikenali (isMetadataLine) dan tidak punya parser
 * sendiri. Hanya keyword milik ChordDisplay: keyword patch/MIDI sengaja tidak
 * ada di sini karena modul MIDI membaca teks lirik dengan daftarnya sendiri.
 *
 * Petunjuk permainan (Intensitas, Feel, Groove, ...) dan cue mark
 * ([Stop], [Hit], [Tutti], ...) kini juga metadata biasa — parser cue mark
 * sudah dihapus, jadi baris ber-braket itu tampil sebagai chip metadata.
 */
export const METADATA_KEYS = dedupe([
  ...SONG_INFO_KEYS,
  // petunjuk permainan (cara memainkan, bukan alat/bank)
  'intensitas', 'intensity', 'dynamics', 'dinamik',
  'groove', 'feel', 'style', 'texture', 'voicing',
  // catatan & efek (tidak memicu Program Change)
  'cue', 'notes', 'catatan',
  'fx', 'effect', 'effects',
  // cue mark inline (aksi permainan)
  'tutti', 'hit', 'ritardando', 'rit.',
  'aksen', 'stop', 'break', 'bbreak', 'fill-in', 'fill in',
  'fade in', 'fade out', 'fade in/out',
]);

/**
 * Key routing MIDI (Patch:, PC:, CH:, Bank: ...). Modul MIDI yang membaca
 * baris ini, BUKAN ChordDisplay — jadi sengaja tidak masuk METADATA_KEYS.
 * Daftarnya disimpan di sini hanya supaya bentrok dengan INSTRUMENT_KEYWORDS
 * terlihat di satu tempat dan bisa ditest.
 */
export const MIDI_ROUTING_KEYS = [
  'patch', 'preset', 'sound', 'tone', 'program', 'instrument', 'instrumen',
  'layer', 'split', 'zone', 'scene',
  'pc', 'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
];

/**
 * Keyword yang ada di INSTRUMENT_KEYWORDS tapi juga diklaim MIDI. "[Keys: ...]"
 * adalah baris MIDI (bukan label instrumen), jadi parser membuangnya dari
 * instrumen. Kalau menambah instrumen bernama sama dengan key MIDI, daftarkan
 * di sini agar perilakunya eksplisit.
 */
export const MIDI_KEYS_ALSO_INSTRUMENT = ['keys'];

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

/* ------------------------------------------------------------------
 * 4b. CHORD SHAPE (baris chart)
 * ------------------------------------------------------------------
 * Versi LOOSE dari regex di atas, dipakai saat memindai seluruh baris chart:
 * boleh berisi leading dash (passing chord: "-Am") dan compact separator
 * ("D..Gm..Bb", "C-Am"). Untuk memvalidasi satu chord secara ketat tetap
 * gunakan CHORD_REGEX_SOURCE.
 *
 * Bila menambah kualitas chord baru (mis. m11, 7sus4, add11), ubah KEDUANYA.
 */
export const CHORD_TOKEN_REGEX_SOURCE =
  '[\\(\\[\\{]?-?([A-G][#b]?(?:maj|min|dim|aug|sus|add|m)*(?:\\d+)?(?:[#b]\\d+)*(?:\\/[A-G][#b]?)?)(((\\.{2,}|-)([A-G][#b]?(?:maj|min|dim|aug|sus|add|m)*(?:\\d+)?(?:[#b]\\d+)*(?:\\/[A-G][#b]?)?))*)(\\.{2,})?[\\)\\]\\}]?';

/** Token yang dianggap "No Chord". */
export const NO_CHORD_TOKENS = ['n.c.', 'nc', 'no chord', 'no chords'];

/* ==================================================================
 * GRUP F — INSTRUMEN (identitas alat)
 * ================================================================== */

/* ------------------------------------------------------------------
 * 6. INSTRUMEN
 * ------------------------------------------------------------------
 * Kata kunci instrumen yang dikenali parser (highlight inline
 * "[Gitar: Dist]", "[Sax]", dll), dikelompokkan per keluarga.
 * Instrumen hanya dikenali di dalam braket siku.
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
  'flute', 'suling', 'seruling', 'clarinet', 'klarinet', 'bansi','saluang', 'oboe', 'fagot', 'bassoon', 'piccolo',
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

/* ==================================================================
 * 7. AUTOCOMPLETION DI EDITOR (turunan dari Grup A–D)
 * ================================================================== */

/* ------------------------------------------------------------------
 * 7. AUTOCOMPLETION DI EDITOR
 * ------------------------------------------------------------------
 * Entri metadata yang ditawarkan autocompletion — DITURUNKAN dari
 * METADATA_KEYS di atas, sehingga autocomplete dan
 * parser SELALU memakai daftar key yang sama.
 * Tabel di bawah hanya menyimpan deskripsi popup per key (boleh dikosongkan);
 * key tanpa entri tetap ditawarkan tanpa deskripsi.
 * Keyword patch/MIDI (Patch:, Layer:, CH:, ...) sengaja TIDAK ada di sini:
 * itu dibaca modul MIDI, bukan ChordDisplay.
 */

/** Deskripsi yang dipakai beberapa key sekaligus (sinonim). */
const DETAIL_INSTRUMENT = {
  detail: 'Label instrumen',
  info: 'Menandai instrumen yang bermain di bagian ini.',
};
const DETAIL_MODULATION = {
  detail: 'Ganti key di tengah lagu',
  info: 'Hanya informasi; chord tidak ditranspose otomatis. Contoh: Modulation: G',
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

/**
 * Deskripsi per keyword metadata, juga dibaca autocomplete editor
 * (lyricsCompletion.js) untuk keyword yang ditambahkan admin.
 * @type {Record<string, {detail: string, info: string}>}
 */
export const AUTOCOMPLETE_METADATA_DETAILS = {
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
  'original key': DETAIL_ORIGINAL_KEY,
  'time signature': DETAIL_TIME_SIGNATURE,
  // Cue mark inline kini metadata biasa (mis. [Stop], [Hit]).
  tutti: DETAIL_CUE,
  hit: DETAIL_CUE,
  ritardando: DETAIL_CUE,
  'rit.': DETAIL_CUE,
  aksen: DETAIL_CUE,
  stop: DETAIL_CUE,
  break: DETAIL_CUE,
  bbreak: DETAIL_CUE,
  'fill-in': DETAIL_CUE,
  'fill in': DETAIL_CUE,
  'fade in': DETAIL_CUE,
  'fade out': DETAIL_CUE,
  'fade in/out': DETAIL_CUE,
};

export const AUTOCOMPLETE_METADATA = [
  ...METADATA_KEYS,
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
