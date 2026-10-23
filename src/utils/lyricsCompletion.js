/**
 * Autocomplete for the lyrics/chord editor.
 *
 * This replaces the "Panduan Metadata Lirik" help modal: instead of reading a
 * list of supported syntaxes somewhere else, the user gets them offered inline
 * at the moment they are typing.
 */

import { AUTOCOMPLETE_METADATA_DETAILS, titleCaseKeyword } from '../config/chordDisplayConfig.js';
import {
  getActiveMetadataKeys,
  getAutocompleteInstruments,
  getAutocompleteSectionLabels,
} from './chord/chordDisplayTags.js';

/**
 * Section tags, matching what autoTagSongSections() produces.
 *
 * Every keyword is offered in one shape only — `[Keyword]` — so metadata and
 * instrument entries also complete into a bracketed tag from an open `[`.
 */
const sectionCompletions = () => getAutocompleteSectionLabels(titleCaseKeyword).map((label) => ({
  label: `[${label}]`,
  type: 'keyword',
  detail: 'Bagian lagu',
  info: 'Ditampilkan sebagai section dan bisa dilompati dari sidebar struktur.',
}));

/**
 * Key:value metadata understood by the chord parser.
 *
 * Satu bentuk saja: `[Patch: Stage Piano]`. Baris "Patch: ..." tanpa braket
 * sengaja tidak ditawarkan — semua keyword ditulis dalam braket siku.
 */
const metadataCompletions = () => getActiveMetadataKeys().map((keyword) => {
  const label = `${titleCaseKeyword(keyword)}:`;
  const details = AUTOCOMPLETE_METADATA_DETAILS[keyword] || {};
  return {
    label: `[${label} ]`,
    type: 'property',
    detail: details.detail || '',
    info: details.info || undefined,
    apply: `[${label} ]`,
    // Klik "Original Key:" menulis "[Original Key: ]" — kursor di dalam braket.
    applyAfter: ']',
  };
});

/** Instrument words highlighted by the editor — always as a bracketed tag. */
const instrumentCompletions = () => getAutocompleteInstruments(titleCaseKeyword).map((name) => ({
  label: `[${name}: ]`,
  type: 'variable',
  detail: 'Instrumen',
  apply: `[${name}: ]`,
}));

/**
 * Daftar opsi dibuat ulang setiap pembacaan (getter) karena Administrator
 * dapat mengubah daftar kata kunci saat aplikasi berjalan.
 */
const buildOptions = () => [
  ...sectionCompletions(),
  ...metadataCompletions(),
  ...instrumentCompletions(),
].map((option) => (
  // '' = kursor tepat di dalam braket (setelah "[Nama: ").
  { ...option, applyAfter: option.applyAfter ?? '' }
));

const options = buildOptions();

/** Match the unfinished `[` tag immediately before the cursor. */
function tokenBefore(state, pos) {
  const line = state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);
  // Only an unfinished [Section / [Key: tag matters here.
  const bracket = before.match(/\[[^\]\n]*$/);
  if (bracket) return { from: pos - bracket[0].length, text: bracket[0] };
  return null;
}

/**
 * Completion source. Deliberately simple: it only offers the known syntaxes
 * once the user opens a `[` tag (sections, metadata and instrument tags and
 * cue marks). It never triggers on plain words, so chord names and
 * lyrics — which are typed far too often for a popup to be helpful — stay
 * undisturbed.
 *
 * The `from` position ALWAYS comes from our own token scan (`token.from`),
 * never from `context.matchBefore`: matchBefore matches an empty string at
 * positions the token scan rejected, which made the popup's `from` jump behind
 * the caret while typing mid-word — applying a completion then replaced from
 * that wrong offset and yanked the cursor to the start of the line.
 */
export const lyricsCompletionSource = (context) => {
  // Only trigger on an opened '[' tag; plain words never open the popup.
  const token = tokenBefore(context.state, context.pos);
  if (!token) return null;

  // "[Patch:" — braketnya SUDAH ditutup oleh "[" pembuka tag ini, jadi sisa
  // pengetikan adalah isi tag; "[" pembuka tidak boleh diganti ("[[Patch: ]").
  const tagAlreadyOpen = /\]:?\s*$/.test(token.text);

  return {
    from: tagAlreadyOpen ? context.pos : token.from,
    // Dibangun per pemanggilan: daftar tag bisa diubah admin saat aplikasi
    // berjalan, dan popup harus langsung menawarkan kata kunci terbaru.
    options: getLyricsCompletionOptions(),
    validFor: /^\[?[A-Za-z0-9-]*$/,
  };
};

/** Daftar opsi terbaru (baca ulang daftar tag aktif). */
export const getLyricsCompletionOptions = () => buildOptions();

/**
 * Opsi saat modul dimuat. Dipertahankan untuk kompatibilitas; kode runtime
 * memakai getLyricsCompletionOptions() agar editan admin ikut terbaca.
 */
export const lyricsCompletionOptions = options;
