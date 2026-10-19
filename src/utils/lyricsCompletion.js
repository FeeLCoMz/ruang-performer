/**
 * Autocomplete for the lyrics/chord editor.
 *
 * This replaces the "Panduan Metadata Lirik" help modal: instead of reading a
 * list of supported syntaxes somewhere else, the user gets them offered inline
 * at the moment they are typing.
 */

import {
  AUTOCOMPLETE_SECTION_LABELS as CONFIG_SECTION_LABELS,
  AUTOCOMPLETE_METADATA as CONFIG_METADATA,
  AUTOCOMPLETE_INSTRUMENTS as CONFIG_INSTRUMENTS,
  CUE_MARK_KEYWORDS as CONFIG_CUE_MARK_KEYWORDS,
} from '../config/chordDisplayConfig.js';

/**
 * Section tags, matching what autoTagSongSections() produces.
 *
 * Also offered in a bracketed variant (e.g. `[Patch: ]`) for metadata and
 * instrument names so they can be completed from an open `[` tag: the parser
 * only treats a bracketed line as a section header, so inline chips render the
 * same way, and the cursor lands right after the `: ` separator.
 */
const SECTION_COMPLETIONS = [...new Set(CONFIG_SECTION_LABELS)].map((label) => ({
  label: `[${label}]`,
  type: 'keyword',
  detail: 'Bagian lagu',
  info: 'Ditampilkan sebagai section dan bisa dilompati dari sidebar struktur.',
}));

/** Key:value metadata understood by the chord parser. */
const METADATA_COMPLETIONS = CONFIG_METADATA.flatMap(({ label, detail, info }) => [
  {
    label,
    type: 'property',
    detail,
    info: info || undefined,
    apply: `${label} `,
  },
  {
    label: `[${label} ]`,
    type: 'property',
    detail,
    info: info || undefined,
    apply: `[${label} ]`,
  },
]);

/** Capitalise each word, matching autoTagSongSections()/config labels. */
function titleCaseKeyword(keyword) {
  return String(keyword)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Instrument words highlighted by the editor. */
const INSTRUMENT_COMPLETIONS = [...new Set(CONFIG_INSTRUMENTS)].flatMap((name) => [
  {
    label: name,
    type: 'variable',
    detail: 'Instrumen',
    apply: `${name}: `,
  },
  {
    label: `[${name}: ]`,
    type: 'variable',
    detail: 'Instrumen',
    apply: `[${name}: ]`,
  },
]);

/**
 * Inline cue marks (Stop, Hit, Aksen, ...) recognised by isCueMarkKeyword().
 * Offered in both bracket styles the parser accepts: `(Hit)` and `[Hit]`.
 */
const CUE_LABELS = [
  ...new Set(CONFIG_CUE_MARK_KEYWORDS.map(titleCaseKeyword)),
];

const CUE_COMPLETIONS = CUE_LABELS.flatMap((name) => [
  { label: `[${name}]`, type: 'keyword', detail: 'Cue mark', apply: `[${name}]` },
  { label: `(${name})`, type: 'keyword', detail: 'Cue mark', apply: `(${name})` },
]);

const ALL_COMPLETIONS = [
  ...SECTION_COMPLETIONS,
  ...METADATA_COMPLETIONS,
];

const options = [...ALL_COMPLETIONS, ...INSTRUMENT_COMPLETIONS, ...CUE_COMPLETIONS];

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
 * once the user opens a `[` tag (sections, bracketed metadata/instrument
 * variants and cue marks). It never triggers on plain words, so chord names and
 * lyrics — which are typed far too often for a popup to be helpful — stay
 * undisturbed.
 *
 * The `from` position ALWAYS comes from our own token scan (`token.from`),
 * never from `context.matchBefore`: matchBefore matches an empty string at
 * positions the token scan rejected, which made the popup's `from` jump behind
 * the caret while typing mid-word — applying a completion then replaced from
 * that wrong offset and yanked the cursor to the start of the line.
 */
export function lyricsCompletionSource(context) {
  // Only trigger on an opened '[' tag; plain words never open the popup.
  const token = tokenBefore(context.state, context.pos);
  if (!token) return null;

  return {
    from: token.from,
    options,
    validFor: /^\[?[A-Za-z0-9-]*$/,
  };
}

export { options as lyricsCompletionOptions };
