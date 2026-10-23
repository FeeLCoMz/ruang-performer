/**
 * annotations.js
 *
 * Anotasi tag: teks keterangan yang menempel pada sebuah tag dengan titik dua.
 *
 *   [Intro: anotasi]          seksi + anotasi
 *   [Original Key: C]         metadata + nilai
 *   [Gitar: anotasi]          instrumen + anotasi
 *   [Intro: Am F C G]         seksi + chord di dalam anotasi
 *
 * Aturan penting: isi anotasi dibekukan dari transpose. Sebelumnya seluruh baris
 * chord ikut ditranspose, sehingga "[Intro: C]" berubah menjadi "[Intro: D]"
 * setelah naik dua langkah — padahal anotasi adalah keterangan, bukan chord yang
 * dimainkan. Sekarang hanya token di LUAR braket yang ditranspose; bagian yang
 * berupa chord di dalam anotasi dibiarkan apa adanya.
 *
 * Pengecualian:
 *   - "[Organ: Dist]" tetap label instrumen (isinya nama alat, bukan keterangan).
 *   - "[Original Key: C]" ikut transpose: nilainya nada dasar, bukan anotasi.
 *
 * Satu braket utuh bisa berisi beberapa segmen ("[Keys: EP Soft | PC: 1]");
 * hanya segmen yang ber-key ChordDisplay (seksi / metadata / instrumen) yang
 * dibekukan — segmen lain tetap mengikuti aturan biasa.
 */
import { getChordDisplayTags } from './chordDisplayTags.js';
import { createKeywordPattern } from './textKeywords.js';
import { matchInlineInstrumentLabel } from './instruments.js';

/** Satu braket utuh, bukan baris gabungan "[Intro] [Gitar: Dist]". */
const SINGLE_BRACKET_REGEX = /^\[[^[\]]*\]$/;

/** Maksimal segmen "|" yang diperiksa; baris MIDI bisa panjang. */
const MAX_ANNOTATION_SEGMENTS = 8;

/** "Original  Key" / "fill_in" -> "original key" / "fill in". */
const normalizeKeyText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .trim();

/**
 * Key grup yang labelnya boleh membawa anotasi setelah titik dua.
 * Read-only pada daftar tag, jadi tidak perlu cache: regex kata utuh dibangun
 * hanya untuk beberapa segmen braket per baris, bukan per token.
 */
const labelKeySets = () => {
  const tags = getChordDisplayTags();
  return {
    sections: tags.STRUCTURE_SECTION_KEYWORDS,
    metadata: tags.METADATA_KEYS,
    instruments: tags.INSTRUMENT_KEYWORDS,
  };
};

/** Apakah `label` (teks kiri titik dua) adalah keyword seksi/metadata/instrumen. */
const isAnnotationLabel = (label = '') => {
  const normalized = normalizeKeyText(label);
  if (!normalized) return false;

  const sets = labelKeySets();
  const isKnown = (list = []) => {
    const noSpace = normalized.replace(/\s+/g, '');
    return list.some((keyword) => {
      const lower = normalizeKeyText(keyword);
      if (lower === normalized) return true;
      if (lower.replace(/\s+/g, '') === noSpace) return true;
      return createKeywordPattern(keyword).test(normalized);
    });
  };

  return isKnown(sets.metadata) || isKnown(sets.instruments) || isKnown(sets.sections);
};

/** "Dist" / "EP Soft" / "Gitar, Organ" — detail label instrumen, bukan anotasi. */
const isInstrumentKeywordOnly = (value = '') => {
  const words = String(value)
    .split(/[\s,/&;]+/)
    .map((word) => normalizeKeyText(word.replace(/[.,;:]+$/g, '')))
    .filter(Boolean);
  if (!words.length) return false;

  const instruments = labelKeySets().instruments.map(normalizeKeyText);
  return words.every((word) => instruments.includes(word));
};

/**
 * Key yang nilainya BUKAN anotasi, melainkan nada dasar lagu.
 *
 * `original key` dikecualikan: nilainya ("G") adalah key asli, dan baris itu
 * memang harus ikut transpose ketika lagu dinaikkan/diturunkan.
 */
const FROZEN_ANNOTATION_KEYS = new Set(['original key']);

/**
 * Pecah isi braket pada titik dua terluar pertama (titik dua di dalam tanda
 * kurung tidak dihitung: "Gitar: Dist (E: high)").
 *
 * @returns {{ label: string, annotation: string } | null}
 */
const splitLabelAnnotation = (inside = '') => {
  const text = String(inside || '');
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) depth = Math.max(0, depth - 1);
    else if (char === ':' && depth === 0) {
      return { label: text.slice(0, index).trim(), annotation: text.slice(index + 1) };
    }
  }
  return null;
};

/**
 * Apakah token ini braket yang WAJIB dipertahankan utuh saat transpose.
 * Hanya tensor yang memanggil ini; deteksi baris tetap memakai aturan lama.
 */
export const isAnnotationBracketToken = (token = '') => {
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!SINGLE_BRACKET_REGEX.test(trimmed)) return false;

  const inside = trimmed.slice(1, -1);
  if (!inside.trim()) return false;

  const segments = inside.split('|').slice(0, MAX_ANNOTATION_SEGMENTS);
  return segments.some((segment) => {
    const split = splitLabelAnnotation(segment);
    if (!split || !split.label) return false;
    if (!isAnnotationLabel(split.label)) return false;
    if (FROZEN_ANNOTATION_KEYS.has(normalizeKeyText(split.label))) return false;
    // "[Organ: Dist]" adalah label INSTRUMEN dengan detail, bukan anotasi:
    // nilainya cuma nama alat dan tidak perlu dikunci. Anotasi instrumen baru
    // berlaku bila isinya keterangan bebas ("[Gitar: anotasi]").
    const detail = split.annotation.trim();
    return !(detail && isInstrumentKeywordOnly(detail));
  });
};

/**
 * Label instrumen yang MEMBUKA anotasi setelah titik dua.
 *
 * Sama seperti aturan `parseBracketedInstrumentLabel`: nama di kiri titik dua
 * harus berupa nama alat itu sendiri (bukan kata yang mengandung nama alat).
 * Dipakai instruments.js agar label seperti "[Organ: Dist]" tidak dianggap
 * keyword instrumen biasa setelah cabang anotasi diperiksa lebih dulu.
 */
export const isInstrumentAnnotationLabel = (label = '') => {
  const normalized = normalizeKeyText(label);
  if (!normalized) return false;
  return Boolean(matchInlineInstrumentLabel(String(label).trim()));
};
