/**
 * chordUtils.js
 *
 * Utilitas utama manipulasi & analisis chord untuk Ruang Performer.
 *
 * Bagian-bagian file (urut dari atas):
 *   1. Parsing baris & seksi  — parseLine, parseLines, parseSection, metadata
 *   2. Deteksi instrumen/cue  — extractDetectedInstrumentsFromLyrics
 *   3. Timestamp & marker     — parseTimestampToken, mergeDetectedTimestampsIntoMarkers
 *   4. Notasi chord           — isChordLine, transposeChord, chordToNumber, format jazz/simple
 *   5. Analisis lagu          — parseChordPro, getAllChords, estimateKeyFromChordUsage, dll.
 *
 * Semua daftar kata kunci (seksi, metadata, cue mark, instrumen, regex chord)
 * berasal dari src/config/chordDisplayConfig.js — jangan menyalinnya di sini.
 * Semua deteksi chord mengabaikan barline (|, ||, |:, :|) dan mendukung
 * compact chord (D..Gm..Bb).
 */
import {
  CUE_MARK_KEYWORDS,
  INSTRUMENT_KEYWORDS,
  STRUCTURE_SECTION_KEYWORDS,
  MODULATION_KEYWORDS,
  METADATA_KEYS,
  CHORD_REGEX_SOURCE,
  NO_CHORD_TOKENS,
} from '../config/chordDisplayConfig.js';

const metadataKeys = new Set(METADATA_KEYS.map((key) => key.toLowerCase()));

/**
 * Pecah baris "Label: chords" menjadi label seksi + baris chord.
 * Contoh: "Intro: Am..Em" -> ["Intro:", "Am..Em"].
 * Return null jika label bukan section valid atau sisa teks bukan baris chord
 * (agar "Intro: ku menunggu" tetap dibaca sebagai lirik).
 */
export function splitSectionLabelWithChords(line) {
  if (typeof line !== 'string') return null;
  const trimmedLine = line.trim();
  const match = trimmedLine.match(/^(\[?[A-Za-z0-9 ._-]+\]?)\s*:\s*(.+)$/);
  if (!match) return null;

  const labelToken = match[1].trim();
  const trailing = match[2].trim();
  if (!trailing) return null;

  const section = parseSection(`${labelToken}:`);
  if (!section) return null;
  if (!isChordLine(trailing)) return null;

  return [`${labelToken}:`, trailing];
}

/**
 * Pecah baris "[Label] chords" (tanpa titik dua) menjadi label seksi + baris chord.
 * Contoh: "[Intro] A# F A#-C Dm" -> ["[Intro]", "A# F A#-C Dm"].
 * Baris compound penuh bracket ("[Intro] [00:05]") ditangani splitBracketCompoundLine,
 * jadi di sini sisa teks harus ada dan harus baris chord.
 */
function splitBracketLabelWithChords(line) {
  if (typeof line !== 'string') return null;
  const trimmed = line.trim();
  const match = trimmed.match(/^(\[[^\]]+\])\s*(.+)$/);
  if (!match) return null;

  const labelToken = match[1].trim();
  const trailing = match[2].trim();
  if (!trailing) return null;

  const section = parseSection(labelToken);
  if (!section || section.type !== 'structure') return null;
  if (!isChordLine(trailing)) return null;

  return [labelToken, trailing];
}

function normalizeSectionReferenceKey(label) {
  if (typeof label !== 'string') return null;

  const normalized = label
    .toLowerCase()
    .replace(/[\[\]:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  const trimmedVariant = normalized
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*[-/]\s*.+$/, '')
    .trim();

  return trimmedVariant || normalized;
}

function getSectionReferenceKey(line) {
  const parsedSection = parseSection(line);
  if (!parsedSection || parsedSection.type !== 'structure') return null;
  return normalizeSectionReferenceKey(parsedSection.label);
}

function findNextNonEmptyLineIndex(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i += 1) {
    if (typeof lines[i] === 'string' && lines[i].trim()) return i;
  }
  return -1;
}

function shouldExpandSectionReference(lines, lineIndex, sectionKey = null) {
  const currentLine = lines[lineIndex];
  const key = sectionKey || getSectionReferenceKey(currentLine);
  if (!key) return false;

  const nextNonEmptyLineIndex = findNextNonEmptyLineIndex(lines, lineIndex + 1);
  if (nextNonEmptyLineIndex === -1) return true;

  const nextSection = parseSection(lines[nextNonEmptyLineIndex]);
  return nextSection?.type === 'structure';
}

function collectSectionBodyLines(lines, sectionStartIndex, inlineChordLine = null) {
  const bodyLines = [];
  if (inlineChordLine) bodyLines.push(inlineChordLine);

  for (let i = sectionStartIndex + 1; i < lines.length; i += 1) {
    const nextSection = parseSection(lines[i]);
    if (nextSection?.type === 'structure') break;
    bodyLines.push(lines[i]);
  }

  return bodyLines;
}

/**
 * Pecah baris yang isinya hanya beberapa bracket menjadi satu baris per tag.
 * Contoh: "[Verse 2] [Style: Pop] [Cue: Fill Bell]".
 *
 * Bracket jam ([00:05] atau [1:02:03]) TIDAK ikut dipecah: parseSection akan
 * membacanya sebagai label seksi bernama "00:05" sehingga baris kosong yang
 * tidak bisa dirender. Timestamp memang hanya berarti di ChordDisplay step
 * ekspor, jadi di sini baris dibiarkan utuh.
 */
function splitBracketCompoundLine(line) {
  if (typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (!trimmed) return null;

  const bracketChunks = trimmed.match(/\[[^\]]+\]/g);
  if (!bracketChunks || bracketChunks.length <= 1) return null;

  // Selain isi bracket tidak boleh tersisa teks: baris seperti
  // "[Intro] mainkan lambat" bukan baris compound.
  const remainingText = trimmed
    .replace(/\[[^\]]+\]/g, '')
    .trim();
  if (remainingText) return null;

  return bracketChunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => !TIMESTAMP_BRACKET_REGEX.test(chunk));
}

/** True when the whole value is exactly one known instrument keyword. */
export const isInstrumentKeywordWord = (value = '') => (
  typeof value === 'string' && INSTRUMENT_KEYWORDS.includes(value.trim().toLowerCase())
);

const instrumentKeywords = INSTRUMENT_KEYWORDS;

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Kata kunci -> regex batas kata (spasi/underscore/hyphen dianggap pemisah kata). */
const createKeywordPattern = (keyword, separator = '[\\s_-]+') => (
  new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword).replace(/\s+/g, separator)}($|[^a-z0-9])`, 'i')
);

const matchKeywordPattern = (keyword = '') => createKeywordPattern(keyword);

const matchInlineInstrumentLabel = (candidate = '') => {
  if (typeof candidate !== 'string') return false;

  const normalized = candidate.trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();

  // Singkatan instrumen ("gt", "kb", "elp") hanya cocok sebagai kata utuh.
  // Tanpa jalur ini, regex batas kata di bawah tetap cocok tapi LOLOS: ia
  // mengembalikan true hanya untuk keyword multi-kata, sehingga singkatan
  // dua huruf selalu jatuh ke false.
  if (instrumentKeywords.includes(lower)) return true;

  const fullPhraseMatch = instrumentKeywords.some((keyword) => matchKeywordPattern(keyword).test(lower));
  if (fullPhraseMatch) return true;

  const phraseWords = normalized.split(/\s+/).filter(Boolean);
  if (phraseWords.length <= 1) return false;

  return phraseWords.some((word) => {
    const cleanWord = word.replace(/[.,]/g, '').trim();
    return instrumentKeywords.includes(cleanWord.toLowerCase());
  });
};

const splitInstrumentCandidateParts = (candidate = '') => {
  if (typeof candidate !== 'string') return [];

  return String(candidate || '')
    .split(/\s*(?:,|;|\/)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const findInlineInstrumentMatch = (candidate = '') => {
  if (typeof candidate !== 'string') return false;

  const normalized = String(candidate || '').trim();
  if (!normalized) return false;

  const beforeColon = normalized.split(':', 1)[0]?.trim();
  if (beforeColon && normalized.includes(':')) {
    const remainder = normalized.slice(normalized.indexOf(':') + 1).trim();
    const beforeColonMatch = findInlineInstrumentMatch(beforeColon);
    if (beforeColonMatch) {
      if (!remainder || !/[a-z]/i.test(remainder)) return beforeColonMatch;
      if (remainder && !matchInlineInstrumentLabel(remainder)) return beforeColonMatch;
    }
  }

  const segments = splitInstrumentCandidateParts(normalized);
  if (segments.length > 1) {
    const matches = segments
      .map((segment) => findInlineInstrumentMatch(segment))
      .filter(Boolean);
    if (matches.length) return matches[0];
    return false;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const firstWord = words[0].replace(/[.,]/g, '').toLowerCase();
    const firstWordMatch = instrumentKeywords.includes(firstWord);
    if (firstWordMatch) {
      const trailingWords = words.slice(1).map((word) => word.replace(/[.,;:]/g, '').trim()).filter(Boolean);
      if (trailingWords.length) {
        return normalized.replace(/[;:]+$/g, '').trim();
      }
    }

    const containsAmpersand = normalized.includes('&');
    const hasKeywordInPhrase = words.some((word) => {
      const cleaned = word.replace(/[.,]/g, '').toLowerCase();
      return instrumentKeywords.includes(cleaned);
    });
    if (containsAmpersand && hasKeywordInPhrase) return normalized;
  }

  const lower = normalized.toLowerCase();
  for (const keyword of [...instrumentKeywords].reverse()) {
    const regex = matchKeywordPattern(keyword);
    if (!regex.test(lower)) continue;

    const directMatch = normalized.match(new RegExp(escapeRegex(keyword).replace(/\s+/g, '[\\s_-]+'), 'i'));
    if (directMatch) return directMatch[0];
  }

  const phraseWords = normalized.split(/\s+/).filter(Boolean);
  if (phraseWords.length > 1) {
    const matchedWord = phraseWords
      .map((word) => word.replace(/[.,]/g, '').trim())
      .find((word) => instrumentKeywords.includes(word.toLowerCase()));
    if (matchedWord) return matchedWord;
  }

  return false;
};

export const isCueMarkKeyword = (candidate = '') => {
  if (typeof candidate !== 'string') return false;

  const normalized = String(candidate || '').trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  const hasInstrumentInPhrase = instrumentKeywords.some((keyword) => matchKeywordPattern(keyword).test(lower));
  if (hasInstrumentInPhrase) return false;

  return CUE_MARK_KEYWORDS.some((keyword) => matchKeywordPattern(keyword).test(lower));
};

const normalizeCueMarkToken = (candidate = '') => {
  if (!isCueMarkKeyword(candidate)) return false;

  const normalized = String(candidate || '').trim();
  return normalized.replace(/[()\[\]{}]+/g, '').trim();
};

const normalizeInstrumentDisplayLabel = (label = '') => {
  const trimmed = String(label || '').trim();
  if (!trimmed) return false;

  const withoutColon = trimmed.replace(/:$/, '').trim();
  if (!withoutColon) return false;

  const value = withoutColon.startsWith('(') && withoutColon.endsWith(')')
    ? withoutColon.slice(1, -1).trim()
    : withoutColon;

  const valueWithColon = value.includes(':') ? value : null;
  if (valueWithColon) {
    const beforeColon = value.split(':')[0].trim();
    const afterColon = value.slice(value.indexOf(':') + 1).trim();
    if (beforeColon && afterColon && matchInlineInstrumentLabel(beforeColon)) {
      return `${beforeColon}: ${afterColon}`;
    }
  }

  const match = findInlineInstrumentMatch(value);
  if (match) return match;

  const prefixed = value.match(/^([A-Za-z0-9\s/&\-_]+)$/);
  if (prefixed) {
    const prefixedMatch = findInlineInstrumentMatch(prefixed[1]);
    if (prefixedMatch) return prefixedMatch;
  }

  return false;
};

const splitInlineTokens = (text = '') => {
  if (typeof text !== 'string') return [];

  const regex = /\s+|\([^)]*\)|\S+/g;
  return text.match(regex) || [];
};

const isGenericInstrumentSuffix = (value = '') => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !/[,&]/.test(trimmed);
};

const mergeInstrumentPhraseTokens = (tokens = []) => {
  if (!Array.isArray(tokens)) return [];

  const merged = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (typeof token !== 'string') {
      merged.push(token);
      continue;
    }

    const trimmed = token.trim();
    if (!trimmed || /^\s+$/.test(token)) {
      merged.push(token);
      continue;
    }

    const value = trimmed.replace(/[.,:;]+$/g, '').trim();
    if (!value || !instrumentKeywords.includes(value.toLowerCase())) {
      merged.push(token);
      continue;
    }

    if (/[;,]$/.test(trimmed)) {
      merged.push(value);
      continue;
    }

    if (/:$/.test(trimmed)) {
      merged.push(value);
      continue;
    }

    let nextIndex = index + 1;
    let mergedPhrase = value;
    let didMerge = false;

    while (nextIndex < tokens.length) {
      const nextToken = tokens[nextIndex];
      if (typeof nextToken !== 'string' || /^\s+$/.test(nextToken)) {
        nextIndex += 1;
        continue;
      }

      const nextValue = nextToken.trim();
      if (!nextValue) {
        nextIndex += 1;
        continue;
      }

      const cleanedNext = nextValue.replace(/[.,;:]+$/g, '').trim();
      if (!cleanedNext) {
        if (/[,&;:]$/.test(nextValue)) break;
        nextIndex += 1;
        continue;
      }

      // Gabungkan kata berikutnya ke label instrumen ("Gitar Dist" tetap satu
      // token). Tanpa daftar deskriptor: cukup satu kata tambahan, dan berhenti
      // di akhir frasa/kata sambung.
      if (instrumentKeywords.includes(value.toLowerCase()) && isGenericInstrumentSuffix(cleanedNext)) {
        mergedPhrase = `${mergedPhrase} ${cleanedNext}`;
        didMerge = true;
        index = nextIndex;
        if (/[,&;:]$/.test(nextValue)) break;
        nextIndex += 1;
        continue;
      }

      break;
    }

    merged.push(mergedPhrase);
    if (didMerge) {
      continue;
    }
  }

  return merged;
};

const splitParenthesizedMultiChordToken = (token = '', transpose = 0) => {
  if (typeof token !== 'string') return [];

  const trimmed = token.trim();
  if (!trimmed) return [];

  const groupMatch = trimmed.match(/^([\(\[\{])(.+?)([\)\]\}])$/);
  if (!groupMatch) return [];

  const [, opening, inner, closing] = groupMatch;
  const innerParts = inner.split(/\s+/).filter(Boolean);
  if (innerParts.length < 2) return [];

  const transposedParts = innerParts.map((part, index) => {
    const partToken = index === 0 ? `${opening}${part}` : index === innerParts.length - 1 ? `${part}${closing}` : part;
    const isChord = isChordToken(partToken) || isLeadingDashChordToken(partToken);
    if (transpose && isChord) {
      if (isLeadingDashChordToken(partToken)) {
        return { token: transposeLeadingDashChordToken(partToken, transpose), isChord: true };
      }
      return { token: transposeChordToken(partToken, transpose), isChord: true };
    }
    return { token: partToken, isChord: true };
  });

  return transposedParts.flatMap((part, index, arr) => (
    index === arr.length - 1 ? [part] : [part, { token: ' ', isSpace: true }]
  ));
};

const isInlineCueMarkToken = (token) => {
  if (typeof token !== 'string') return false;

  const trimmed = token.trim();
  if (!trimmed) return false;

  // Strip kurung biasa dan kurung siku: keyword cue mark boleh ditulis
  // "(Stop)" maupun "[Stop]" — keduanya harus terdeteksi.
  const raw = trimmed.replace(/^[\[(](.*)[\])}]$/, '$1').trim();
  if (!raw) return false;

  return normalizeCueMarkToken(raw);
};

const isInlineInstrumentToken = (token) => {
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;

  if (/^\(([^)]+)\)$/.test(trimmed)) {
    const inside = trimmed.slice(1, -1).trim();
    if (!inside) return false;
    return matchInlineInstrumentLabel(inside) ? normalizeInstrumentDisplayLabel(inside) : false;
  }

  const colonMatch = trimmed.match(/^([A-Za-z0-9\s/\-_]+):$/);
  if (colonMatch && matchInlineInstrumentLabel(colonMatch[1])) {
    return normalizeInstrumentDisplayLabel(colonMatch[1]);
  }

  const textMatch = trimmed.match(/^([A-Za-z0-9\s/\-_]+):\s*(.*)$/);
  if (textMatch && matchInlineInstrumentLabel(textMatch[1])) {
    return normalizeInstrumentDisplayLabel(textMatch[1]);
  }

  if (matchInlineInstrumentLabel(trimmed)) {
    return normalizeInstrumentDisplayLabel(trimmed);
  }

  return false;
};

function parseLine(line, transpose) {
  const trimmed = line.trim();
  if (!trimmed) return { type: 'empty' };
  if (/^Cue\s*:/i.test(trimmed)) {
    return { type: 'metadata', text: line.trim() };
  }
  // "[Gitar: Dist]" / "[Epiano: ]": label instrumen, bukan seksi. Tanpa data
  // MIDI — modul MIDI yang akan mem-parse baris ini nanti.
  const bracketedInstrument = parseBracketedInstrumentLabel(line);
  if (bracketedInstrument) {
    return { type: 'instrument', label: formatBracketedInstrumentLabel(bracketedInstrument) };
  }
  // Metadata info lagu ("Original Key:", "Time Signature:") sekarang resmi
  // metadata: dirender sebagai chip dan tidak pernah ikut ditranspose, sehingga
  // cabang lirik khusus "Original Key:" tidak diperlukan lagi.
  const section = parseSection(line);
  if (section) {
    // Transpose modulation key label
    if (section.type === 'modulation' && transpose) {
      return { type: section.type, label: transposeChord(section.label, transpose) };
    }
    return { type: section.type, label: section.label };
  }
  if (isInstrumentPatchLikeLine(line)) {
    return { type: 'metadata', text: line.trim() };
  }
  if (isMetadataLine(line)) {
    return { type: 'metadata', text: line.trim() };
  }
  if (isChordLine(line)) {
    return {
      type: 'chord',
      tokens: mergeInstrumentPhraseTokens(splitInlineTokens(line)).flatMap(token => {
        if (/^\s+$/.test(token)) return [{ token, isSpace: true }];
        if (/^(\|:|:\||\[\:|\:\]|\|\||\|)$/.test(token)) return [{ token, isBarline: true }];
        const inlineCueMark = isInlineCueMarkToken(token);
        if (inlineCueMark) return [{ token: inlineCueMark, isCueMark: true }];
        const inlineInstrumentLabel = isInlineInstrumentToken(token);
        if (inlineInstrumentLabel) return [{ token: inlineInstrumentLabel, isInstrument: true }];

        const expandedParenthesizedGroup = splitParenthesizedMultiChordToken(token, transpose);
        if (expandedParenthesizedGroup.length) return expandedParenthesizedGroup;

        if (isChordToken(token)) {
          return [{ token: transpose ? transposeChordToken(token, transpose) : token, isChord: true }];
        }
        if (isLeadingDashChordToken(token)) {
          return [{ token: transpose ? transposeLeadingDashChordToken(token, transpose) : token, isChord: true }];
        }
        if (token.includes('..') || token.includes('-')) {
          return [{ token: transposeCompactChordToken(token, transpose), isChord: true }];
        }
        return [{ token, isChord: true }];
      })
    };
  }
  if (parseNumberLine(line)) {
    return {
      type: 'number',
      tokens: line.split(/(\s+)/).map((token) => (
        /^\s+$/.test(token)
          ? { token, isSpace: true }
          : { token, isNumber: true }
      )),
    };
  }
  return {
    type: 'lyrics',
    tokens: mergeInstrumentPhraseTokens(splitInlineTokens(line)).flatMap(token => {
      if (/^\s+$/.test(token)) return [{ token, isSpace: true }];
      const inlineCueMark = isInlineCueMarkToken(token);
      if (inlineCueMark) return [{ token: inlineCueMark, isCueMark: true }];
      const inlineInstrumentLabel = isInlineInstrumentToken(token);
      if (inlineInstrumentLabel) return [{ token: inlineInstrumentLabel, isInstrument: true }];

      const expandedParenthesizedGroup = splitParenthesizedMultiChordToken(token, transpose);
      if (expandedParenthesizedGroup.length) return expandedParenthesizedGroup;

      if (isChordToken(token)) return [{ token: transpose ? transposeChordToken(token, transpose) : token, isChord: true }];
      if (isLeadingDashChordToken(token)) return [{ token: transpose ? transposeLeadingDashChordToken(token, transpose) : token, isChord: true }];
      if (isNumberNotationToken(token) || /^\.{2,}$/.test(token)) return [{ token, isNumber: true }];
      return [{ token }];
    })
  };
}

export function parseLines(lines, transpose) {
  const parsed = [];
  const sectionBodies = new Map();
  const sectionLabels = new Map();

  /**
   * Attach the 1-based source line a row came from.
   *
   * parseLines does not emit one row per input line: it splits compound lines
   * and expands repeated section references, so a 10-line lyric can render as 13
   * rows. Without this tag there is no way to map a rendered row back to the
   * line the caret is on, which is what the editor/preview sync needs.
   * `isExpandedFromSection` marks rows that were copied out of an earlier
   * section rather than typed at that position.
   */
  const pushRow = (row, sourceLine, isExpandedFromSection = false) => {
    if (!row) return;
    parsed.push({ ...row, sourceLine, isExpandedFromSection });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sourceLine = index + 1;
    const bracketChunks = splitBracketCompoundLine(line);
    if (bracketChunks && bracketChunks.length > 1) {
      bracketChunks.forEach((chunk) => {
        pushRow(parseLine(chunk, transpose), sourceLine);
      });
      continue;
    }

    const sectionChunks = splitSectionLabelWithChords(line)
      || splitBracketLabelWithChords(line);
    const sectionKey = getSectionReferenceKey(line);
    const section = parseSection(line);
    // Reuse the already computed splits instead of re-scanning the line four
    // times per row (parseLines runs on every keystroke through ChordDisplay).
    const isStandaloneStructureTag = Boolean(
      section?.type === 'structure' &&
      !sectionChunks &&
      !bracketChunks
    );
    // A standalone tag repeats the stored body when it is followed by another
    // section (or EOF), e.g. "Chorus:" after a full Chorus block. The row also
    // carries isRepeatedReference so the renderer can style it as a jump.
    const canExpandReference =
      Boolean(sectionKey) &&
      isStandaloneStructureTag &&
      sectionBodies.has(sectionKey) &&
      shouldExpandSectionReference(lines, index, sectionKey);

    if (canExpandReference) {
      const repeatedSectionLine = parseLine(line, transpose);
      if (repeatedSectionLine?.type === 'structure') {
        repeatedSectionLine.isRepeatedReference = true;
      }
      pushRow(repeatedSectionLine, sourceLine);
      const storedSectionBody = sectionBodies.get(sectionKey) || [];
      storedSectionBody.forEach((sectionLine) => {
        // These rows were copied out of an earlier section, so they do not sit
        // at the reference's own line number. Tagging them lets the editor
        // highlight only rows that genuinely belong to the caret's line.
        pushRow(parseLine(sectionLine, transpose), sourceLine, true);
      });
      continue;
    }

    if (sectionChunks) {
      sectionChunks.forEach((chunk) => {
        pushRow(parseLine(chunk, transpose), sourceLine);
      });
    } else {
      pushRow(parseLine(line, transpose), sourceLine);
    }

    if (sectionKey) {
      const sectionLabel = section?.label || null;
      if (sectionLabel) {
        sectionLabels.set(sectionKey, sectionLabel);
      }

      const inlineChordLine = sectionChunks?.[1] || null;
      const candidateBody = collectSectionBodyLines(lines, index, inlineChordLine);
      const hasRenderableContent = candidateBody.some((bodyLine) => {
        if (typeof bodyLine !== 'string') return false;
        return bodyLine.trim() !== '';
      });

      if (hasRenderableContent) {
        sectionBodies.set(sectionKey, candidateBody);
      }
    }
  }

  return parsed;
}

/**
 * Keyword instrumen untuk deteksi instrumen (panel instrumen, "instrumen per
 * seksi"). Cue mark sengaja dibuang: aksi permainan seperti "Stop" atau "Aksen"
 * bukan alat, jadi tidak boleh terbaca sebagai instrumen.
 */
const REAL_INSTRUMENT_KEYWORDS = instrumentKeywords.filter(
  (keyword) => !CUE_MARK_KEYWORDS.includes(keyword),
);

function normalizeDetectedInstrumentName(candidate = '') {
  if (typeof candidate !== 'string') return '';

  const raw = candidate.trim();
  if (!raw) return '';

  const cleaned = raw
    .replace(/^[\(\[\{]+|[\)\]\}]+$/g, '')
    .trim();

  if (!cleaned) return '';

  const beforeColon = cleaned.split(':')[0]?.trim();
  if (beforeColon && beforeColon !== cleaned && matchInlineInstrumentLabel(beforeColon)) {
    return beforeColon;
  }

  const segments = cleaned
    .split(/[,&]/)
    .map((segment) => segment.replace(/:.*$/, '').trim())
    .filter(Boolean);

  const matches = segments
    .map((segment) => {
      const directMatch = findInlineInstrumentMatch(segment);
      if (directMatch) return directMatch;

      const lower = segment.toLowerCase();
      const keywordMatch = REAL_INSTRUMENT_KEYWORDS.find((keyword) => matchKeywordPattern(keyword).test(lower));
      if (!keywordMatch) return '';

      const directKeywordMatch = segment.match(new RegExp(escapeRegex(keywordMatch).replace(/\s+/g, '[\\s_-]+'), 'i'));
      return directKeywordMatch ? directKeywordMatch[0] : keywordMatch;
    })
    .map((value) => value.trim())
    .filter(Boolean);

  if (matches.length) {
    return matches[0];
  }

  const fallback = REAL_INSTRUMENT_KEYWORDS.find((keyword) => matchKeywordPattern(keyword).test(cleaned.toLowerCase()));

  return fallback || '';
}

export function extractDetectedInstrumentsFromLyrics(lyricsText) {
  if (typeof lyricsText !== 'string' || !lyricsText.trim()) return [];

  const parsedLines = parseLines(lyricsText.split(/\r?\n/), 0);
  const detected = [];
  const seen = new Set();

  const addCandidate = (candidate = '') => {
    const normalized = normalizeDetectedInstrumentName(candidate);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    detected.push(normalized);
  };

  const scanTextCandidates = (text = '') => {
    if (typeof text !== 'string' || !text.trim()) return;

    const segments = text
      .split(/\s*(?:,|;|\/)\s*/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    segments.forEach((segment) => {
      const directMatch = findInlineInstrumentMatch(segment);
      if (directMatch) {
        addCandidate(directMatch);
        return;
      }

      const words = segment.split(/\s+/).filter(Boolean);
      words.forEach((word) => {
        if (matchInlineInstrumentLabel(word)) {
          addCandidate(word);
        }
      });
    });
  };

  const getDetectedInstrumentFromTokens = (tokens = []) => {
    const merged = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (!token || !token.isInstrument || typeof token.token !== 'string') {
        continue;
      }

      const keyword = token.token.trim();
      const directMatch = findInlineInstrumentMatch(keyword);
      if (directMatch) {
        merged.push(directMatch);
        continue;
      }

      if (!keyword || !instrumentKeywords.includes(keyword.toLowerCase())) {
        continue;
      }

      let suffixParts = [];
      for (let nextIndex = index + 1; nextIndex < tokens.length; nextIndex += 1) {
        const nextToken = tokens[nextIndex];
        if (!nextToken || typeof nextToken.token !== 'string') continue;

        const nextValue = nextToken.token.trim();
        if (!nextValue || /^\s+$/.test(nextToken.token)) continue;
        if (/^[\(\)]$/.test(nextValue)) continue;

        const candidate = nextValue.replace(/[.,;:]+$/g, '').trim();
        if (!candidate) {
          if (/[,&;:]$/.test(nextValue)) break;
          continue;
        }
        if (isCueMarkKeyword(candidate)) break;
        if (matchInlineInstrumentLabel(candidate)) break;

        suffixParts.push(candidate);
        if (/[,&;:]$/.test(nextValue)) break;
      }

      if (suffixParts.length) {
        merged.push(`${keyword} ${suffixParts.join(' ')}`);
        continue;
      }

      merged.push(keyword);
    }

    return merged;
  };

  parsedLines.forEach((lineObj) => {
    if (lineObj?.type === 'structure' && typeof lineObj?.label === 'string') {
      scanTextCandidates(lineObj.label);
    }

    if (Array.isArray(lineObj?.tokens)) {
      getDetectedInstrumentFromTokens(lineObj.tokens).forEach((candidate) => addCandidate(candidate));
    }

    if (lineObj?.type === 'metadata' && typeof lineObj?.text === 'string') {
      const metadataText = lineObj.text.trim();
      const metadataCandidates = [metadataText, metadataText.replace(/^.*?:\s*/, ''), metadataText.replace(/^.*?\s+/, '')];
      metadataCandidates.forEach((value) => {
        if (!value) return;
        const match = findInlineInstrumentMatch(value);
        if (match) addCandidate(match);
      });
    }
  });

  return detected;
}

/**
 * Helper: parse [mm:ss] or [hh:mm:ss] timestamp to seconds
 * @param {string} token - Token timestamp (misal: [01:23] atau [1:02:03])
 * @returns {number|null} detik, atau null jika tidak cocok
 */
export function parseTimestampToken(token) {
  if (typeof token !== 'string') return null;

  const m = token.match(/^\[(\d{1,2}):(\d{2})\]$/); // [mm:ss]
  if (m) {
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  const h = token.match(/^\[(\d{1,2}):(\d{2}):(\d{2})\]$/); // [hh:mm:ss]
  if (h) {
    return parseInt(h[1], 10) * 3600 + parseInt(h[2], 10) * 60 + parseInt(h[3], 10);
  }
  return null;
}

/** Fresh regex per call: a shared /g literal keeps lastIndex between calls. */
const createTimestampRegex = () => /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

function formatMarkerTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;

  if (hh > 0) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

function normalizeMarkerTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
      return parseTimestampToken(`[${trimmed}]`);
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.floor(numeric));
    }
  }

  return null;
}

/**
 * Ekstrak semua timestamp [mm:ss] / [hh:mm:ss] dari teks lirik/chord.
 * Return unik, terurut naik (dalam detik).
 */
export function extractTimestampSeconds(text) {
  if (typeof text !== 'string' || !text.trim()) return [];

  const found = new Set();
  const timestampRegex = createTimestampRegex();

  let match;
  while ((match = timestampRegex.exec(text)) !== null) {
    const token = `[${match[1]}:${match[2]}${match[3] ? `:${match[3]}` : ''}]`;
    const seconds = parseTimestampToken(token);
    if (seconds !== null) {
      found.add(seconds);
    }
  }

  return Array.from(found).sort((a, b) => a - b);
}

/**
 * Cari label struktur yang tepat bersebelahan dengan timestamp.
 */
function resolveTimestampLabelsFromLyrics(lyricsText) {
  const lines = typeof lyricsText === 'string' ? lyricsText.split(/\r?\n/) : [];
  const labelByTime = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = String(line || '').trim();
    if (!trimmed) continue;

    const lineTimes = Array.from(trimmed.matchAll(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g))
      .map((match) => parseTimestampToken(`[${match[1]}:${match[2]}${match[3] ? `:${match[3]}` : ''}]`))
      .filter((time) => time !== null);

    if (lineTimes.length === 0) continue;

    const previousSection = parseSection(lines[index - 1]);
    const nextSection = parseSection(lines[index + 1]);
    const adjacentSectionLabel = (nextSection?.type === 'structure' && nextSection.label)
      || (previousSection?.type === 'structure' && previousSection.label)
      || null;

    lineTimes.forEach((time) => {
      if (adjacentSectionLabel) {
        labelByTime.set(time, adjacentSectionLabel);
      }
    });
  }

  return labelByTime;
}

/**
 * Gabungkan marker existing dengan timestamp yang terdeteksi di lirik/chord.
 * Marker existing dipertahankan, timestamp baru ditambahkan jika belum ada.
 */
export function mergeDetectedTimestampsIntoMarkers(lyricsText, existingMarkers = []) {
  const normalizedExisting = Array.isArray(existingMarkers)
    ? existingMarkers
        .map((marker) => {
          const normalizedTime = normalizeMarkerTime(marker?.time);
          if (normalizedTime === null) return null;

          return {
            ...(marker || {}),
            time: normalizedTime,
          };
        })
        .filter(Boolean)
    : [];

  const seenTimes = new Set(normalizedExisting.map((marker) => marker.time));
  const detectedTimes = extractTimestampSeconds(lyricsText);
  const labelsByTime = resolveTimestampLabelsFromLyrics(lyricsText);

  const appended = detectedTimes
    .filter((time) => !seenTimes.has(time))
    .map((time) => ({
      time,
      label: labelsByTime.get(time) || `Timestamp ${formatMarkerTime(time)}`,
    }));

  return [...normalizedExisting, ...appended].sort((a, b) => a.time - b.time);
}

/** Bracket jam [mm:ss] / [hh:mm:ss] — bukan label seksi, bukan metadata. */
const TIMESTAMP_BRACKET_REGEX = /^\[\d{1,2}:\d{2}(?::\d{2})?\]$/;

// Global regex untuk deteksi chord (standar, konsisten di semua fungsi)
// Sumber regex: src/config/chordDisplayConfig.js (CHORD_REGEX_SOURCE)
const CHORD_REGEX = new RegExp(CHORD_REGEX_SOURCE, 'i');
const NO_CHORD_REGEX = new RegExp(
  `^(${NO_CHORD_TOKENS.map((token) => escapeRegex(token).replace(/\s+/g, '\\s*')).join('|')})$`,
  'i',
);

/**
 * Validasi apakah sebuah token adalah No Chord (N.C.).
 * @param {string} token - Token (misal: N.C., NC, No Chord)
 * @returns {boolean}
 */
const isNoChordToken = (token) => {
  if (typeof token !== 'string') return false;
  return NO_CHORD_REGEX.test(token.trim());
};

/**
 * Validasi apakah sebuah token adalah chord valid.
 * @param {string} chord - Token chord (misal: Am, F#m7, Bbmaj7, G/B)
 * @returns {boolean}
 */
export function isValidChord(chord) {
  if (typeof chord !== 'string') return false;
  return CHORD_REGEX.test(chord.trim());
}


/**
 * Deteksi apakah sebuah baris adalah baris not angka (misal: 7534, 5317, dst)
 * Mengabaikan barline (|, ||, |:, :|, dst) dan token kosong.
 * Contoh baris yang terdeteksi:
 *   |: 7534 | .... | 5317 | .... :|
 *   1 2 3 4 5 6 7
 *   7. 6' 5 4
 *
 * Return: true jika mayoritas token adalah not angka (1-7, boleh ada titik/garis/aksen)
 */
function isNumberNotationToken(token) {
  if (typeof token !== 'string') return false;
  const cleaned = token.trim();
  if (!cleaned) return false;

  const normalized = cleaned
    .replace(/^[\(\[]+/, '')
    .replace(/[\)\]]+$/g, '')
    .replace(/[’]/g, '\'');

  if (!normalized) return false;

  const numRegex = /^[1-7](?:[.']+)?$/;
  const dotRegex = /^\.{1,}$/;
  return numRegex.test(normalized) || dotRegex.test(normalized);
}

export function parseNumberLine(line) {
  // Hilangkan barline di awal/akhir/token
  const cleaned = line
    .replace(/\|:|:\||\[\:|\:\]|\|\||\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return false;
  // Tokenisasi per spasi
  let tokens = cleaned.split(/\s+/);
  if (!tokens.length) return false;
  // Hilangkan token pengulangan (2x, 3x, dst) saja
  tokens = tokens.filter(t => !/^\d+x$/i.test(t));
  if (!tokens.length) return false;

  const validCount = tokens.filter((t) => isNumberNotationToken(t) || /^\.{2,}$/.test(t)).length;
  return validCount > 0 && validCount >= tokens.length / 2;
}

/**
 * Sejajarkan posisi barline (|, ||, |:, :|) pada teks multiline.
 * Dipakai di mode edit lirik untuk merapikan teks chord yang dipilih.
 *
 * @param {string} text - Potongan teks yang dipilih
 * @returns {string}
 */
export function alignSelectedBarlines(text) {
  if (typeof text !== 'string' || !text) return text;

  const barlineRegex = /(\|:|:\||\|\||\|)/g;
  const hasBarline = (line) => /(\|:|:\||\|\||\|)/.test(line);
  const normalizeBarSpacing = (line) => {
    if (!hasBarline(line)) return line;

    return line
      // Pastikan ada spasi sebelum barline jika didahului chord/teks.
      .replace(/([^\s|])(\|:|:\||\|\||\|)/g, '$1 $2')
      // Pastikan ada spasi setelah barline jika diikuti chord/teks.
      .replace(/(\|:|:\||\|\||\|)([^\s|])/g, '$1 $2')
      // Rapikan spasi berlebih di sekitar barline menjadi satu spasi.
      .replace(/[ \t]+(\|:|:\||\|\||\|)/g, ' $1')
      .replace(/(\|:|:\||\|\||\|)[ \t]+/g, '$1 ')
      .trimEnd();
  };

  const lines = text.split(/\r?\n/).map(normalizeBarSpacing);
  const linesWithBars = lines.filter(line => hasBarline(line));

  if (linesWithBars.length < 2) return text;

  const parseBarStructure = (line) => {
    if (!hasBarline(line)) return null;

    const matches = [];
    barlineRegex.lastIndex = 0;
    let match;
    while ((match = barlineRegex.exec(line)) !== null) {
      matches.push({
        token: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    if (matches.length < 2) return null;

    const measures = [];
    for (let i = 0; i < matches.length - 1; i += 1) {
      const rawMeasure = line.slice(matches[i].end, matches[i + 1].start);
      measures.push(rawMeasure.replace(/\s+/g, ' ').trim());
    }

    return {
      prefix: line.slice(0, matches[0].start).replace(/[ \t]+$/, ''),
      suffix: line.slice(matches[matches.length - 1].end).replace(/^[ \t]+/, ''),
      boundaries: matches.map((item) => item.token),
      measures,
    };
  };

  const structuredLines = lines.map(parseBarStructure);
  const validStructuredLines = structuredLines.filter(Boolean);
  if (validStructuredLines.length < 2) return text;

  const maxMeasureCount = Math.max(...validStructuredLines.map((line) => line.measures.length), 0);
  if (maxMeasureCount === 0) return text;

  const measureWidths = Array.from({ length: maxMeasureCount }, (_, idx) => {
    let maxWidth = 0;
    for (const line of validStructuredLines) {
      if (typeof line.measures[idx] === 'string') {
        maxWidth = Math.max(maxWidth, line.measures[idx].length);
      }
    }
    return maxWidth;
  });

  const alignedLines = structuredLines.map((structure, idx) => {
    if (!structure) return lines[idx];

    const { prefix, suffix, boundaries, measures } = structure;
    if (!measures.length) return lines[idx];

    let rebuilt = '';
    if (prefix) {
      rebuilt += `${prefix} `;
    }

    rebuilt += boundaries[0] || '|';

    for (let measureIdx = 0; measureIdx < measures.length; measureIdx += 1) {
      const content = measures[measureIdx];
      const width = measureWidths[measureIdx] ?? content.length;
      const paddedContent = content.padEnd(width, ' ');
      const rightBoundary = boundaries[measureIdx + 1] || '|';
      rebuilt += ` ${paddedContent} ${rightBoundary}`;
    }

    if (suffix) {
      rebuilt += ` ${suffix}`;
    }

    return rebuilt.trimEnd();
  });

  return alignedLines.join('\n');
}

/**
 * Pecah baris chord berdasarkan jumlah bar per baris.
 * Cocok untuk rapikan chart menjadi 4 bar per baris.
 *
 * @param {string} text - Teks multiline yang dipilih
 * @param {number} barsPerLine - Jumlah bar per baris
 * @returns {string}
 */
export function wrapBarsPerLine(text, barsPerLine = 4) {
  if (typeof text !== 'string' || !text) return text;

  const normalizedBarsPerLine = Math.max(1, Number(barsPerLine) || 4);
  const barlineRegex = /(\|:|:\||\|\||\|)/g;
  const isBarToken = (token) => /^(\|:|:\||\|\||\|)$/.test(token);
  const hasBarline = (line) => /(\|:|:\||\|\||\|)/.test(line);

  const normalizeBarSpacing = (line) => {
    if (!hasBarline(line)) return line;
    return line
      .replace(/([^\s|])(\|:|:\||\|\||\|)/g, '$1 $2')
      .replace(/(\|:|:\||\|\||\|)([^\s|])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const wrapped = text.split(/\r?\n/).flatMap((line) => {
    const normalized = normalizeBarSpacing(line);
    if (!hasBarline(normalized)) return [line];

    barlineRegex.lastIndex = 0;
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const barIndexes = [];
    tokens.forEach((token, idx) => {
      if (isBarToken(token)) barIndexes.push(idx);
    });

    if (barIndexes.length < 2) return [normalized];

    const firstBar = barIndexes[0];
    const lastBar = barIndexes[barIndexes.length - 1];
    const prefix = tokens.slice(0, firstBar).join(' ');
    const suffix = tokens.slice(lastBar + 1).join(' ');

    const boundaries = barIndexes.map((idx) => tokens[idx]);
    const measures = [];
    for (let i = 0; i < barIndexes.length - 1; i += 1) {
      const start = barIndexes[i];
      const end = barIndexes[i + 1];
      const contentTokens = tokens.slice(start + 1, end);
      measures.push(contentTokens.join(' ').trim());
    }

    if (!measures.length) return [normalized];

    const chunks = [];
    for (let i = 0; i < measures.length; i += normalizedBarsPerLine) {
      const endIdx = Math.min(i + normalizedBarsPerLine - 1, measures.length - 1);
      const lineParts = [boundaries[i]];

      for (let m = i; m <= endIdx; m += 1) {
        if (measures[m]) {
          lineParts.push(measures[m]);
        }
        lineParts.push(boundaries[m + 1]);
      }

      chunks.push(lineParts.join(' ').replace(/\s+/g, ' ').trim());
    }

    if (prefix) {
      chunks[0] = `${prefix} ${chunks[0]}`.trim();
    }
    if (suffix) {
      const lastIdx = chunks.length - 1;
      chunks[lastIdx] = `${chunks[lastIdx]} ${suffix}`.trim();
    }

    return chunks;
  });

  return wrapped.join('\n');
}

/**
 * Kata kunci struktur -> regex batas kata. Di-cache: parseSection dipanggil
 * beberapa kali per baris dan regex ini sebelumnya dibangun ulang tiap kali.
 */
const STRUCTURE_KEYWORD_PATTERNS = STRUCTURE_SECTION_KEYWORDS.map((keyword) => ({
  keyword,
  pattern: createKeywordPattern(keyword),
}));

const MODULATION_LINE_REGEX = new RegExp(
  `^(?:${MODULATION_KEYWORDS.map((keyword) => escapeRegex(keyword).replace(/\s+/g, '\\s+')).join('|')})\\s*:\\s*(.+)$`,
  'i',
);

/**
 * "[Gitar: Dist]" / "[Epiano: ]" / "[Keys: EP Soft | CH: 2]"
 * -> { instrument: 'Gitar', detail: 'Dist' }. Return false bila bukan instrumen.
 *
 * Hanya untuk TAMPILAN: tidak ada data MIDI yang dihasilkan di sini. Modul MIDI
 * membaca teks lirik sendiri saat ia aktif.
 */
const parseBracketedInstrumentLabel = (line) => {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return false;

  const inside = trimmed.slice(1, -1).trim();
  if (!inside) return false;

  const idx = inside.indexOf(':');
  if (idx <= 0) return false;

  const rawLabel = inside.slice(0, idx).trim();
  if (!rawLabel || /\|/.test(rawLabel)) return false;

  // Label harus nama instrumen yang dikenal. Ini sekaligus menolak
  // "[Chorus: ...]", "[Intro: ...]", "[Verse: ...]".
  if (!matchInlineInstrumentLabel(rawLabel)) return false;

  const firstOption = inside.slice(idx + 1).split('|')[0].trim();
  const instrument = normalizeInstrumentDisplayLabel(rawLabel);
  if (!instrument) return false;

  return {
    instrument,
    detail: firstOption,
  };
};

/** Label untuk baris ber-instrumen: "Gitar: Dist" / "Epiano". */
const formatBracketedInstrumentLabel = (bracketed) => (
  bracketed.detail ? `${bracketed.instrument}: ${bracketed.detail}` : bracketed.instrument
);

/** Label instrumen di kiri titik dua sebuah baris bracket ("[Gitar: Dist]"). */
const getBracketLineLabel = (line) => {
  if (typeof line !== 'string') return '';
  const trimmed = line.trim();
  if (!trimmed.startsWith('[')) return '';
  const idx = trimmed.indexOf(':');
  if (idx <= 0) return '';
  return trimmed.slice(1, idx).trim();
};

const isInstrumentBracketLine = (line) => {
  const label = getBracketLineLabel(line);
  return Boolean(label) && matchInlineInstrumentLabel(label);
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
const isInstrumentPatchLikeLine = (line) => {
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
/**
 * Chord Utilities - Professional Implementation
 * Transposition, ChordPro parsing, and chord analysis
 */

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Token chord yang dibungkus bracket/parentheses dan boleh berakhiran titik durasi. */
const WRAPPED_TOKEN_REGEX = /^([\(\[\{]?)(.+?)([\)\]\}]?)(\.{2,})?$/;

// Regex untuk mendeteksi chord (termasuk leading dash untuk passing chord dan trailing dots untuk durasi)
// Support: Am, Gm-Gm, F..D#-D#, Dm..D#..F.., Am...., (Am), [C], Amadd9
const CHORD_REGEX_GLOBAL = /[\(\[\{]?-?([A-G][#b]?(?:maj|min|dim|aug|sus|add|m)*(?:\d+)?(?:[#b]\d+)*(?:\/[A-G][#b]?)?)(((\.{2,}|-)([A-G][#b]?(?:maj|min|dim|aug|sus|add|m)*(?:\d+)?(?:[#b]\d+)*(?:\/[A-G][#b]?)?))*)(\.{2,})?[\)\]\}]?/g;

const normalizeChordToken = (token) => {
  if (typeof token !== 'string') return token;
  return token
    .trim()
    .replace(/^[\(\[\{]+/, '')
    .replace(/\.+$/, '')
    .replace(/[\)\]\}]+$/, '');
};

const isChordToken = (token) => {
  if (typeof token !== 'string') return false;
  if (isNoChordToken(token)) return true;
  const normalized = normalizeChordToken(token);
  return CHORD_REGEX.test(normalized);
};

const isLeadingDashChordToken = (token) => {
  if (typeof token !== 'string' || !token.startsWith('-')) return false;
  return CHORD_REGEX.test(token.slice(1).trim());
};

const transposeChordToken = (token, steps) => {
  if (!token || steps === 0) return token;
  if (isNoChordToken(token)) return token;
  const match = token.match(WRAPPED_TOKEN_REGEX);
  if (!match) return token;

  const [, prefix = '', inner, suffix = '', dots = ''] = match;
  const normalized = normalizeChordToken(inner);
  if (!CHORD_REGEX.test(normalized)) return token;

  return `${prefix}${transposeChord(normalized, steps)}${suffix}${dots || ''}`;
};

const transposeLeadingDashChordToken = (token, steps) => {
  if (!token || steps === 0 || !token.startsWith('-')) return token;
  const chordToken = token.slice(1).trim();
  if (!CHORD_REGEX.test(chordToken)) return token;
  return `-${transposeChord(chordToken, steps)}`;
};

const transposeCompactChordToken = (token, steps) => {
  if (!token || (!token.includes('..') && !token.includes('-'))) return token;
  if (isNoChordToken(token)) return token;

  const parts = token.split(/(\.{2,}|-)/);
  let hasChordPart = false;

  const transposedParts = parts.map((part) => {
    if (!part || /^\.{2,}$/.test(part) || part === '-') return part;
    if (!isChordToken(part)) return part;
    hasChordPart = true;
    return steps ? transposeChordToken(part, steps) : part;
  });

  return hasChordPart ? transposedParts.join('') : token;
};

const transposeNote = (note, steps) => {
  if (!note || steps === 0) return note;
  const useFlat = note.includes('b');
  const noteArray = useFlat ? NOTES_FLAT : NOTES_SHARP;

  let index = noteArray.indexOf(note);
  if (index === -1) {
    const altArray = useFlat ? NOTES_SHARP : NOTES_FLAT;
    index = altArray.indexOf(note);
    if (index === -1) return note;
  }

  let newIndex = (index + steps) % 12;
  if (newIndex < 0) newIndex += 12;
  return noteArray[newIndex];
};

export const transposeChord = (chord, steps) => {
  if (!chord || steps === 0) return chord;

  const chordRegex = /^([A-G][#b]?)(.*)$/;
  const match = chord.match(chordRegex);
  if (!match) return chord;

  const [, root, suffix] = match;
  const qualityAndBass = suffix || '';
  const slashIndex = qualityAndBass.indexOf('/');
  const quality = slashIndex === -1 ? qualityAndBass : qualityAndBass.slice(0, slashIndex);
  const bass = slashIndex === -1 ? '' : qualityAndBass.slice(slashIndex + 1);

  const transposedRoot = transposeNote(root, steps);
  if (!bass) {
    return `${transposedRoot}${quality}`;
  }

  const bassMatch = bass.match(/^([A-G][#b]?)(.*)$/);
  const transposedBass = bassMatch
    ? `/${transposeNote(bassMatch[1], steps)}${bassMatch[2]}`
    : `/${bass}`;

  return `${transposedRoot}${quality}${transposedBass}`;
};

// Get semitone index for a root note using sharp scale, accepting flats
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

export const getNoteIndex = (root) => {
  if (!root) return null;
  const r = root.trim();
  const idx = NOTES_SHARP.indexOf(r);
  if (idx !== -1) return idx;

  // Map flats to sharps
  const sharpIdx = NOTES_SHARP.indexOf(FLAT_TO_SHARP[r] || r);
  return sharpIdx === -1 ? null : sharpIdx;
};

// Helper to extract root note from key string (e.g., 'Am' -> 'A', 'G#m' -> 'G#')
const extractRoot = (key) => {
  if (!key) return null;
  const m = key.match(/^([A-G][#b]?)/);
  return m ? m[1] : null;
};

// Helper map untuk degree notasi angka
const MAJOR_SCALE_DEGREES = {
  0: '1',
  2: '2',
  4: '3',
  5: '4',
  7: '5',
  9: '6',
  11: '7',
};
const MAJOR_SCALE_ALTERNATE = {
  1: '#1/b2',
  3: 'b3',
  6: 'b5',
  8: '#5',
  10: 'b7',
};

const MINOR_SCALE_DEGREES = {
  0: '1',
  2: '2',
  3: 'b3',
  5: '4',
  7: '5',
  8: 'b6',
  10: 'b7',
};
const MINOR_SCALE_ALTERNATE = {
  1: '#1/b2',
  4: '3',
  6: 'b5',
  9: '#6',
  11: '7',
};

/** 'Am', 'A min', 'Amin', 'A minor' -> minor; selain itu major. */
const getScaleTypeFromKey = (key = 'C') => {
  if (!key) return 'major';
  const normalized = key.trim().toLowerCase();
  if (normalized.includes('maj')) return 'major';
  return /(?:^|[a-g][#b]?)\s*(?:m|min|minor)$/.test(normalized) ? 'minor' : 'major';
};

const getScaleDegreeFromRoot = (rootNote, key = 'C', scaleType = 'major') => {
  const root = extractRoot(rootNote);
  const base = extractRoot(key);
  if (!root || !base) return null;

  const rootIdx = getNoteIndex(root);
  const baseIdx = getNoteIndex(base);
  if (rootIdx == null || baseIdx == null) return null;

  const interval = (rootIdx - baseIdx + 12) % 12;
  const degrees = scaleType === 'minor' ? MINOR_SCALE_DEGREES : MAJOR_SCALE_DEGREES;
  const alternate = scaleType === 'minor' ? MINOR_SCALE_ALTERNATE : MAJOR_SCALE_ALTERNATE;
  return degrees[interval] ?? alternate[interval] ?? null;
};

const normalizeChordQuality = (quality = '') => {
  const norm = quality.trim();
  if (!norm) return '';

  // Samakan sinonim kualitas: "min7" -> "m7", "maj" tetap "maj".
  if (/^maj/i.test(norm)) return norm.replace(/^maj/i, 'maj');
  if (/^min/i.test(norm) || /^m(?!aj)/i.test(norm)) return norm.replace(/^m(in)?/i, 'm');
  return norm;
};

export const getTransposeSteps = (fromKey, toKey) => {
  const fromRoot = extractRoot(fromKey);
  const toRoot = extractRoot(toKey);
  const fromIdx = getNoteIndex(fromRoot);
  const toIdx = getNoteIndex(toRoot);
  if (fromIdx == null || toIdx == null) return 0;
  let steps = toIdx - fromIdx;
  if (steps > 6) steps -= 12;
  if (steps < -6) steps += 12;
  return steps;
};

/**
 * Convert a chord name into numeric scale degree notation (Nashville) based on key.
 * Example: chordToNumber('Am', 'C') -> '6m'
 *          chordToNumber('G7', 'C') -> '57'
 *          chordToNumber('F#dim', 'D') -> '#4dim'
 */
export const chordToNumber = (chord, key = 'C') => {
  if (!chord || typeof chord !== 'string') return null;

  const normalizedChord = chord.trim();
  if (normalizedChord.startsWith('-')) {
    const leadingDashResult = chordToNumber(normalizedChord.slice(1), key);
    return leadingDashResult ? `-${leadingDashResult}` : null;
  }
  const match = normalizedChord.match(/^([A-G][#b]?)(.*)$/i);
  if (!match) return null;

  const root = match[1];
  let remainder = match[2] || '';
  const scaleType = getScaleTypeFromKey(key);

  // Slash bass: derajat bass dihitung pada kualitas yang sama dengan chord induk
  // (mis. Am/C di atas A minor -> 1m/<b3>), bukan selalu tangga mayor.
  let bassDegree = '';
  const slashMatch = remainder.match(/\/([A-G][#b]?)/);
  if (slashMatch) {
    const bassValue = getScaleDegreeFromRoot(slashMatch[1], key, scaleType);
    if (bassValue) {
      bassDegree = '/' + bassValue;
    }
    // Remove bass part from quality
    remainder = remainder.replace(/\/([A-G][#b]?)/, '');
  }

  const quality = normalizeChordQuality(remainder);
  const degree = getScaleDegreeFromRoot(root, key, scaleType);
  if (!degree) return null;

  const chordNumber = `${degree}${quality || ''}${bassDegree}`;
  return chordNumber;
};

export const chordTextToNumberText = (text, key = 'C') => {
  if (!text || typeof text !== 'string') return text;

  const replaced = text.replace(CHORD_REGEX_GLOBAL, (match) => {
    const innerMatch = match.match(/^([\(\[\{]?)(.+?)([\)\]\}]?)$/);
    const fullMatch = innerMatch ? innerMatch[2] : match;
    const sanitized = normalizeChordToken(fullMatch.replace(/\.+$/, ''));
    const numberChord = chordToNumber(sanitized, key);
    if (!numberChord) return match;
    const trailingDots = match.slice(match.replace(/\.+$/, '').length);
    const prefix = innerMatch ? innerMatch[1] : '';
    const suffix = innerMatch ? innerMatch[3] : '';
    return `${prefix}${numberChord}${suffix}${trailingDots}`;
  });

  return replaced;
};

const formatSingleChordToJazzStyle = (chord) => {
  if (!chord || typeof chord !== 'string') return chord;
  if (isNoChordToken(chord)) return chord;

  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, suffix = ''] = match;
  const slashIndex = suffix.indexOf('/');
  const quality = slashIndex === -1 ? suffix : suffix.slice(0, slashIndex);
  const bass = slashIndex === -1 ? '' : suffix.slice(slashIndex);
  const normalizedQuality = quality.trim();

  let jazzQuality = normalizedQuality;

  if (!normalizedQuality) {
    jazzQuality = 'maj7';
  } else if (/^maj7$/i.test(normalizedQuality)) {
    jazzQuality = 'maj9';
  } else if (/^maj9$/i.test(normalizedQuality)) {
    jazzQuality = 'maj9';
  } else if (/^maj$/i.test(normalizedQuality)) {
    jazzQuality = 'maj7';
  } else if (/^m(?!aj)$/i.test(normalizedQuality) || /^min$/i.test(normalizedQuality)) {
    jazzQuality = 'm7';
  } else if (/^(m7|min7)$/i.test(normalizedQuality)) {
    jazzQuality = 'm9';
  } else if (/^(m9|min9)$/i.test(normalizedQuality)) {
    jazzQuality = 'm9';
  } else if (/^7$/i.test(normalizedQuality)) {
    jazzQuality = '13';
  } else if (/^9$/i.test(normalizedQuality) || /^11$/i.test(normalizedQuality) || /^13$/i.test(normalizedQuality)) {
    jazzQuality = normalizedQuality;
  } else if (/^6$/i.test(normalizedQuality)) {
    jazzQuality = '6/9';
  } else if (/^add9$/i.test(normalizedQuality)) {
    jazzQuality = 'maj9';
  } else if (/^sus2$/i.test(normalizedQuality)) {
    jazzQuality = 'add9';
  } else if (/^(sus|sus4)$/i.test(normalizedQuality)) {
    jazzQuality = '13sus4';
  } else if (/^dim$/i.test(normalizedQuality)) {
    jazzQuality = 'm7b5';
  } else if (/^aug$/i.test(normalizedQuality)) {
    jazzQuality = '7#5';
  }

  return `${root}${jazzQuality}${bass}`;
};

const formatSingleChordToSimpleStyle = (chord) => {
  if (!chord || typeof chord !== 'string') return chord;
  if (isNoChordToken(chord)) return chord;

  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, suffix = ''] = match;
  const slashIndex = suffix.indexOf('/');
  const quality = slashIndex === -1 ? suffix : suffix.slice(0, slashIndex);
  const bass = slashIndex === -1 ? '' : suffix.slice(slashIndex);
  const normalizedQuality = quality.trim();

  let simpleQuality = normalizedQuality;

  if (!normalizedQuality) {
    simpleQuality = '';
  } else if (/^maj(?:7|9|11|13)?$/i.test(normalizedQuality)) {
    simpleQuality = '';
  } else if (/^(6|6\/9|add9)$/i.test(normalizedQuality)) {
    simpleQuality = '';
  } else if (/^m(?!aj)(?:7|9|11|13)?$/i.test(normalizedQuality) || /^min(?:7|9|11|13)?$/i.test(normalizedQuality)) {
    simpleQuality = 'm';
  } else if (/^(aug|7#5)$/i.test(normalizedQuality)) {
    simpleQuality = 'aug';
  } else if (/^(7|9|11|13)(?:[#b]\d+)*$/i.test(normalizedQuality)) {
    simpleQuality = '7';
  } else if (/^(sus|sus2|sus4|13sus4)$/i.test(normalizedQuality)) {
    simpleQuality = 'sus';
  } else if (/^(dim|dim7|m7b5)$/i.test(normalizedQuality)) {
    simpleQuality = 'dim';
  }

  return `${root}${simpleQuality}${bass}`;
};

export const chordTextToJazzText = (text) => {
  if (!text || typeof text !== 'string') return text;

  return text.replace(CHORD_REGEX_GLOBAL, (match) => {
    const innerMatch = match.match(/^([\(\[\{]?)(.+?)([\)\]\}]?)$/);
    const fullMatch = innerMatch ? innerMatch[2] : match;
    const trailingDotsMatch = fullMatch.match(/(\.{2,})$/);
    const trailingDots = trailingDotsMatch ? trailingDotsMatch[1] : '';
    const sanitized = normalizeChordToken(fullMatch.replace(/\.{2,}$/, ''));
    const jazzChord = formatSingleChordToJazzStyle(sanitized);
    const prefix = innerMatch ? innerMatch[1] : '';
    const suffix = innerMatch ? innerMatch[3] : '';
    return `${prefix}${jazzChord}${suffix}${trailingDots}`;
  });
};

export const chordTextToSimpleText = (text) => {
  if (!text || typeof text !== 'string') return text;

  return text.replace(CHORD_REGEX_GLOBAL, (match) => {
    const innerMatch = match.match(/^([\(\[\{]?)(.+?)([\)\]\}]?)$/);
    const fullMatch = innerMatch ? innerMatch[2] : match;
    const trailingDotsMatch = fullMatch.match(/(\.{2,})$/);
    const trailingDots = trailingDotsMatch ? trailingDotsMatch[1] : '';
    const sanitized = normalizeChordToken(fullMatch.replace(/\.{2,}$/, ''));
    const simpleChord = formatSingleChordToSimpleStyle(sanitized);
    const prefix = innerMatch ? innerMatch[1] : '';
    const suffix = innerMatch ? innerMatch[3] : '';
    return `${prefix}${simpleChord}${suffix}${trailingDots}`;
  });
};

// Fungsi untuk mendeteksi apakah sebuah baris adalah baris chord
export const isChordLine = (line) => {
  if (typeof line !== 'string' || !line.trim()) return false;

  // Remove section label at start (e.g. [Coda])
  let cleanedLine = line.replace(/^\[.+?\]\s*/, '');
  // Remove repeat token (e.g. (2x), (3x))
  cleanedLine = cleanedLine.replace(/\(\d+x\)/g, '').trim();

  // Check for compact chord format with .. separator (e.g., D..Gm..Bb)
  const compactPattern = /^(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/([A-G][#b]?))?)(?:\.\.(?:-?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/([A-G][#b]?))?))+$/;
  if (compactPattern.test(cleanedLine.trim())) return true;

  // Tokenisasi: pisahkan berdasarkan spasi, abaikan barline (|, ||, |:, :|)
  const tokens = cleanedLine
    .replace(/\|:|:\||\[\:|\:\]|\|\||\|/g, ' ') // hilangkan barline
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return false;

  // Hitung jumlah token chord (termasuk N.C.) dan token pengisi (hanya . atau -)
  const chordOrFiller = tokens.filter((token) => (
    isChordToken(token) || /^\.*$/.test(token) || /^-+$/.test(token)
  )).length;
  // Jika mayoritas token adalah chord atau filler, anggap baris chord
  if (chordOrFiller > 0 && chordOrFiller >= tokens.length * 0.7) return true;

  // Fallback: coverage karakter chord (lama)
  const matches = [...cleanedLine.matchAll(CHORD_REGEX_GLOBAL)];
  if (matches.length === 0) return false;
  const totalChordLength = matches.reduce((sum, match) => sum + match[0].length, 0);
  const lineWithoutSpaces = cleanedLine.replace(/\s+/g, '');
  return totalChordLength > 0 && (totalChordLength / lineWithoutSpaces.length) >= 0.5;
};

// Fungsi untuk expand compact chord format (D..Gm..Bb) menjadi format spaced
const expandCompactChords = (line) => {
  // Check if line contains compact format (chord..chord..chord or chord-chord).
  // Non-global on purpose: a /g regex keeps lastIndex between calls, and the
  // old test matched against the line before split() consumed it.
  const compactPattern = /(?<![A-Za-z0-9\/])[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?(?:\.\.|-)/;

  if (!compactPattern.test(line)) return line;

  // Split by .. or - and join with spaces for proper spacing
  const chords = line.split(/(?:\.\.|-)/).map(c => c.trim()).filter(c => c);
  return chords.join('   '); // Add spacing between chords
};

// Fungsi untuk mengkonversi format standard (chord di atas lirik) ke ChordPro-like format
const parseStandardFormat = (lines) => {
  const parsed = [];
  let currentSection = null;

  const normalizeSection = (name) => {
    const n = name.toLowerCase().replace(/[.:]+$/, ''); // Remove trailing dots/colons
    if (n.includes('intro')) return 'intro';
    if (n.includes('verse')) return 'verse';
    if (n.includes('pre') && n.includes('chorus')) return 'pre-chorus';
    if (n.includes('post') && n.includes('chorus')) return 'post-chorus';
    if (n.includes('chorus')) return 'chorus';
    if (n.includes('bridge')) return 'bridge';
    if (n.includes('outro')) return 'outro';
    if (n.includes('coda')) return 'coda';
    if (n.includes('interlude') || n === 'int') return 'interlude';
    if (n.includes('solo')) return 'solo';
    if (n.includes('refrain') || n.includes('reff')) return 'refrain';
    if (n.includes('musik')) return 'musik';
    return null;
  };

  /** Tutup seksi yang sedang berjalan lalu buka seksi baru. */
  const startSection = (structure) => {
    if (currentSection) {
      parsed.push({ type: 'structure_end', structure: currentSection });
    }
    parsed.push({ type: 'structure_start', structure });
    currentSection = structure;
  };

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    if (!currentLine.trim()) {
      parsed.push({ type: 'empty', line: '' });
      continue;
    }

    const trimmedLine = currentLine.trim();

    // Tambahan: Deteksi struktur dengan braket [Section]
    const bracketSectionMatch = trimmedLine.match(/^\[([A-Za-z0-9 .:-_]+)\]$/);
    if (bracketSectionMatch) {
      const normalizedSectionName = normalizeSection(bracketSectionMatch[1].trim());
      if (normalizedSectionName) {
        startSection(normalizedSectionName);
        continue;
      }
    }

    // Check for standalone section header (e.g., "Int.", "Intro", "Intro:", "Intro :" on its own line)
    const standaloneSectionMatch = trimmedLine.match(/^([A-Za-z.]+)\s*:?\s*$/);
    if (standaloneSectionMatch) {
      const normalizedSectionName = normalizeSection(standaloneSectionMatch[1].trim());
      if (normalizedSectionName) {
        startSection(normalizedSectionName);
        continue;
      }
    }

    // Check for section header with inline chords (e.g., "Int. C G Am", "Int: C G Am", "Int : D..Gm..Bb")
    const sectionWithChordsMatch = trimmedLine.match(/^([A-Za-z.]+)\s*:?\s+(.+)$/);
    if (sectionWithChordsMatch) {
      const possibleSection = sectionWithChordsMatch[1].trim();
      const possibleChords = sectionWithChordsMatch[2].trim();
      const normalizedSectionName = normalizeSection(possibleSection);

      // If section matches, always treat it as section (even if rest is not chords)
      if (normalizedSectionName) {
        startSection(normalizedSectionName);

        // Expand compact format if present
        const expandedChords = expandCompactChords(possibleChords);

        // Parse the chord line using CHORD_REGEX_GLOBAL
        const chords = [...expandedChords.matchAll(CHORD_REGEX_GLOBAL)].map((match) => ({
          chord: match[0],
          position: match.index + possibleSection.length + 1,
        }));

        // Lirik baris berikutnya (bukan chord, bukan kosong) ikut menempel.
        let lyricText = '';
        if (nextLine && nextLine.trim() && !isChordLine(nextLine)) {
          lyricText = nextLine;
          i++; // Skip next line since we consumed it
        }

        parsed.push({
          type: 'line_with_chords',
          chords,
          text: lyricText,
          barText: expandedChords, // Preserve bars and chord spacing source
          sourceLine: i + 1,
        });
        continue;
      }
    }

    // Deteksi metadata sederhana
    if (currentLine.includes(':') && currentLine.length < 50) {
      const colonIndex = currentLine.indexOf(':');
      const keyRaw = currentLine.substring(0, colonIndex).trim().toLowerCase();
      const value = currentLine.substring(colonIndex + 1).trim();

      const normalizedKey = (() => {
        if (['original key', 'original_key'].includes(keyRaw)) return 'original_key';
        if (keyRaw === 'time signature') return 'time';
        return keyRaw;
      })();

      if (['title', 'artist', 'key', 'tempo', 'time', 'original_key'].includes(normalizedKey)) {
        parsed.push({ type: 'metadata', key: normalizedKey, value });
        continue;
      }

      // Section header detection (e.g., "Verse:", "Chorus:")
      const sectionName = normalizeSection(keyRaw);
      if (sectionName) {
        startSection(sectionName);
        continue;
      }
    }

    // Cek apakah baris ini adalah baris chord
    if (isChordLine(currentLine)) {
      // Expand compact format if present (D..Gm..Bb -> D   Gm   Bb)
      const expandedLine = expandCompactChords(currentLine);

      // Extract chords using CHORD_REGEX_GLOBAL
      const chords = [...expandedLine.matchAll(CHORD_REGEX_GLOBAL)].map((match) => ({
        chord: match[0],
        position: match.index,
      }));

      const hasLyricBelow = Boolean(nextLine && !isChordLine(nextLine) && nextLine.trim());
      parsed.push({
        type: 'line_with_chords',
        chords,
        text: hasLyricBelow ? nextLine : '',
        barText: expandedLine, // Keep expanded chord line for bar detection
        sourceLine: i + 1,
      });

      // Skip next line karena sudah diproses satu paket dengan chord di atasnya.
      if (hasLyricBelow) i++;
    } else {
      // Baris teks biasa
      parsed.push({
        type: 'text',
        line: currentLine,
      });
    }
  }

  if (currentSection) {
    parsed.push({ type: 'structure_end', structure: currentSection });
  }

  return parsed;
};

export const parseChordPro = (text) => {
  // Hanya gunakan format standar (chord di atas lirik, tanpa tag ChordPro)
  if (!text) return { metadata: {}, lines: [], structures: {} };

  const lines = text.split('\n');
  const parsedLines = parseStandardFormat(lines);
  const metadata = {};

  // Extract metadata dari parsed lines
  const contentLines = parsedLines.filter(line => {
    if (line.type === 'metadata') {
      metadata[line.key] = line.value;
      return false;
    }
    return true;
  });

  // Kumpulkan struktur dari parsedLines
  const structures = {};
  let currentStruct = null;
  let structLines = [];
  contentLines.forEach((line) => {
    if (line.type === 'structure_start') {
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = line.structure;
      structLines = [];
    } else if (line.type === 'structure_end') {
      if (currentStruct && structLines.length > 0) {
        structures[currentStruct] = [...structLines];
      }
      currentStruct = null;
      structLines = [];
    } else if (currentStruct) {
      structLines.push(line);
    }
  });
  if (currentStruct && structLines.length > 0) {
    structures[currentStruct] = [...structLines];
  }

  return { metadata, lines: contentLines, structures };
};

/** Ambil root chord (tanpa passing dash, bracket, atau titik durasi). */
const extractChordRoot = (chord) => {
  if (!chord || typeof chord !== 'string') return null;
  const cleanChord = normalizeChordToken(chord.replace(/^-/, ''));
  const match = cleanChord.match(/^([A-G][#b]?)/);
  return match ? match[1] : null;
};

const toCleanChord = (chord) => normalizeChordToken(String(chord || '').replace(/^-/, ''));

/** Susun [{ chord, count }] urut dari paling sering lalu alfabetis. */
const sortUsageCounts = (usageMap) => Array.from(usageMap.entries())
  .map(([chord, count]) => ({ chord, count }))
  .sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.chord.localeCompare(b.chord);
  });

export const getAllChords = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const chordSet = new Set();

  parsedSong.lines.forEach((line) => {
    if (line.type !== 'line_with_chords' || !line.chords) return;
    line.chords.forEach(({ chord }) => {
      const cleanChord = toCleanChord(chord);
      if (cleanChord) chordSet.add(cleanChord);
    });
  });

  return Array.from(chordSet).sort();
};

/**
 * Hitung frekuensi penggunaan setiap chord.
 * Return: [{ chord: 'C', count: 5 }, ...] urut dari paling sering.
 */
export const getChordUsageCounts = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const usageMap = new Map();

  parsedSong.lines.forEach((line) => {
    if (line.type !== 'line_with_chords' || !line.chords) return;

    line.chords.forEach(({ chord }) => {
      const cleanChord = toCleanChord(chord);
      if (!cleanChord) return;

      usageMap.set(cleanChord, (usageMap.get(cleanChord) || 0) + 1);
    });
  });

  return sortUsageCounts(usageMap);
};

const buildUsageCountsFromChordList = (chords = []) => {
  if (!Array.isArray(chords) || chords.length === 0) return [];

  const usageMap = new Map();
  chords.forEach((chord) => {
    const cleanChord = toCleanChord(chord);
    if (!cleanChord) return;
    usageMap.set(cleanChord, (usageMap.get(cleanChord) || 0) + 1);
  });

  return sortUsageCounts(usageMap);
};

const MAJOR_SCALE_PROFILE = {
  intervals: [0, 2, 4, 5, 7, 9, 11],
  qualities: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
};

const MINOR_SCALE_PROFILE = {
  intervals: [0, 2, 3, 5, 7, 8, 10],
  qualities: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
};

/** Nada dasar tiap pitch class (0..11), memilih enharmonik yang paling umum. */
const KEY_ROOT_BY_PITCH_CLASS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const getChordQualityFamily = (chord) => {
  if (!chord || typeof chord !== 'string') return 'major';
  const match = toCleanChord(chord).match(/^([A-G][#b]?)(.*)$/);
  if (!match) return 'major';

  const suffix = (match[2] || '').toLowerCase();
  if (suffix.includes('dim') || suffix.includes('m7b5')) return 'diminished';
  if (suffix.includes('aug') || suffix.includes('#5')) return 'augmented';
  if (/^(m|min)(?!aj)/.test(suffix)) return 'minor';
  return 'major';
};

/**
 * Estimasi key dari kumpulan chord berdasarkan kecocokan skala diatonik.
 */
export const estimateKeyFromChordUsage = (usageCounts = []) => {
  if (!Array.isArray(usageCounts) || usageCounts.length === 0) return null;

  const candidates = [];

  for (let tonic = 0; tonic < 12; tonic += 1) {
    const majorMembership = new Map();
    MAJOR_SCALE_PROFILE.intervals.forEach((interval, idx) => {
      majorMembership.set((tonic + interval) % 12, MAJOR_SCALE_PROFILE.qualities[idx]);
    });

    const minorMembership = new Map();
    MINOR_SCALE_PROFILE.intervals.forEach((interval, idx) => {
      minorMembership.set((tonic + interval) % 12, MINOR_SCALE_PROFILE.qualities[idx]);
    });

    const scoreCandidate = (mode, membership) => {
      let score = 0;
      let matchedWeight = 0;
      let totalWeight = 0;

      usageCounts.forEach(({ chord, count }) => {
        const root = extractChordRoot(chord);
        const rootIdx = getNoteIndex(root);
        if (rootIdx == null) return;

        const weight = Number(count) || 0;
        if (weight <= 0) return;
        totalWeight += weight;

        const expectedQuality = membership.get(rootIdx);
        if (!expectedQuality) {
          score -= weight * 0.45;
          return;
        }

        matchedWeight += weight;
        score += weight * 1.4;

        const actualQuality = getChordQualityFamily(chord);
        if (actualQuality === expectedQuality) {
          score += weight * 0.8;
        }
      });

      // C major and A minor share the exact same diatonic chords, so the
      // membership score alone can never separate them. Break the tie with
      // the tonic itself: heavier use of the tonic chord favours that mode.
      const tonicUsage = usageCounts
        .filter(({ chord }) => getNoteIndex(extractChordRoot(chord)) === tonic)
        .reduce((sum, { count }) => sum + (Number(count) || 0), 0);
      score += tonicUsage * 0.3;

      const tonicLabel = KEY_ROOT_BY_PITCH_CLASS[tonic];
      const key = mode === 'major' ? tonicLabel : `${tonicLabel}m`;

      return {
        key,
        mode,
        score,
        matchedWeight,
        totalWeight,
      };
    };

    candidates.push(scoreCandidate('major', majorMembership));
    candidates.push(scoreCandidate('minor', minorMembership));
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;

  const alternatives = candidates
    .slice(1)
    .map((candidate) => candidate.key)
    .filter((value, idx, arr) => arr.indexOf(value) === idx)
    .slice(0, 2);
  const second = candidates[1] || null;

  const matchRatio = best.totalWeight > 0 ? best.matchedWeight / best.totalWeight : 0;
  const confidenceRaw = Math.min(1, Math.max(0, matchRatio * 0.75 + ((best.score - (second?.score || 0)) / 10) * 0.25));
  const confidence = Math.round(confidenceRaw * 100);

  return {
    key: best.key,
    mode: best.mode,
    confidence,
    alternatives,
  };
};

/** Estimasi key untuk satu jendela chord, null bila keyakinan di bawah ambang. */
const detectWindowKey = (chords, minConfidence) => {
  if (!Array.isArray(chords) || chords.length === 0) return null;
  const estimation = estimateKeyFromChordUsage(buildUsageCountsFromChordList(chords));
  return estimation && estimation.confidence >= minConfidence ? estimation : null;
};

/**
 * Deteksi modulasi berdasarkan pergeseran estimasi key antar blok chord berurutan.
 */
export const detectChordModulations = (parsedSong, options = {}) => {
  if (!parsedSong || !Array.isArray(parsedSong.lines)) {
    return { hasModulation: false, modulationCount: 0, transitions: [], timeline: [] };
  }

  const {
    lineWindow = 2,
    minDetectedConfidence = 48,
    minSegmentLines = 2,
  } = options;

  const chordLines = [];
  parsedSong.lines.forEach((line, index) => {
    if (line.type !== 'line_with_chords' || !Array.isArray(line.chords)) return;

    const chords = line.chords.map(({ chord }) => toCleanChord(chord)).filter(Boolean);
    if (!chords.length) return;

    chordLines.push({
      sourceLine: Number(line.sourceLine) > 0 ? Number(line.sourceLine) : index + 1,
      chords,
    });
  });

  if (chordLines.length < lineWindow + 1) {
    return { hasModulation: false, modulationCount: 0, transitions: [], timeline: [] };
  }

  // Estimasi key dihitung per jendela (lineWindow baris chord terakhir).
  const keyPerLine = chordLines.map((line, idx) => {
    const windowStart = Math.max(0, idx - lineWindow + 1);
    const windowChords = [];
    for (let i = windowStart; i <= idx; i += 1) {
      windowChords.push(...chordLines[i].chords);
    }

    return {
      ...line,
      detectedKey: detectWindowKey(windowChords, minDetectedConfidence),
    };
  });

  const timeline = [];
  keyPerLine.forEach((line) => {
    const key = line.detectedKey?.key || null;
    const confidence = line.detectedKey?.confidence || 0;

    const lastSegment = timeline[timeline.length - 1];
    if (!key) return;

    if (!lastSegment || lastSegment.key !== key) {
      timeline.push({
        key,
        startSourceLine: line.sourceLine,
        endSourceLine: line.sourceLine,
        lineCount: 1,
        confidenceSum: confidence,
      });
      return;
    }

    lastSegment.endSourceLine = line.sourceLine;
    lastSegment.lineCount += 1;
    lastSegment.confidenceSum += confidence;
  });

  const normalizedTimeline = timeline.map((segment) => ({
    key: segment.key,
    startSourceLine: segment.startSourceLine,
    endSourceLine: segment.endSourceLine,
    lineCount: segment.lineCount,
    confidence: Math.round(segment.confidenceSum / Math.max(1, segment.lineCount)),
  }));

  const stableSegments = normalizedTimeline.filter((segment) => segment.lineCount >= minSegmentLines);
  if (stableSegments.length < 2) {
    return {
      hasModulation: false,
      modulationCount: 0,
      transitions: [],
      timeline: normalizedTimeline,
    };
  }

  const transitions = [];
  for (let i = 1; i < stableSegments.length; i += 1) {
    const prev = stableSegments[i - 1];
    const next = stableSegments[i];
    if (!prev.key || !next.key || prev.key === next.key) continue;

    transitions.push({
      fromKey: prev.key,
      toKey: next.key,
      startLine: next.startSourceLine,
      endLine: next.endSourceLine,
      confidence: Math.round((prev.confidence + next.confidence) / 2),
    });
  }

  return {
    hasModulation: transitions.length > 0,
    modulationCount: transitions.length,
    transitions,
    timeline: normalizedTimeline,
  };
};

// Mengelompokkan chord berdasarkan bar (|) pada setiap baris chord
export const getChordsByBar = (parsedSong) => {
  if (!parsedSong || !parsedSong.lines) return [];

  const bars = [];
  parsedSong.lines.forEach(line => {
    if (line.type === 'line_with_chords' && line.barText) {
      // Split berdasarkan bar line
      const barParts = line.barText.split('|').map(part => part.trim()).filter(Boolean);
      barParts.forEach(bar => {
        // Ambil semua chord dalam bar ini
        const chords = [...bar.matchAll(CHORD_REGEX_GLOBAL)].map(match =>
          normalizeChordToken(match[0].replace(/^-/, ''))
        ).filter(Boolean);
        if (chords.length > 0) {
          bars.push(chords);
        }
      });
    }
  });
  return bars;
};

const KEY_SIGNATURE_ACCIDENTALS = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  'C#': 7,
  F: 1,
  Bb: 2,
  Eb: 3,
  Ab: 4,
  Db: 5,
  Gb: 6,
  Cb: 7,
};

const getPianoPlayabilityBreakdown = (chords = [], steps = 0) => {
  const accidentalChordCount = chords.reduce((count, chord) => {
    const transposedChord = transposeChord(chord, steps);
    const root = extractChordRoot(transposedChord);
    if (!root) return count;

    // Chord dengan accidental cenderung lebih menantang untuk mayoritas pemain piano.
    return /[#b]/.test(root) ? count + 1 : count;
  }, 0);

  return {
    accidentalChordCount,
    totalChords: chords.length,
    chordPenalty: accidentalChordCount * 2,
  };
};

/**
 * Rekomendasi nada dasar yang lebih mudah dimainkan di piano.
 * Menilai kandidat key dari perubahan transpose -6..+6 terhadap kondisi saat ini.
 */
export const recommendPianoFriendlyKey = ({ chords = [], key = '', transpose = 0 } = {}) => {
  if (!Array.isArray(chords) || chords.length === 0) {
    return null;
  }

  const keyMatch = typeof key === 'string' ? key.trim().match(/^([A-G][#b]?)(.*)$/) : null;
  const keyRoot = keyMatch ? keyMatch[1] : null;
  const keySuffix = keyMatch ? keyMatch[2] : '';

  const candidates = [];
  for (let relativeShift = -6; relativeShift <= 6; relativeShift += 1) {
    const totalShift = transpose + relativeShift;
    const transposedKeyRoot = keyRoot ? transposeChord(keyRoot, totalShift) : null;
    const transposedKey = transposedKeyRoot ? `${transposedKeyRoot}${keySuffix}` : null;

    const breakdown = getPianoPlayabilityBreakdown(chords, totalShift);
    const chordPenalty = breakdown.chordPenalty;
    const keyPenalty = transposedKeyRoot
      ? (KEY_SIGNATURE_ACCIDENTALS[transposedKeyRoot] || 0) * 0.75
      : 0;

    candidates.push({
      relativeShift,
      totalShift,
      key: transposedKey,
      chordPenalty,
      keyPenalty,
      accidentalChordCount: breakdown.accidentalChordCount,
      totalChords: breakdown.totalChords,
      score: chordPenalty + keyPenalty,
    });
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return Math.abs(a.relativeShift) - Math.abs(b.relativeShift);
  });

  const best = candidates[0];
  const current = candidates.find((candidate) => candidate.relativeShift === 0);
  const improvement = current ? Math.max(0, current.score - best.score) : 0;

  return {
    recommendedKey: best.key,
    transposeFromCurrent: best.relativeShift,
    score: best.score,
    improvement,
    accidentalChordCount: best.accidentalChordCount,
    totalChords: best.totalChords,
    keyAccidentalCount: best.key ? (KEY_SIGNATURE_ACCIDENTALS[extractChordRoot(best.key)] || 0) : 0,
  };
};