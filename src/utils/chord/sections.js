/**
 * sections.js
 *
 * Deteksi label seksi lagu, modulasi, dan metadata dari sebuah baris teks.
 *
 * Kata kunci seksi & modulasi berasal dari src/config/chordDisplayConfig.js
 * dan dicocokkan sebagai kata utuh (lihat textKeywords.js).
 */
import {
  CUE_MARK_KEYWORDS,
  INSTRUMENT_KEYWORDS,
  MODULATION_KEYWORDS,
  STRUCTURE_SECTION_KEYWORDS,
} from '../../config/chordDisplayConfig.js';
import {
  buildKeywordAlternation,
  createKeywordPattern,
  metadataKeys,
} from './textKeywords.js';
import {
  matchInlineInstrumentLabel,
  normalizeInstrumentDisplayLabel,
} from './instruments.js';

/**
 * Kata kunci struktur -> regex batas kata. Di-cache: parseSection dipanggil
 * beberapa kali per baris dan regex ini sebelumnya dibangun ulang tiap kali.
 */
const STRUCTURE_KEYWORD_PATTERNS = STRUCTURE_SECTION_KEYWORDS.map((keyword) => ({
  keyword,
  pattern: createKeywordPattern(keyword),
}));

const MODULATION_LINE_REGEX = new RegExp(
  `^(?:${buildKeywordAlternation(MODULATION_KEYWORDS, '\\s+')})\\s*:\\s*(.+)$`,
  'i',
);

/**
 * Key yang dibaca modul MIDI. Ditulis ulang di sini (bukan diimpor dari
 * chordDisplayConfig) karena config itu khusus ChordDisplay — lihat catatan
 * di sana.
 */
const MIDI_KEY_WORDS = [
  'patch', 'preset', 'sound', 'tone', 'program', 'instrument', 'instrumen',
  'layer', 'split', 'zone', 'scene',
  'pc', 'ch', 'channel', 'bank', 'bankmsb', 'banklsb', 'msb', 'lsb',
];

const MIDI_KEY_PATTERN = new RegExp(`^(?:${MIDI_KEY_WORDS.join('|')})$`, 'i');

/**
 * "[Keys: EP Soft | PC: 0 | CH: 1]" -> true. Segmen yang kuncinya keyword MIDI
 * (di posisi mana pun, termasuk kunci utamanya sendiri: "Keys", "Patch") atau
 * opsi MIDI ("PC", "CH") berarti baris ini milik modul MIDI, bukan label
 * instrumen ChordDisplay.
 */
const hasMidiKeywordSegment = (line = '') => {
  const trimmed = String(line || '').trim();
  if (!/^\[[^[\]]*\]$/.test(trimmed)) return false;

  return trimmed
    .slice(1, -1)
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .some((segment) => {
      const idx = segment.indexOf(':');
      if (idx <= 0) return false;
      const key = segment.slice(0, idx).trim().replace(/[\s_]+/g, '');
      // "Keys" pada "[Keys: EP Soft]" juga menandai baris MIDI.
      if (key.toLowerCase() === 'keys') return true;
      return MIDI_KEY_PATTERN.test(key);
    });
};

/**
 * "[Gitar: Dist]" / "[Epiano: ]" -> { instrument, detail }. Bukan instrumen
 * berarti false. Hanya untuk TAMPILAN: tidak ada data MIDI yang dihasilkan di
 * sini; modul MIDI membaca teks lirik sendiri saat aktif.
 */
export const parseBracketedInstrumentLabel = (line) => {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  // Satu bracket utuh saja: "[Intro] [Gitar: Dist]" adalah baris gabungan.
  if (!/^\[[^[\]]*\]$/.test(trimmed)) return false;

  // Segmen ber-key MIDI membuat baris ini milik modul MIDI, bukan instrumen.
  if (hasMidiKeywordSegment(trimmed)) return false;

  const inside = trimmed.slice(1, -1).trim();
  if (!inside) return false;

  const idx = inside.indexOf(':');
  if (idx <= 0) return false;

  const rawLabel = inside.slice(0, idx).trim();
  if (!rawLabel || /\|/.test(rawLabel)) return false;

  // Nama di kiri titik dua harus BERUPA nama instrumen itu sendiri, bukan
  // sekadar frasa yang memuat kata instrumen. "[Keys: EP Soft]" lolos jika
  // memakai matchInlineInstrumentLabel karena detail "EP Soft" mengandung
  // "EP"/piano — padahal "Keys" adalah key MIDI.
  if (!normalizeInstrumentDisplayLabel(rawLabel)) return false;

  const firstOption = inside.slice(idx + 1).split('|')[0].trim();
  const instrument = normalizeInstrumentDisplayLabel(rawLabel);
  if (!instrument) return false;

  return {
    instrument,
    detail: firstOption,
  };
};

/** Label untuk baris ber-instrumen: "Gitar: Dist" / "Epiano". */
export const formatBracketedInstrumentLabel = (bracketed) => (
  bracketed.detail ? `${bracketed.instrument}: ${bracketed.detail}` : bracketed.instrument
);

/**
 * Satu braket berisi kata kunci cue mark ("[Stop]", "[Fill in]") dan bukan
 * instrumen. Dipakai agar baris itu jadi label cue, bukan lirik satu kata.
 */
export const isKnownCueMarkLabel = (line = '') => {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!/^\[[^[\]]+\]$/.test(trimmed)) return false;

  const inside = trimmed.slice(1, -1).trim().toLowerCase();
  if (!inside) return false;
  if (INSTRUMENT_KEYWORDS.includes(inside)) return false;

  return CUE_MARK_KEYWORDS.includes(inside);
};

const isInstrumentBracketLine = (line) => {
  const trimmed = String(line || '').trim();
  // Hanya satu bracket utuh, atau bracket pertama saat baris gabungan
  // ("[Intro] [Gitar: Dist]"): keduanya bukan seksi "Intro"/"Gitar".
  const firstBracket = trimmed.match(/^\[([^[\]]*)\]/);
  if (!firstBracket) return false;
  const inside = firstBracket[1];
  const idx = inside.indexOf(':');
  if (idx <= 0) return false;

  // Key MIDI ("[Keys: EP Soft]") milik modul MIDI, bukan seksi "Keys".
  if (hasMidiKeywordSegment(`[${inside}]`)) return true;

  return Boolean(matchInlineInstrumentLabel(inside.slice(0, idx).trim()));
};

// Fungsi untuk mendeteksi section/struktur lagu atau instrumen
export function parseSection(line) {
  const trimmedLine = typeof line === 'string' ? line.trim() : '';
  if (!trimmedLine) return null;

  // Instrumen hanya diperlakukan sebagai gaya render inline; tidak dianggap sebagai section/metadata struktur.
  if (trimmedLine.match(/\([^)]*\)/g)?.length > 1 && !trimmedLine.includes(':')) {
    return null;
  }

  // "[Gitar: Dist]" bukan seksi "Gitar": label instrumen di kiri titik dua
  // tidak boleh berubah jadi struktur lagu hanya karena memakai bracket.
  // Baris itu diredupkan sebagai metadata.
  if (isInstrumentBracketLine(trimmedLine)) {
    return null;
  }

  // Gabungkan deteksi [Section], Section:, [Instrumen], Instrumen: dengan satu regex
  // Contoh cocok: [Intro], Intro:, [Gitar], Gitar:
  const match = trimmedLine.match(/^(?:\[)?([A-Za-z0-9 .:_\-\+&(),\/']+?)(?:\])?\s*:?\s*(?:\(([^)]+)\))?\s*$/);
  if (match) {
    // "[Chorus: Piano Math]" / "Chorus (2x)": kata setelah titik dua dan
    // anotasi kurung adalah keterangan, bukan bagian label seksi.
    const [rawLabel, ...labelRest] = match[1].split(':');
    const labelCore = rawLabel.trim();
    const annotation = match[2]?.trim() || labelRest.join(':').trim();
    const displayLabel = annotation ? `${labelCore} (${annotation})` : labelCore;
    const labelLower = labelCore.toLowerCase();
    // Setiap keyword dicocokkan sebagai kata utuh, bukan substring:
    // "Interlude" cocok, "Soloist" tidak. "Time Signature:" TIDAK, karena
    // "signature" hanyalah satu kata dari kata kunci multi-kata — tanpa
    // pengecekan ini label parsial itu lolos sebagai section.
    if (STRUCTURE_KEYWORD_PATTERNS.some(({ keyword, pattern }) => (
      !keyword.includes(' ') && pattern.test(labelLower)
    ))) {
      return { type: 'structure', label: displayLabel };
    }
  }

  // Deteksi modulasi/key change. Bentuk ber-bracket ("[Modulation: G]",
  // "[Key Change: G]") juga dikenali supaya penulisan bracket konsisten dengan
  // metadata lain, tidak jatuh ke lirik.
  const modulationMatch = trimmedLine
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim()
    .match(MODULATION_LINE_REGEX);
  if (modulationMatch) {
    const targetKey = modulationMatch[1].trim();
    return { type: 'modulation', label: targetKey };
  }

  return null;
}

/**
 * Baris "Patch:", "Preset:", "Sound:", "Layer:", "PC:", "CH:", ... — dulu
 * diparse menjadi `instrument_patch` + data MIDI. Sekarang parser patch/MIDI
 * sudah DIHAPUS dari ChordDisplay (akan ditangani modul MIDI sendiri), jadi
 * baris seperti ini hanya perlu dirapikan sebagai chip metadata agar tidak
 * tercecer ke baris chord/lirik.
 */
export const isInstrumentPatchLikeLine = (line) => {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes(':')) return false;

  return trimmed
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .some((segment) => {
      const idx = segment.indexOf(':');
      if (idx <= 0) return false;
      const key = segment.slice(0, idx).trim().toLowerCase()
        .replace(/^[\[(]+|[\])]+$/g, '')
        .replace(/[\s_]+/g, '');
      return metadataKeys.has(key) || metadataKeys.has(key.replace(/\s+/g, ''));
    });
};

const isKnownMetadataKey = (rawKey = '') => {
  const normalized = String(rawKey).trim().toLowerCase().replace(/[\s_]+/g, ' ');
  const key = normalized.replace(/^[\[(]+|[\])]+$/g, '').trim();
  return metadataKeys.has(key) || metadataKeys.has(key.replace(/\s+/g, ''));
};

export const isMetadataLine = (line) => {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^Cue\s*:/i.test(trimmed)) return true;

  const singleBracketMatch = trimmed.match(/^\[([^\]]+):\s*([^\]]+)\]$/);
  if (singleBracketMatch) {
    return isKnownMetadataKey(singleBracketMatch[1]);
  }

  if (!trimmed.includes(':')) return false;

  const segments = trimmed.split('|').map((segment) => segment.trim()).filter(Boolean);
  if (!segments.length) return false;

  return segments.some((segment) => {
    const idx = segment.indexOf(':');
    if (idx <= 0 || idx >= segment.length - 1) return false;
    return isKnownMetadataKey(segment.slice(0, idx));
  });
};

/** Bracket jam [mm:ss] / [hh:mm:ss] — bukan label seksi, bukan metadata. */
export const TIMESTAMP_BRACKET_REGEX = /^\[\d{1,2}:\d{2}(?::\d{2})?\]$/;

/**
 * Keyword instrumen untuk deteksi instrumen (panel instrumen, "instrumen per
 * seksi"). Cue mark sengaja dibuang: aksi permainan seperti "Stop" atau "Aksen"
 * bukan alat, jadi tidak boleh terbaca sebagai instrumen.
 */
export const REAL_INSTRUMENT_KEYWORDS = INSTRUMENT_KEYWORDS.filter(
  (keyword) => !CUE_MARK_KEYWORDS.includes(keyword),
);

/**
 * Alias ejaan seksi -> bentuk kanonik. Hanya untuk varian yang TIDAK sudah ada
 * di STRUCTURE_SECTION_KEYWORDS; daftar kata kunci sendiri tetap satu sumber di
 * src/config/chordDisplayConfig.js.
 */
const SECTION_NAME_ALIASES = {
  int: 'interlude',
  reff: 'refrain',
  musik: 'instrumental',
};

/** Huruf kecil, buang titik dua/titik di akhir, rapikan spasi. */
const cleanSectionName = (label = '') => String(label || '')
  .toLowerCase()
  .replace(/[.:]+$/, '')
  .replace(/\s+/g, ' ')
  .trim();

/** Apakah tepat satu kata kunci seksi muncul sebagai kata utuh. */
const findStructureKeyword = (nameLower) => STRUCTURE_KEYWORD_PATTERNS.find(
  ({ pattern }) => pattern.test(nameLower),
);

/**
 * Bentuk kanonik label seksi, mis. "Pre-Chorus 2" -> "pre-chorus",
 * "[Instrumental]" -> "instrumental", "Int." -> "interlude".
 *
 * Dipakai parseStandardFormat (laporan statistik) supaya daftar seksi yang
 * dikenali SAMA dengan parseSection — sebelumnya daftar `if (includes(...))`
 * di sana menyimpang dari config.
 *
 * @returns {string|null} kanonik lowercase, atau null bila bukan seksi.
 */
export function canonicalSection(label) {
  const nameLower = cleanSectionName(label);
  if (!nameLower) return null;

  if (SECTION_NAME_ALIASES[nameLower]) return SECTION_NAME_ALIASES[nameLower];

  const aliasWord = nameLower.split(' ').find((word) => SECTION_NAME_ALIASES[word]);
  if (aliasWord) return SECTION_NAME_ALIASES[aliasWord];

  const match = findStructureKeyword(nameLower);
  if (!match) return null;

  return cleanSectionName(match.keyword);
}
