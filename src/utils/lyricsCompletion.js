/**
 * Autocomplete for the lyrics/chord editor.
 *
 * This replaces the "Panduan Metadata Lirik" help modal: instead of reading a
 * list of supported syntaxes somewhere else, the user gets them offered inline
 * at the moment they are typing.
 */

/** Section tags, matching what autoTagSongSections() produces. */
const SECTION_COMPLETIONS = [
  'Intro', 'Verse 1', 'Verse 2', 'Pre-Chorus', 'Post-Chorus',
  'Chorus', 'Bridge', 'Interlude', 'Solo', 'Outro', 'Coda',
].map((label) => ({
  label: `[${label}]`,
  type: 'keyword',
  detail: 'Bagian lagu',
  info: 'Ditampilkan sebagai section dan bisa dilompati dari sidebar struktur.',
}));

/** Key:value metadata understood by the chord parser. */
const METADATA_COMPLETIONS = [
  {
    label: 'Patch:',
    type: 'property',
    detail: 'Patch keyboard',
    info: 'Contoh: Patch: Stage Piano | Layer: Warm Pad',
    apply: 'Patch: ',
  },
  {
    label: 'Preset:',
    type: 'property',
    detail: 'Preset keyboard',
    apply: 'Preset: ',
  },
  {
    label: 'Instrument:',
    type: 'property',
    detail: 'Label instrumen',
    info: 'Menandai instrumen yang bermain di bagian ini.',
    apply: 'Instrument: ',
  },
  {
    label: 'Modulation:',
    type: 'property',
    detail: 'Ganti key di tengah lagu',
    info: 'Chord ikut ditranspose. Contoh: Modulation: G',
    apply: 'Modulation: ',
  },
  {
    label: 'Original Key:',
    type: 'property',
    detail: 'Key asli lagu',
    info: 'Tidak ikut ditranspose.',
    apply: 'Original Key: ',
  },
  {
    label: 'Cue:',
    type: 'property',
    detail: 'Catatan perform',
    info: 'Contoh: Cue: Drum masuk di bar 9',
    apply: 'Cue: ',
  },
  {
    label: 'Intensitas:',
    type: 'property',
    detail: 'Tingkat intensitas',
    apply: 'Intensitas: ',
  },
  {
    label: 'Feel:',
    type: 'property',
    detail: 'Feel/groove',
    info: 'Contoh: Feel: Half-time',
    apply: 'Feel: ',
  },
  {
    label: 'FX:',
    type: 'property',
    detail: 'Efek',
    apply: 'FX: ',
  },
  {
    label: 'Notes:',
    type: 'property',
    detail: 'Catatan aransemen',
    apply: 'Notes: ',
  },
];

/** MIDI cue templates that actually trigger a Program Change. */
const MIDI_CUE_COMPLETIONS = [
  {
    label: '[Keys:',
    type: 'class',
    detail: 'Cue patch MIDI',
    info: 'Memicu Program Change ke keyboard. Contoh: [Keys: Stage Piano | PC: 0 | CH: 1]',
    apply: '[Keys: ',
  },
];

const ALL_COMPLETIONS = [
  ...SECTION_COMPLETIONS,
  ...MIDI_CUE_COMPLETIONS,
  ...METADATA_COMPLETIONS,
];

/** Instrument words highlighted by the editor. */
const INSTRUMENT_COMPLETIONS = [
  'Piano', 'Keys', 'Guitar', 'Bass', 'Drums', 'Strings', 'Brass',
  'Vokal', 'Sax', 'Suling', 'Violin',
].map((name) => ({
  label: name,
  type: 'variable',
  detail: 'Instrumen',
  apply: `${name}: `,
}));

const options = [...ALL_COMPLETIONS, ...INSTRUMENT_COMPLETIONS];

/** Match the word/tag fragment immediately before the cursor. */
function tokenBefore(state, pos) {
  const line = state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);
  // Either an unfinished [Section, or a key:value fragment.
  const bracket = before.match(/\[[^\]\n]*$/);
  if (bracket) return { from: pos - bracket[0].length, text: bracket[0] };
  const word = before.match(/[A-Za-z]+$/);
  if (word) return { from: pos - word[0].length, text: word[0] };
  return null;
}

/**
 * Completion source. Deliberately simple: it offers the known syntaxes whenever
 * the user starts a `[` tag, or a capitalised word that could begin a metadata
 * key. It never completes chord names — those are typed far too often for a
 * popup to be helpful.
 */
export function lyricsCompletionSource(context) {
  const token = tokenBefore(context.state, context.pos);
  if (!token) return null;

  // Only trigger on '[' or on a word that starts a likely metadata key.
  const isTag = token.text.startsWith('[');
  const isWordStart = /^[A-Z]/.test(token.text);
  if (!isTag && !isWordStart) return null;
  if (typeof context.matchBefore === 'function' && !context.explicit) {
    if (token.text.length < 1) return null;
  }

  const word = context.matchBefore(/\[?[A-Za-z0-9-]*/);
  const from = word ? word.from : token.from;

  return {
    from,
    options,
    validFor: /^\[?[A-Za-z0-9-]*$/,
  };
}

export { options as lyricsCompletionOptions };
