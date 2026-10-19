import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { parseSection, parsePresetCueLine, isChordLine, isMetadataLine } from './chordUtils.js';

/**
 * Lyric/chord syntax highlighting for the lyrics editor.
 *
 * Uses the exact same parsers as the read view (parseSection / parsePresetCueLine /
 * isChordLine / isMetadataLine) so the editor colours match ChordDisplay 1:1.
 */

const SECTION_TONE_PATTERNS = [
  { tone: 'section-intro', pattern: /(intro|opening|interlude|\bint\b|outro|ending|coda)/ },
  { tone: 'section-chorus', pattern: /(chorus|reff|refrain)/ },
  { tone: 'section-verse', pattern: /(verse|bait|pre\s*[- ]?chorus|post\s*[- ]?chorus|bridge|solo)/ },
];

function detectSectionTone(label) {
  const normalized = String(label || '').toLowerCase().replace(/[_-]+/g, ' ');
  const hit = SECTION_TONE_PATTERNS.find((entry) => entry.pattern.test(normalized));
  return hit ? hit.tone : 'section-verse';
}

const token = (name) => Decoration.mark({ class: `cm-lyr-${name}` });

const CHORD_DECORATION = token('chord');
const SECTION_DECORATION = token('section');
const CUE_DECORATION = token('cue');
const METADATA_DECORATION = token('metadata');
const BARLINE_DECORATION = token('barline');
const INSTRUMENT_DECORATION = token('instrument');
const TIMESTAMP_DECORATION = token('timestamp');
const SECTION_INTRO_DECORATION = token('section-intro');
const SECTION_CHORUS_DECORATION = token('section-chorus');
const SECTION_VERSE_DECORATION = token('section-verse');

const INSTRUMENT_WORD_REGEX =
  /(gitar|guitar|bass|ukulele|piano|keyboard|keys|organ|synth|drum|perkusi|percussion|vokal|vocal|voice|choir|suling|flute|sakso|sax|trumpet|terompet|brass|violin|biola|cello|string|strings|brass)/i;

function toneDecoration(tone) {
  if (tone === 'section-intro') return SECTION_INTRO_DECORATION;
  if (tone === 'section-chorus') return SECTION_CHORUS_DECORATION;
  return SECTION_VERSE_DECORATION;
}

/** Decorate a single source line into the builder, in ascending position order. */
function decorateLine(builder, line, lineFrom) {
  const trimmed = line.trim();
  if (!trimmed) return;

  const push = (from, to, decoration) => {
    if (to <= from) return;
    builder.add(lineFrom + from, lineFrom + to, decoration);
  };

  // 1. Preset cue line: [Keys: Stage Piano | PC: 0 | CH: 1]
  const presetCue = parsePresetCueLine(line);
  if (presetCue) {
    push(0, line.length, CUE_DECORATION);
    return;
  }

  // 2. Section / structure / instrument / modulation label
  const section = parseSection(line);
  if (section) {
    const label = String(section.label || '');
    const labelIndex = line.indexOf(label);
    if (labelledStructure(section)) {
      push(0, line.length, toneDecoration(detectSectionTone(label)));
    } else if (labelIndex >= 0) {
      push(labelIndex, labelIndex + label.length, SECTION_DECORATION);
    } else {
      push(0, line.length, SECTION_DECORATION);
    }
    return;
  }

  // 3. Metadata line: "Cue: ...", "Intensitas: 1", ...
  if (isMetadataLine(line)) {
    push(0, line.length, METADATA_DECORATION);
    return;
  }

  // 4. Pure chord line: highlight every non-space token + barlines
  if (isChordLine(line)) {
    decorateChordTokens(builder, line, lineFrom);
    return;
  }

  // 5. Lyrics line: highlight inline [Chord] tokens, [mm:ss] timestamps, instrument labels
  decorateInlineLyrics(builder, line, lineFrom);
}

function labelledStructure(section) {
  return (
    section.type === 'structure' ||
    section.type === 'instrument' ||
    section.type === 'modulation' ||
    section.type === 'instrument_patch'
  );
}

function decorateChordTokens(builder, line, lineFrom) {
  const tokenRegex = /\S+/g;
  let match;
  while ((match = tokenRegex.exec(line)) !== null) {
    const raw = match[0];
    const start = match.index;
    const end = start + raw.length;

    if (/^(\|:|:\||\[:|:]|\|\||\|)$/.test(raw)) {
      builder.add(lineFrom + start, lineFrom + end, BARLINE_DECORATION);
      continue;
    }
    if (/^\(\d+x\)$/i.test(raw)) {
      builder.add(lineFrom + start, lineFrom + end, METADATA_DECORATION);
      continue;
    }
    if (/^[({[]?[A-Ga-g][#b♭♯]?/.test(raw) === false && !/[A-G]m/.test(raw)) {
      // Not chord-shaped (could be an instrument word on a chord line)
      if (INSTRUMENT_WORD_REGEX.test(raw)) {
        builder.add(lineFrom + start, lineFrom + end, INSTRUMENT_DECORATION);
      }
      continue;
    }
    builder.add(lineFrom + start, lineFrom + end, CHORD_DECORATION);
  }
}

function decorateInlineLyrics(builder, line, lineFrom) {
  const bracketRegex = /\[([^\]\n]+)\]/g;
  let match;
  let cursor = 0;

  while ((match = bracketRegex.exec(line)) !== null) {
    const inner = match[1].trim();
    const start = match.index;
    const end = start + match[0].length;

    // Plain text before this bracket still needs chord detection.
    decoratePlainSegment(builder, line, lineFrom, cursor, start);

    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(inner)) {
      builder.add(lineFrom + start, lineFrom + end, TIMESTAMP_DECORATION);
    } else if (/^(keys|piano|guitar|bass|drum|brass|strings|vocal|vokal)\s*:/i.test(inner) || /PC\s*:|CH\s*:/i.test(inner)) {
      builder.add(lineFrom + start, lineFrom + end, CUE_DECORATION);
    } else if (/^[A-Ga-g][#b♭♯]?/.test(inner)) {
      builder.add(lineFrom + start, lineFrom + end, CHORD_DECORATION);
    } else {
      builder.add(lineFrom + start, lineFrom + end, SECTION_DECORATION);
    }

    cursor = end;
  }

  decoratePlainSegment(builder, line, lineFrom, cursor, line.length);
}

function decoratePlainSegment(builder, line, lineFrom, from, to) {
  if (to <= from) return;
  const segment = line.slice(from, to);

  const wordRegex = /\S+/g;
  let match;
  while ((match = wordRegex.exec(segment)) !== null) {
    const raw = match[0];
    const start = from + match.index;
    const end = start + raw.length;

    if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      builder.add(lineFrom + start, lineFrom + end, TIMESTAMP_DECORATION);
    } else if (/^\(\d+x\)$/i.test(raw)) {
      builder.add(lineFrom + start, lineFrom + end, METADATA_DECORATION);
    } else if (INSTRUMENT_WORD_REGEX.test(raw) && /:\s*$/.test(raw)) {
      builder.add(lineFrom + start, lineFrom + end, INSTRUMENT_DECORATION);
    }
  }
}

function buildDecorations(view) {
  const builder = new RangeSetBuilder();
  const { doc } = view.state;

  for (let lineNo = 1; lineNo <= doc.lines; lineNo += 1) {
    const lineInfo = doc.line(lineNo);
    decorateLine(builder, lineInfo.text, lineInfo.from, lineInfo.to);
  }

  return builder.finish();
}

/**
 * CodeMirror extension that paints lyrics/chord structure.
 *
 * Rebuilds only when the DOCUMENT or the viewport actually changed. CodeMirror
 * fires many update events that are neither (selection-only moves, focus blur,
 * height measurement), and re-decorating the entire document on those was pure
 * waste — on a long lyric it is the main cost of typing. The viewport guard also
 * keeps the work proportional to what is on screen, not to the doc length.
 */
export const lyricsHighlighting = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (instance) => instance.decorations }
);

/** Class on the editor wrapper; every popup rule is scoped to it. */
export const LYRICS_EDITOR_SCOPE_CLASS = 'song-lyrics-codemirror';

/**
 * Popup autocomplete lirik/chord.
 *
 * Hanya memuat aturan untuk tooltip/popup — gaya badan editor dipisah ke
 * `lyricsEditorTheme` supaya popup tidak mewarisi `fontSize` atau background
 * transparan dari editor (itu sebabnya popup lama nyaris tak terbaca).
 */
export const lyricsAutocompleteTheme = EditorView.theme({
  '.cm-tooltip': {
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text-primary)',
    boxShadow: '0 10px 24px rgba(2, 6, 23, 0.45)',
    overflow: 'hidden',
    fontSize: '13px',
    lineHeight: '1.4',
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    // Jangan melebar melewati layar pada HP.
    maxWidth: 'min(340px, calc(100vw - 24px))',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    padding: '4px',
    maxHeight: '240px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    lineHeight: '1.35',
    cursor: 'pointer',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'color-mix(in srgb, var(--primary-accent) 22%, transparent)',
    color: 'var(--text-primary)',
  },
  '.cm-tooltip-autocomplete .cm-completionLabel': {
    color: 'var(--text-primary)',
    fontSize: '0.82rem',
    fontWeight: '600',
    flex: '0 0 auto',
  },
  '.cm-tooltip-autocomplete .cm-completionMatchedText': {
    color: 'var(--primary-accent)',
    fontWeight: '800',
    textDecoration: 'none',
  },
  '.cm-tooltip-autocomplete .cm-completionDetail': {
    marginLeft: 'auto',
    color: 'var(--text-secondary)',
    fontStyle: 'normal',
    fontSize: '0.7rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.cm-tooltip-autocomplete .cm-completionIcon': {
    opacity: '0.7',
    width: '1.1em',
    margin: '0',
  },
  '.cm-tooltip-autocomplete .cm-completionIcon-keyword::after': { content: '"§"' },
  '.cm-tooltip-autocomplete .cm-completionIcon-property::after': { content: '"≡"' },
  '.cm-tooltip-autocomplete .cm-completionIcon-variable::after': { content: '"♪"' },
  '.cm-tooltip.cm-completionInfo': {
    padding: '8px 10px',
    marginLeft: '6px',
    maxWidth: '240px',
    backgroundColor: 'var(--secondary-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    fontSize: '0.72rem',
  },
  '.cm-tooltip-autocomplete > ul > li .cm-completionInfo': {
    color: 'var(--text-secondary)',
  },
  '.cm-tooltip .cm-scroll': { scrollbarWidth: 'thin' },
});

/**
 * CodeMirror theme tuned to the app's CSS variables. Each `cm-lyr-*` class is
 * styled from src/styles/lyrics-editor.css.
 *
 * `dark: true` matters for plugins, not looks: CodeMirror only injects its
 * built-in dark tooltip rules (background/border on non-themed tooltips) for
 * dark themes, so without it the autocomplete popup kept a light default skin.
 */
export const lyricsEditorTheme = EditorView.theme(
  {
    '&': { fontSize: '14px', backgroundColor: 'transparent' },
    '.cm-content': {
      fontFamily: '"Courier New", "JetBrains Mono", Courier, monospace',
      lineHeight: '1.6',
      padding: '12px 0',
      caretColor: 'var(--primary-accent)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--text-secondary)',
      paddingRight: '8px',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(59, 130, 246, 0.07)' },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--primary-accent)',
      fontWeight: '700',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, ::selection': { backgroundColor: 'rgba(59, 130, 246, 0.25)' },
  },
  { dark: true }
);
