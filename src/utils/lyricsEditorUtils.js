import { isChordLine, parseSection, transposeChord } from "./chordUtils.js";
import { toNumberNotation } from "./notationUtils.js";

const LIKELY_CHORD_SYMBOL_REGEX = /^[A-Ga-g][#b♭♯]?(?:(?:maj|major|min|minor|m|dim|aug|sus|add|M|no|omit|\+|-)?[0-9#b♭♯+\-]*)*(?:\/[A-Ga-g][#b♭♯]?)?$/i;
const BRACKETED_CHORD_REGEX = /([\[\(\{])([^\]\)\}\n]+)([\]\)\}])/g;
const BLANK_LINE_REGEX = /\n{3,}/g;

function normalizeLineEndings(text) {
  return String(text || "").replace(/\r\n?/g, "\n");
}

function standardizeRoot(rawRoot = "") {
  if (!rawRoot) return rawRoot;
  const normalized = rawRoot.replace(/♯/g, "#").replace(/♭/g, "b");
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function normalizeChordQualitySuffix(rawSuffix = "") {
  if (!rawSuffix) return "";

  let suffix = rawSuffix.replace(/♯/g, "#").replace(/♭/g, "b").replace(/\s+/g, "");
  suffix = suffix.replace(/^major/i, "maj");
  suffix = suffix.replace(/^maj/i, "maj");
  suffix = suffix.replace(/^minor/i, "m");
  suffix = suffix.replace(/^min/i, "m");
  suffix = suffix.replace(/^M(?=\d|$)/, "maj");
  if (suffix === "-") return "m";
  return suffix;
}

function isLikelyChordSymbol(token) {
  if (typeof token !== "string") return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (/^(N\.C\.|NC|No\s*Chord)$/i.test(trimmed)) return true;
  return LIKELY_CHORD_SYMBOL_REGEX.test(trimmed);
}

export function standardizeChordSymbol(chord) {
  if (typeof chord !== "string") return chord;

  const trimmed = chord.trim();
  if (!trimmed) return chord;
  if (/^(N\.C\.|NC|No\s*Chord)$/i.test(trimmed)) return "N.C.";

  const slashParts = trimmed.split("/");
  const basePart = slashParts.shift() || "";
  const baseMatch = basePart.match(/^([A-Ga-g][#b♭♯]?)(.*)$/);
  if (!baseMatch) return chord;

  const [, root, rawSuffix = ""] = baseMatch;
  const normalizedRoot = standardizeRoot(root);
  const normalizedSuffix = normalizeChordQualitySuffix(rawSuffix);
  const normalizedBass = slashParts.length > 0
    ? `/${slashParts
        .join("/")
        .replace(/^([A-Ga-g][#b♭♯]?)(.*)$/i, (_, bassRoot, remainder = "") => `${standardizeRoot(bassRoot)}${remainder.replace(/\s+/g, "")}`)}`
    : "";

  return `${normalizedRoot}${normalizedSuffix}${normalizedBass}`;
}

function transformDelimitedChordToken(token, transformChord) {
  if (typeof token !== "string" || !token) return token;
  if (/^(\|:|:\||\[\:|:\]|\|\||\|)$/.test(token) || /^\(\d+x\)$/i.test(token)) return token;

  const wrappedMatch = token.match(/^([\[\(\{]?)(.+?)([\]\)\}]?)(\.{2,})?$/);
  if (!wrappedMatch) return token;

  const [, prefix = "", inner = "", suffix = "", trailingDots = ""] = wrappedMatch;
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
    .join("");

  return `${prefix}${nextInner}${suffix}${trailingDots}`;
}

function hasLikelyChordContent(token) {
  if (typeof token !== "string") return false;
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

function buildChordGridLine(measures, boundaryStart = "|", boundaryEnd = "|") {
  if (!Array.isArray(measures) || measures.length === 0) return "";
  return `${boundaryStart} ${measures.join(" | ")} ${boundaryEnd}`.replace(/\s+/g, " ").trim();
}

function normalizeChordMeasureText(measure) {
  return String(measure || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => transformDelimitedChordToken(token, standardizeChordSymbol))
    .join(" ");
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
    measures.push(rawMeasure ? normalizeChordMeasureText(rawMeasure) : "");
  }

  const normalizedMeasures = measures.map((measure) => measure.replace(/^\|\s*|\s*\|$/g, "").trim());
  return buildChordGridLine(normalizedMeasures, boundaryMatches[0][0], boundaryMatches[boundaryMatches.length - 1][0]);
}

function normalizeChordGridCandidate(line) {
  const leadingWhitespace = (line.match(/^\s*/) || [""])[0];
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

function transformChordContent(text, transformChord) {
  const normalizedText = normalizeLineEndings(text);

  return normalizedText
    .split("\n")
    .map((line) => {
      const section = parseSection(line);
      if (section?.type === "modulation") {
        return line.replace(/^(\s*(?:modulation|key\s+change)\s*:\s*)(.+)$/i, (_, start, chord) => `${start}${transformChord(chord.trim())}`);
      }

      if (isChordLine(line)) {
        return line.replace(/\S+/g, (token) => transformDelimitedChordToken(token, transformChord));
      }

      const tokens = line.match(/\S+/g) || [];
      const chordLikeCount = tokens.filter((token) => hasLikelyChordContent(token)).length;
      if (tokens.length > 0 && chordLikeCount === tokens.length) {
        return line.replace(/\S+/g, (token) => transformDelimitedChordToken(token, transformChord));
      }

      return line.replace(BRACKETED_CHORD_REGEX, (match, open, inner, close) => {
        if (!isLikelyChordSymbol(inner.trim())) return match;
        return `${open}${transformChord(inner.trim())}${close}`;
      });
    })
    .join("\n");
}

function detectSectionInfo(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  const numericSuffixMatch = trimmed.match(/(\d+)/);
  const suffix = numericSuffixMatch ? ` ${numericSuffixMatch[1]}` : "";
  const normalized = trimmed
    .replace(/^\[|\]$/g, "")
    .replace(/:+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

  const candidates = [
    { key: "intro", label: "Intro", tone: "intro", match: /(intro|opening)/ },
    { key: "verse", label: `Verse${suffix}`, tone: "verse", match: /(^|\s)(verse|bait)(\s|$)/ },
    { key: "pre-chorus", label: "Pre-Chorus", tone: "pre-chorus", match: /pre\s*[- ]?chorus/ },
    { key: "post-chorus", label: "Post-Chorus", tone: "post-chorus", match: /post\s*[- ]?chorus/ },
    { key: "chorus", label: "Chorus", tone: "chorus", match: /(chorus|reff|refrain)/ },
    { key: "bridge", label: "Bridge", tone: "bridge", match: /bridge/ },
    { key: "interlude", label: "Interlude", tone: "interlude", match: /(interlude|\bint\b)/ },
    { key: "solo", label: "Solo", tone: "solo", match: /solo/ },
    { key: "outro", label: "Outro", tone: "outro", match: /(outro|ending)/ },
    { key: "coda", label: "Coda", tone: "coda", match: /coda/ },
  ];

  const hit = candidates.find((candidate) => candidate.match.test(normalized));
  if (!hit) return null;

  return {
    key: hit.key,
    label: hit.label,
    tone: hit.tone,
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

  let nextLine = "";
  let previousEnd = 0;

  tokens.forEach(({ token, start }) => {
    const targetStart = findNextLyricAnchor(lyricLine, start, previousEnd > 0 ? previousEnd + 1 : 0);
    if (nextLine.length < targetStart) {
      nextLine += " ".repeat(targetStart - nextLine.length);
    }
    nextLine += token;
    previousEnd = nextLine.length;
  });

  return nextLine.trimEnd();
}

export function autoAlignChordLyricPairs(text) {
  const lines = normalizeLineEndings(text).split("\n");
  const nextLines = [...lines];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const chordLine = lines[index];
    const lyricLine = lines[index + 1];
    if (!isChordLine(chordLine)) continue;
    if (!lyricLine.trim() || isChordLine(lyricLine) || parseSection(lyricLine) || /^\s*[A-Za-z]+\s*:/i.test(lyricLine)) continue;
    nextLines[index] = alignChordLineToLyric(chordLine, lyricLine);
  }

  return nextLines.join("\n");
}

export function removeExtraSpacesAndBrokenLines(text) {
  const normalizedText = normalizeLineEndings(text);
  const compacted = normalizedText
    .split("\n")
    .map((line) => {
      const noTabs = line.replace(/\t+/g, " ").replace(/\s+$/g, "");
      if (!noTabs.trim()) return "";
      return noTabs.replace(/ {2,}/g, " ");
    })
    .join("\n")
    .replace(BLANK_LINE_REGEX, "\n\n");

  return compacted.trim();
}

export function detectSectionBadges(text) {
  return normalizeLineEndings(text)
    .split("\n")
    .map((line, index) => {
      const parsed = parseSection(line);
      const info = parsed?.type === "structure" ? detectSectionInfo(parsed.label) : detectSectionInfo(line);
      if (!info) return null;
      return {
        lineNumber: index + 1,
        label: info.label,
        tone: info.tone,
      };
    })
    .filter(Boolean);
}

export function autoTagSongSections(text) {
  return normalizeLineEndings(text)
    .split("\n")
    .map((line) => {
      const parsed = parseSection(line);
      if (parsed?.type && parsed.type !== "structure") return line;
      const info = parsed?.type === "structure" ? detectSectionInfo(parsed.label) : detectSectionInfo(line);
      if (!info) return line;
      return `[${info.label}]`;
    })
    .join("\n");
}

export function standardizeChordNotation(text) {
  const normalizedText = transformChordContent(text, standardizeChordSymbol);
  return normalizeLineEndings(normalizedText)
    .split("\n")
    .map((line) => normalizeChordGridCandidate(line))
    .join("\n");
}

export function transposeLyricsText(text, steps) {
  if (!steps) return normalizeLineEndings(text);
  return transformChordContent(text, (chord) => transposeChord(standardizeChordSymbol(chord), steps));
}

export function buildInsertNoteToken({
  note,
  keySignature = "C",
  insertNoteFormat = "bracket",
  insertTrailingSpace = true,
}) {
  const formattedNote = insertNoteFormat === "number"
    ? toNumberNotation(note, keySignature)
    : note;
  const noteToken = insertNoteFormat === "bracket" ? `[${formattedNote}]` : formattedNote;
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

/** Insert a section label on its own line at the cursor position. */
export function insertLineAtCursor({ text, selectionStart, label }) {
  const safeStart = Number.isInteger(selectionStart) ? selectionStart : text.length;
  const beforeCursor = text.slice(0, safeStart);
  const prefix = (beforeCursor.length === 0 || beforeCursor.endsWith('\n')) ? '' : '\n';
  const insertion = `${prefix}${label}\n`;
  const nextText = beforeCursor + insertion + text.slice(safeStart);
  const nextCursor = safeStart + insertion.length;
  return { nextText, nextCursor };
}
