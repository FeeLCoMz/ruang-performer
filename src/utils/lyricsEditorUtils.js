import {
  isChordLine,
  parseSection,
  transposeChord,
  isMetadataLine,
  isInstrumentKeywordWord,
  canonicalSection,
} from './chordUtils.js';
import { sectionToneOf, titleCaseKeyword } from '../config/chordDisplayConfig.js';
import { getChordDisplayTags } from './chord/chordDisplayTags.js';
import { formatSectionLabel } from './chord/sections.js';
import { isAnnotationBracketToken } from './chord/annotations.js';
import { toNumberNotation } from './notationUtils.js';

const LIKELY_CHORD_SYMBOL_REGEX = /^[A-Ga-g][#b♭♯]?(?:(?:maj|major|min|minor|m|dim|aug|sus|add|M|no|omit|\+|-)?[0-9#b♭♯+\-]*)*(?:\/[A-Ga-g][#b♭♯]?)?$/i;
const BRACKETED_CHORD_REGEX = /([\[\(\{])([^\]\)\}\n]+)([\]\)\}])/g;
const BLANK_LINE_REGEX = /\n{3,}/g;
const INVISIBLE_FORMAT_CHARS_REGEX = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

function normalizeLineEndings(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE_FORMAT_CHARS_REGEX, '');
}

function standardizeRoot(rawRoot = '') {
  if (!rawRoot) return rawRoot;
  const normalized = rawRoot.replace(/♯/g, '#').replace(/♭/g, 'b');
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function normalizeChordQualitySuffix(rawSuffix = '') {
  if (!rawSuffix) return '';

  let suffix = rawSuffix.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\s+/g, '');
  suffix = suffix.replace(/^major/i, 'maj');
  suffix = suffix.replace(/^maj/i, 'maj');
  suffix = suffix.replace(/^minor/i, 'm');
  suffix = suffix.replace(/^min/i, 'm');
  suffix = suffix.replace(/^M(?=\d|$)/, 'maj');
  if (suffix === '-') return 'm';
  return suffix;
}

function isLikelyChordSymbol(token) {
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (/^(N\.C\.|NC|No\s*Chord)$/i.test(trimmed)) return true;
  return LIKELY_CHORD_SYMBOL_REGEX.test(trimmed);
}

export function standardizeChordSymbol(chord) {
  if (typeof chord !== 'string') return chord;

  const trimmed = chord.trim();
  if (!trimmed) return chord;
  if (/^(N\.C\.|NC|No\s*Chord)$/i.test(trimmed)) return 'N.C.';

  const slashParts = trimmed.split('/');
  const basePart = slashParts.shift() || '';
  const baseMatch = basePart.match(/^([A-Ga-g][#b♭♯]?)(.*)$/);
  if (!baseMatch) return chord;

  const [, root, rawSuffix = ''] = baseMatch;
  const normalizedRoot = standardizeRoot(root);
  const normalizedSuffix = normalizeChordQualitySuffix(rawSuffix);
  const normalizedBass = slashParts.length > 0
    ? `/${slashParts
        .join('/')
        .replace(/^([A-Ga-g][#b♭♯]?)(.*)$/i, (_, bassRoot, remainder = '') => `${standardizeRoot(bassRoot)}${remainder.replace(/\s+/g, '')}`)}`
    : '';

  return `${normalizedRoot}${normalizedSuffix}${normalizedBass}`;
}

function transformDelimitedChordToken(token, transformChord) {
  if (typeof token !== 'string' || !token) return token;
  if (/^(\|:|:\||\[\:|:\]|\|\||\|)$/.test(token) || /^\(\d+x\)$/i.test(token)) return token;

  const wrappedMatch = token.match(/^([\[\(\{]?)(.+?)([\]\)\}]?)(\.{2,})?$/);
  if (!wrappedMatch) return token;

  const [, prefix = '', inner = '', suffix = '', trailingDots = ''] = wrappedMatch;
  const rawInner = inner.trim();
  if (!rawInner) return token;

  if (isLikelyChordSymbol(rawInner)) {
    return `${prefix}${transformChord(rawInner)}${suffix}${trailingDots}`;
  }

  const compound = rawInner.split(/(\.{2,}|-)/);
  if (compound.length === 1) return token;

  const nextInner = compound
    .map((part, index) => {
      if (index % 2 === 1) return part;
      const cleaned = part.trim();
      if (!cleaned || !isLikelyChordSymbol(cleaned)) return part;
      return transformChord(cleaned);
    })
    .join('');

  return `${prefix}${nextInner}${suffix}${trailingDots}`;
}

function hasLikelyChordContent(token) {
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (/^(\|:|:\||\[\:|:\]|\|\||\|)$/.test(trimmed) || /^\(\d+x\)$/i.test(trimmed)) return true;
  if (isLikelyChordSymbol(trimmed)) return true;

  const parts = trimmed.split(/(\.{2,}|-)/).filter(Boolean);
  if (parts.length <= 1) return false;

  return parts.every((part, index) => {
    if (index % 2 === 1) return /^(\.{2,}|-)$/.test(part);
    return !part.trim() || isLikelyChordSymbol(part.trim());
  });
}

function normalizeChordMeasuresContent(content) {
  const compactOrSpacedParts = content
    .split(/(?:\.{2,}|\s{2,}|\t+|\s+|-(?=[A-Ga-g]))/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (compactOrSpacedParts.length < 2) return null;
  if (!compactOrSpacedParts.every((part) => isLikelyChordSymbol(part))) return null;
  return compactOrSpacedParts.map((part) => standardizeChordSymbol(part));
}

function buildChordGridLine(measures, boundaryStart = '|', boundaryEnd = '|') {
  if (!Array.isArray(measures) || measures.length === 0) return '';
  return `${boundaryStart} ${measures.join(' | ')} ${boundaryEnd}`.replace(/\s+/g, ' ').trim();
}

function normalizeChordMeasureText(measure) {
  return String(measure || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => transformDelimitedChordToken(token, standardizeChordSymbol))
    .join(' ');
}

function normalizeBarlineChordGrid(line) {
  const trimmed = line.trim();
  if (!trimmed) return line;

  const boundaryMatches = [...trimmed.matchAll(/(\|:|:\||\|\||\|)/g)];
  if (boundaryMatches.length < 2) return null;

  const measures = [];
  for (let index = 0; index < boundaryMatches.length - 1; index += 1) {
    const start = boundaryMatches[index].index + boundaryMatches[index][0].length;
    const end = boundaryMatches[index + 1].index;
    const rawMeasure = trimmed.slice(start, end).trim();
    measures.push(rawMeasure ? normalizeChordMeasureText(rawMeasure) : '');
  }

  const normalizedMeasures = measures.map((measure) => measure.replace(/^\|\s*|\s*\|$/g, '').trim());
  return buildChordGridLine(normalizedMeasures, boundaryMatches[0][0], boundaryMatches[boundaryMatches.length - 1][0]);
}

function normalizeChordGridCandidate(line) {
  const leadingWhitespace = (line.match(/^\s*/) || [''])[0];
  const trimmed = line.trim();
  if (!trimmed) return line;

  const sectionPrefixMatch = trimmed.match(/^([^:]+:)(\s+)(.+)$/);
  if (sectionPrefixMatch) {
    const [, label, spacer, content] = sectionPrefixMatch;
    if (parseSection(label)) {
      const normalizedBarGrid = normalizeBarlineChordGrid(content);
      if (normalizedBarGrid) return `${leadingWhitespace}${label}${spacer}${normalizedBarGrid}`;

      const measures = normalizeChordMeasuresContent(content);
      if (measures) {
        return `${leadingWhitespace}${label}${spacer}${buildChordGridLine(measures)}`;
      }
    }
  }

  const normalizedBarGrid = normalizeBarlineChordGrid(trimmed);
  if (normalizedBarGrid) return `${leadingWhitespace}${normalizedBarGrid}`;

  const measures = normalizeChordMeasuresContent(trimmed);
  if (!measures) return line;
  return `${leadingWhitespace}${buildChordGridLine(measures)}`;
}

/**
 * Ganti token non-spasi, kecuali braket anotasi ([Intro: Am F C G]), yang
 * harus verbatim: chord di dalam anotasi bukan chord yang dimainkan.
 */
const replaceChordTokens = (line, transformChord) => line.replace(/\[[^\]\n]+\]|\S+/g, (token) => (
  isAnnotationBracketToken(token) ? token : transformDelimitedChordToken(token, transformChord)
));

function transformChordContent(text, transformChord) {
  const normalizedText = normalizeLineEndings(text);

  return normalizedText
    .split('\n')
    .map((line) => {
      // Baris yang HANYA berisi anotasi ([Intro: anotasi], [Gitar: anotasi],
      // [Original Key: C]) tidak disentuh sama sekali: chord di dalam anotasi
      // adalah keterangan, bukan chord yang dimainkan.
      if (isAnnotationBracketToken(line.trim())) return line;

      if (isChordLine(line)) {
        return replaceChordTokens(line, transformChord);
      }

      const tokens = line.match(/[[^]\n]+]|\S+/g) || [];
      const chordLikeCount = tokens.filter((token) => hasLikelyChordContent(token)).length;
      if (tokens.length > 0 && chordLikeCount === tokens.length) {
        return replaceChordTokens(line, transformChord);
      }

      return line.replace(BRACKETED_CHORD_REGEX, (match, open, inner, close) => {
        if (isAnnotationBracketToken(match)) return match;
        if (!isLikelyChordSymbol(inner.trim())) return match;
        return `${open}${transformChord(inner.trim())}${close}`;
      });
    })
    .join('\n');
}

function detectSectionInfo(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;

  // Baris gabungan "Chorus: na na" / "Chorus: na na - reff": kedua sisi
  // pemisah diperiksa, supaya autoTag bisa mempertahankan sisa barisnya utuh.
  const check = (candidate) => {
    if (!candidate) return null;
    const info = detectSectionKey(candidate);
    if (!info) return null;
    const text = String(candidate).trim();
    const colonIndex = text.indexOf(':');
    const dashIndex = text.search(/\s+[-–—]\s+/);
    // "Chorus: na na" -> "na na"; "Pre Chorus - sampai" -> "sampai".
    const suffixText = colonIndex >= 0
    ? text.slice(colonIndex + 1).replace(/^\s*\[/, '').trim()
      : (dashIndex >= 0 ? text.slice(dashIndex).replace(/^\s+[-–—]\s+/, '').trim() : '');
    return { ...info, suffixText };
  };

  const direct = check(trimmed);
  if (direct) {
    // "Chorus: na na": teks kanan titik dua adalah lirik, bukan anotasi seksi.
    const colonSplit = trimmed.split(':');
    const leftSide = detectSectionKey(colonSplit[0].trim());
    return leftSide
      ? { ...leftSide, suffixText: colonSplit.slice(1).join(':').trim() }
      : direct;
  }

  if (trimmed.includes(':')) {
    const beforeColon = trimmed.split(':')[0].trim();
    const leftInfo = check(beforeColon);
    return leftInfo || null;
  }

  return null;
}

/** Deteksi seksi dari satu potongan teks (label polos). */
function detectSectionKey(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;

  // "Chorus: na na" — lirik di kanan titik dua bukan anotasi.
  const colonIdx = trimmed.indexOf(':');
  const beforeColonText = colonIdx >= 0 ? trimmed.slice(0, colonIdx) : trimmed;
  // Braket penutup dari label ("[Intro: anotasi]") bukan bagian teks sisa.
  // "Pre-Chorus (2x)" — anotasi bukan bagian label. Chord dalam kurung
  // ("(C G Am F)") bukan anotasi, jadi dibuang saja.
  const annotationMatch = beforeColonText.match(/\(([^)]*)\)/);
  const annotation = annotationMatch?.[1]?.trim() || '';
  const annotationIsChord = Boolean(annotation) && isChordProgressionText(annotation);

  // Nama seksi = teks sebelum titik dua tanpa "(...)". Tanda sambung hanya
  // memotong judul bagian bila kata sesudahnya bukan bagian nama
  // ("Pre-Chorus - sampai" tetap dua kata seksi, karena pemisahnya berada
  // SETELAH nama seksi yang utuh).
  const colonPart = trimmed.split(':')[0];
  const cleanedColonPart = colonPart
    .replace(/\[/g, ' ')
    .replace(/\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ');
  const normalizedColonPart = cleanedColonPart
    .replace(/^\s+|\s+$/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  // Bila sisi kiri sudah diawali nama seksi, tanda sambung mulai judul bagian
  // ("Bridge - Koplo" -> Bridge, "Pre Chorus - sampai" -> Pre-Chorus).
  // Nama seksi multi-kata dipertahankan utuh ("Pre Chorus").
  // Daftar seksi dibaca dari chordDisplayTags.js agar keyword yang ditambah
  // admin langsung ikut dikenali editor.
  const sectionKeywords = getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS;
  const keywordList = sectionKeywords
    .filter((keyword) => !keyword.endsWith('.'))
    .sort((a, b) => b.length - a.length)
    .map((keyword) => keyword.replace(/[-_\s]+/g, '\\s+'));
  const leadingKeyword = normalizedColonPart.match(new RegExp(`^((?:${keywordList.join('|')})(?:\\s+\\d+)?)(?:\\s|$)`));
  const rawLabel = leadingKeyword
    ? leadingKeyword[1].replace(/\s+\d+$/, '')
    : normalizedColonPart.split(/\s+[-–—]\s+/)[0];
  const normalized = rawLabel;
  if (!normalized) return null;

  // Kosakata seksi tidak ditulis ulang di sini: kanonik dari config dulu
  // (kata utuh), lalu pencocokan longgar untuk kata kunci multi-kata.
  const key = canonicalSection(normalized);
  const fallbackKey = !key && sectionKeywords.find((keyword) => (
    keyword.includes(' ') && normalized.includes(keyword.replace(/[-_]+/g, ' '))
  ));
  const resolvedKey = key || fallbackKey;

  if (!resolvedKey) return null;

  // "Verse" + nomor: nomor datang dari teks asli (bukan label tampilan).
  const isVerse = resolvedKey === 'verse';
  const verseNumber = isVerse ? (colonPart.match(/\d+/) || [])[0] : '';

  // Anotasi "(2x)" hanya relevan bila kurung LANGSUNG mengikuti nama seksi
  // ("Pre-Chorus (2x)"); pada "Chorus (na na)" kurung itu lirik.
  const nameEnd = (beforeColonText.indexOf('(') > 0
    ? beforeColonText.slice(0, beforeColonText.indexOf('('))
    : '').trim().toLowerCase();
  const annotationFollowsName = Boolean(annotation)
    && !annotationIsChord
    && !verseNumber
    && nameEnd === normalized
    // "Chorus (na na)" = lirik pertama di dalam kurung; "(2x)" = anotasi.
    && /^(?:\d+\s*x|[xX]\s*\d+|\d+x\d*|repeat.*|ulang.*|[0-9]+)$/i.test(annotation);
  const keepAnnotation = annotationFollowsName;
  const baseLabel = titleCaseKeyword(formatSectionLabel(normalized));
  const annotatedLabel = keepAnnotation ? `${baseLabel} (${annotation})` : baseLabel;

  return {
    key: resolvedKey,
    // "Post Chorus" -> "Post-Chorus", "Reff" -> "Chorus" (kanonik), dengan
    // angka urutan tetap: "Verse 2"; anotasi "(2x)" dipertahankan sedangkan
    // chord "(C G)" dibiarkan di baris aslinya.
    label: isVerse ? `Verse${verseNumber ? ` ${verseNumber}` : ''}` : annotatedLabel,
    tone: sectionToneOf(resolvedKey),
  };
}

function findNextLyricAnchor(lyricLine, preferredIndex, minimumIndex) {
  const startIndex = Math.max(0, minimumIndex, preferredIndex);
  for (let index = startIndex; index < lyricLine.length; index += 1) {
    if (/\S/.test(lyricLine[index])) return index;
  }
  return Math.max(startIndex, lyricLine.length);
}

function alignChordLineToLyric(chordLine, lyricLine) {
  const tokens = [...chordLine.matchAll(/\S+/g)].map((match) => ({
    token: match[0],
    start: match.index || 0,
  }));

  if (!tokens.length) return chordLine;

  let nextLine = '';
  let previousEnd = 0;

  tokens.forEach(({ token, start }) => {
    const targetStart = findNextLyricAnchor(lyricLine, start, previousEnd > 0 ? previousEnd + 1 : 0);
    if (nextLine.length < targetStart) {
      nextLine += ' '.repeat(targetStart - nextLine.length);
    }
    nextLine += token;
    previousEnd = nextLine.length;
  });

  return nextLine.trimEnd();
}

export function autoAlignChordLyricPairs(text) {
  const lines = normalizeLineEndings(text).split('\n');
  const nextLines = [...lines];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const chordLine = lines[index];
    const lyricLine = lines[index + 1];
    if (!isChordLine(chordLine)) continue;
    if (!lyricLine.trim() || isChordLine(lyricLine) || parseSection(lyricLine) || /^\s*[A-Za-z]+\s*:/i.test(lyricLine)) continue;
    nextLines[index] = alignChordLineToLyric(chordLine, lyricLine);
  }

  return nextLines.join('\n');
}

export function removeExtraSpacesAndBrokenLines(text) {
  const normalizedText = normalizeLineEndings(text);
  const compacted = normalizedText
    .split('\n')
    .map((line) => {
      const noTabs = line.replace(/\t+/g, ' ').replace(/\s+$/g, '');
      if (!noTabs.trim()) return '';
      return noTabs.replace(/ {2,}/g, ' ');
    })
    .join('\n')
    .replace(BLANK_LINE_REGEX, '\n\n');

  return compacted.trim();
}

export function detectSectionBadges(text) {
  return normalizeLineEndings(text)
    .split('\n')
    .map((line, index) => {
      const parsed = parseSection(line);
      const info = parsed?.type === 'structure' ? detectSectionInfo(parsed.label) : detectSectionInfo(line);
      if (!info) return null;
      return {
        lineNumber: index + 1,
        label: info.label,
        tone: info.tone,
      };
    })
    .filter(Boolean);
}

/**
 * Re-case the section word inside an existing bracket tag without discarding
 * whatever else the tag carries.
 *
 *   "Chorus 2"        -> "[Chorus 2]"
 *   "Intro: C G Am F" -> "[Intro: C G Am F]"   (chords stay)
 *   "Reff (2x)"       -> "[Chorus (2x)]"
 *   "Intro: anotasi" -> "[Intro: anotasi]"   (anotasi stays verbatim)
 */
function normalizeBracketedSectionLabel(insideLabel, info) {
  const rawInside = String(insideLabel || '').trim();
  if (!rawInside) return info.label;

  // Label dari detectSectionInfo sudah memuat anotasi "(2x)".
  const labelHasAnnotation = info.label.includes('(');

  const colonIndex = rawInside.indexOf(':');
  if (colonIndex >= 0) {
    // "Intro: C G Am F" / "[Intro: anotasi]" — chord & anotasi tetap seperti
    // aslinya. Braket penutup TIDAK ikut disalin (label hanya isi tag).
    const rest = rawInside.slice(colonIndex + 1).replace(/\]\s*$/, '');
    return `${info.label}:${rest}`;
  }

  // "Chorus 2" -> "[Chorus 2]", "Reff (2x)" -> "[Chorus (2x)]".
  const numberedMatch = rawInside.match(/[\s_-]+(\d+)$/);
  const annotation = labelHasAnnotation ? '' : rawInside.match(/\s*\([^)]*\)\s*$/)?.[0] || '';
  const numberTail = numberedMatch && !info.label.match(/\s\d+$/) && !info.label.startsWith('Verse')
    ? ` ${numberedMatch[1]}`
    : '';
  return `${info.label}${numberTail}${annotation}`;
}

/**
 * True when every token of `text` is part of a chord progression ("C G Am F",
 * "| C | G |", "(Gitar)").
 */
function isChordProgressionText(text) {
  const tokens = String(text || '').trim().match(/\S+/g) || [];
  if (!tokens.length) return false;
  return tokens.every((token) => (
    /^(\|:|:\||\[\:|:\]|\|\||\|)$/.test(token) || /^\(\d+x\)$/i.test(token) || isLikelyChordSymbol(token)
  ));
}

function normalizeSectionTagLine(line, info) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return line;

  // "[Intro: C G Am F]" / "[Intro (2x)]": isi tag memuat detail (chord,
  // anotasi). Ganti hanya KATA seksi-nya, biarkan sisa isi apa adanya.
  // Label dari detectSectionInfo sudah memuat anotasi, jadi tidak digandakan.
  const bracketedContentMatch = trimmed.match(/^\[([^\]]+)\](.*)$/);
  if (bracketedContentMatch) {
    const [, insideLabel, trailing = ''] = bracketedContentMatch;
    const suffix = trailing.trim();
    const rebuilt = normalizeBracketedSectionLabel(insideLabel, info);
    return suffix ? `[${rebuilt}] ${suffix}` : `[${rebuilt}]`;
  }

  // Bandingkan terhadap bentuk asli label, bukan label tampilan: "Post Chorus"
  // harus tetap cocok walau labelnya "Post-Chorus". Teks KANAN titik dua
  // bukan bagian nama seksi ("Chorus: na na").
  const originalLabel = String(trimmed.split(':')[0].split(/\s+[-–—]\s+/)[0].replace(/\([^)]*\)/g, '')).replace(/[\[\]]+$/, '').trim();
  const restText = (() => {
    // Sisa teks = apa pun setelah nama seksi (titik dua atau tanda sambung).
    const rest = trimmed
      .slice(originalLabel.length)
      .replace(/^\s*(?:[:]|[-–—])\s*/, '')
      // Anotasi dalam satu braket ("[Intro: anotasi]") bukan baris perform
      // terpisah: braket penutup tag dibuang.
      .replace(/\]\s*$/, '')
      .trim();
    // "Reff: C G" — chord yang hanya menempel di baris label bukan lirik;
    // membungkus seluruh baris membuat chord hilang dari baris chord.
    return rest && !isChordProgressionText(rest) ? rest : '';
  })();

  return restText ? `[${info.label}] ${restText}` : `[${info.label}]`;
}
/**
 * Tag bagian + baris perform (instrumen/cue/metadata) dengan kurung siku.
 *
 * A line is only bracketed when the parser already understands it, so ordinary
 * lyrics never get wrapped:
 *   - section labels ("Intro:", "Reff")  -> [Intro], [Chorus]
 *   - instrument labels ("Gitar:", "Keys: Stage Piano") -> [Gitar], [Keys: ...]
 *   - cue marks ("Stop", "Fill in", "Tutti") -> [Stop], [Fill in]
 *   - metadata keys ("Cue: ...", "Intensitas: 2") -> [Cue: ...]
 * Lines already tagged are normalised (label casing/spacing) instead of re-wrapped.
 */
export function autoTagSongSections(text) {
  return normalizeLineEndings(text)
    .split('\n')
    .map((line) => {
      const parsed = parseSection(line);
      if (parsed?.type && parsed.type !== 'structure') return line;
      const info = parsed?.type === 'structure' ? detectSectionInfo(parsed.label) : detectSectionInfo(line);
      if (info) return normalizeSectionTagLine(line, info);
      return tagPerformLine(line);
    })
    .join('\n');
}

/**
 * Bracket a single instrument/cue/metadata line that the parser understands.
 * Returns the line untouched when it is already tagged or not a perform line.
 */
function tagPerformLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return line;
  if (trimmed.startsWith('[')) return line;

  // Metadata keys: "Cue: Drum masuk bar 9", "Intensitas: 2" -> [Cue: ...]
  const metadataKeyMatch = trimmed.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
  if (metadataKeyMatch && isMetadataLine(trimmed)) {
    return `[${trimmed}]`;
  }

  // Preset cue without brackets: "Keys: Stage Piano | PC: 0 | CH: 1"
  const colonMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9 ]*)\s*:\s*(.+)$/);
  if (colonMatch && isInstrumentKeywordWord(colonMatch[1].trim())) {
    return `[${trimmed}]`;
  }

  // Bare instrument label: "Gitar", "Keys", "Sax & Strings"
  if (/^[A-Za-z][A-Za-z0-9 /&+()\-]*$/.test(trimmed) && isInstrumentKeywordWord(trimmed.replace(/[.,;:]+$/, '').trim())) {
    return `[${trimmed.replace(/[.,;:]+$/, '').trim()}]`;
  }

  // Cue marks: "Stop", "Fill in", "Tutti"
  if (isMetadataLine(trimmed)) {
    return `[${trimmed.replace(/[.,;:]+$/, '').trim()}]`;
  }

  return line;
}

export function standardizeChordNotation(text) {
  const normalizedText = transformChordContent(text, standardizeChordSymbol);
  return normalizeLineEndings(normalizedText)
    .split('\n')
    .map((line) => normalizeChordGridCandidate(line))
    .join('\n');
}

export function transposeLyricsText(text, steps) {
  if (!steps) return normalizeLineEndings(text);
  return transformChordContent(text, (chord) => transposeChord(standardizeChordSymbol(chord), steps));
}

/**
 * One-shot tidy-up of a pasted chart: collapse copy-paste noise, normalise
 * section tags, then standardise every chord symbol and bar grid.
 * Order matters — cleaning first avoids tag/chord detection failing on stray tabs.
 */
export function formatWholeLyricsDocument(text) {
  return standardizeChordNotation(autoTagSongSections(removeExtraSpacesAndBrokenLines(text)));
}

/**
 * Describe what Format Semua would change, so the user can confirm before the
 * document is rewritten. Returns human-readable items (empty when nothing changes).
 */
export function summariseFormatChanges(before, after) {
  const source = String(before ?? '');
  const result = String(after ?? '');
  if (source === result) return [];

  const items = [];
  const count = (text, regex) => (text.match(regex) || []).length;

  const removedHidden = count(source, /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g);
  if (removedHidden > 0) items.push(`Menghapus ${removedHidden} karakter tak terlihat`);

  const sourceTabs = count(source, /\t/g);
  if (sourceTabs > 0) items.push(`Menghapus ${sourceTabs} tab`);

  const sourceDoubleSpaces = count(source, / {2,}/g);
  const resultDoubleSpaces = count(result, / {2,}/g);
  if (sourceDoubleSpaces > resultDoubleSpaces) {
    items.push(`Merapikan ${sourceDoubleSpaces - resultDoubleSpaces} spasi ganda`);
  }

  const sourceBlankRuns = count(source, /\n{3,}/g);
  const resultBlankRuns = count(result, /\n{3,}/g);
  if (sourceBlankRuns > resultBlankRuns) {
    items.push(`Memadatkan ${sourceBlankRuns - resultBlankRuns} blok baris kosong`);
  }

  const sourceTagged = count(source, /^\s*(?:intro|verse|chorus|reff|refrain|bridge|outro|interlude|coda|pre[\s-]*chorus|post[\s-]*chorus)\b.*[:\-]\s*$/gim);
  if (sourceTagged > 0) items.push(`Menormalkan ${sourceTagged} label bagian menjadi tag [Section]`);

  const sourceChords = count(source, /\b[A-G][#b]?(?:maj|min|m|dim|aug|sus|add|M)?\d*/g);
  const resultChords = count(result, /\b[A-G][#b]?(?:maj|min|m|dim|aug|sus|add|M)?\d*/g);
  if (resultChords !== sourceChords) {
    items.push('Menyeragamkan penulisan chord');
  }

  const sourceLines = source.split('\n').length;
  const resultLines = result.split('\n').length;
  if (sourceLines !== resultLines) {
    const delta = sourceLines - resultLines;
    items.push(delta > 0 ? `Mengurangi ${delta} baris` : `Menambah ${Math.abs(delta)} baris`);
  }

  if (!items.length) items.push('Merapikan penulisan lirik dan chord');
  return items;
}

export function buildInsertNoteToken({
  note,
  keySignature = 'C',
  insertNoteFormat = 'bracket',
  insertTrailingSpace = true,
}) {
  const formattedNote = insertNoteFormat === 'number'
    ? toNumberNotation(note, keySignature)
    : note;
  const noteToken = insertNoteFormat === 'bracket' ? `[${formattedNote}]` : formattedNote;
  return insertTrailingSpace ? `${noteToken} ` : noteToken;
}

export function replaceSelectionWithToken({
  text,
  selectionStart,
  selectionEnd,
  token,
}) {
  const safeStart = Number.isInteger(selectionStart) ? selectionStart : text.length;
  const safeEnd = Number.isInteger(selectionEnd) ? selectionEnd : safeStart;
  const nextText = `${text.slice(0, safeStart)}${token}${text.slice(safeEnd)}`;
  const nextCursor = safeStart + token.length;

  return {
    nextText,
    nextCursor,
  };
}

/**
 * Insert a section label on its own line at the cursor position.
 *
 * When a selection range is provided the selected text is replaced. If the
 * selection already ended on a line break, that line break is consumed instead
 * of being left behind as a stray blank line.
 */
export function insertLineAtCursor({ text, selectionStart, selectionEnd, label }) {
  const source = String(text ?? '');
  const safeStart = Number.isInteger(selectionStart) ? selectionStart : source.length;
  const rawEnd = Number.isInteger(selectionEnd) ? selectionEnd : safeStart;
  let safeEnd = Math.max(safeStart, rawEnd);
  const hasSelection = safeEnd > safeStart;

  const beforeCursor = source.slice(0, safeStart);

  // The label always lives on its own line, so it needs a break before it unless
  // it already starts one. When the text after the insertion point begins with a
  // newline we borrow that one instead of adding a second.
  const needsLeadingBreak = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');

  // When a selection was replaced and it stopped right before a newline, consume
  // that newline too so we do not leave a stray blank line behind. This must
  // happen before we decide on the trailing break, otherwise a consumed newline
  // would be mistaken for one that is still in the text.
  if (hasSelection && source[safeEnd] === '\n') {
    safeEnd += 1;
  }

  const afterCursor = source.slice(safeEnd);
  const prefix = needsLeadingBreak ? '\n' : '';
  const suffix = afterCursor.startsWith('\n') ? '' : '\n';
  const insertion = `${prefix}${label}${suffix}`;

  const nextText = beforeCursor + insertion + afterCursor;
  const nextCursor = safeStart + insertion.length;
  return { nextText, nextCursor };
}

/**
 * Apply a text transformer to a selected range only (or the whole text when the
 * selection is empty), then hand back the cursor/selection so the editor can
 * restore the user's selection instead of collapsing it.
 */
export function applyTransformToSelection({ text, selectionStart, selectionEnd, transform }) {
  const source = String(text ?? '');
  if (typeof transform !== 'function') {
    return {
      nextText: source,
      nextSelectionStart: 0,
      nextSelectionEnd: 0,
      changed: false,
      selectionEmpty: true,
    };
  }

  const hasStart = Number.isInteger(selectionStart);
  const hasEnd = Number.isInteger(selectionEnd);
  const rangeStart = hasStart ? Math.max(0, Math.min(selectionStart, source.length)) : 0;
  const rangeEnd = hasEnd ? Math.max(rangeStart, Math.min(selectionEnd, source.length)) : source.length;

  // No usable selection: transform the whole document and leave the cursor alone.
  const selectionEmpty = !hasStart || !hasEnd || rangeEnd <= rangeStart;
  const effectiveStart = selectionEmpty ? 0 : rangeStart;
  const effectiveEnd = selectionEmpty ? source.length : rangeEnd;

  const segment = source.slice(effectiveStart, effectiveEnd);
  const transformed = transform(segment);

  if (typeof transformed !== 'string' || transformed === segment) {
    return {
      nextText: source,
      nextSelectionStart: effectiveStart,
      nextSelectionEnd: effectiveEnd,
      changed: false,
      selectionEmpty,
    };
  }

  const nextText = source.slice(0, effectiveStart) + transformed + source.slice(effectiveEnd);
  return {
    nextText,
    nextSelectionStart: effectiveStart,
    nextSelectionEnd: effectiveStart + transformed.length,
    changed: true,
    selectionEmpty,
  };
}

/**
 * Re-export: aturan perapian whitespace lirik tinggal di satu modul netral
 * (chord/lyricsWhitespace.js) agar parser & penyimpanan memakai aturan yang
 * sama tanpa siklus impor.
 */
export { trimLyricsTrailingWhitespace } from './chord/lyricsWhitespace.js';
