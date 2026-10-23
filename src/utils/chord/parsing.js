/**
 * parsing.js
 *
 * Parser utama baris lirik/chord: parseLine (satu baris) dan parseLines
 * (seluruh teks) beserta ekspansi referensi seksi.
 *
 * Bagian-bagian di dalam file:
 *   1. Pemisah baris compound (["[Verse] [Cue: X]" -> dua baris])
 *   2. Tokenisasi baris chord/lirik
 *   3. parseLines — peta baris -> baris sumber untuk sinkronisasi editor
 */
import { getCueMarkSet, getInstrumentSet } from './chordDisplayTags.js';
import { matchKeywordPattern, escapeRegex } from './textKeywords.js';
import {
  isChordToken,
  isChordLine,
  isLeadingDashChordToken,
  transposeChord,
  transposeChordToken,
  transposeLeadingDashChordToken,
  transposeCompactChordToken,
  parseNumberLine,
  isNumberNotationToken,
} from './chordTokens.js';
import {
  isCueMarkKeyword,
  isInlineCueMarkToken,
  isInlineInstrumentToken,
  mergeInstrumentPhraseTokens,
  matchInlineInstrumentLabel,
  findInlineInstrumentMatch,
  splitInlineTokens,
  splitParenthesizedMultiChordToken,
} from './instruments.js';
import {
  parseSection,
  parseBracketedInstrumentLabel,
  formatBracketedInstrumentLabel,
  isInstrumentPatchLikeLine,
  isKnownCueMarkLabel,
  isMetadataLine,
  TIMESTAMP_BRACKET_REGEX,
  getRealInstrumentKeywords,
} from './sections.js';

const BARLINE_TOKEN_REGEX = /^(\|:|:\||\[\:|\:\]|\|\||\|)$/;

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

  // Tag berisi key MIDI ("[Keys: EP Soft]") bukan keyword ChordDisplay: jangan
  // dipecah, biarkan utuh untuk slot MIDI.
  if (bracketChunks.some((chunk) => isMidiOnlyBracketTag(chunk))) return null;

  // Tag instrumen berurutan ("[Gitar] [Suling]") TIDAK dipecah: braketnya sudah
  // dipisah tokenizer, sehingga dipecah per baris hasilnya dua row "instrument"
  // yang dirender ganda.
  if (bracketChunks.every((chunk) => isInlineInstrumentToken(chunk))) return null;

  return bracketChunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => !TIMESTAMP_BRACKET_REGEX.test(chunk));
}

const CANONICAL_BRACKET_KEYWORD_REGEX = /^\[([A-Za-z0-9 '.\-&_]+)\]$/;

/**
 * Shape braket "Nama: nilai" yang bukan milik ChordDisplay — bentuk yang
 * dipakai modul MIDI ("Keys: EP Soft", "CH: 2", "Patch: Stage Piano").
 */
const MIDI_ONLY_BRACKET_REGEX = /^\[[^[\]:]+:\s*[^[\]]*\]$/;

const isMidiOnlyBracketTag = (tag = '') => MIDI_ONLY_BRACKET_REGEX.test(String(tag).trim());

/**
 * Tulis ulang keyword cue mark yang dikenali menjadi bentuk baku "[Keyword]".
 */
const toCanonicalBracketKeyword = (token) => {
  const match = String(token || '').trim().match(CANONICAL_BRACKET_KEYWORD_REGEX);
  if (!match) return null;
  const keyword = match[1].trim();
  return getCueMarkSet().has(keyword.toLowerCase()) ? `[${keyword}]` : null;
};

/**
 * Pecah baris menjadi token, dengan keyword ber-braket dikeluarkan utuh.
 * Selain itu memakai splitInlineTokens biasa. Dipakai tokenizeChordLine dan
 * tokenizeLyricLine supaya aturan tokenisasi sama untuk kedua jalur.
 */
export const splitKeywordAwareTokens = (line = '') => {
  if (typeof line !== 'string') return [];

  const tokens = [];
  let rest = line;

  const pushTokens = (chunk = '') => {
    tokens.push(...splitInlineTokens(chunk));
  };

  /** "[Sax Sheffield]" -> ["[Sax ", "Sheffield]"]. */
  const pushBracketPieces = (bracket = '') => {
    const open = bracket.indexOf(' ');
    if (open === -1) {
      tokens.push(bracket);
    } else {
      tokens.push(bracket.slice(0, open + 1), ' ', bracket.slice(open + 1));
    }
  };

  while (rest) {
    const start = rest.indexOf('[');
    if (start === -1) {
      pushTokens(rest);
      break;
    }

    if (start > 0) {
      pushTokens(rest.slice(0, start));
      rest = rest.slice(start);
      continue;
    }

    const end = rest.indexOf(']');
    if (end === -1) {
      pushTokens(rest);
      break;
    }

    const bracket = rest.slice(0, end + 1);
    const after = rest.slice(end + 1);
    const nextTokenStart = after.trimStart().charAt(0);
    const nextIsSpaceOrEnd = !nextTokenStart || /^\s|\|/.test(after);
    // Cue mark dan label instrumen berdiri sendiri sebagai tag (lalu dimerge
    // kembali oleh mergeInstrumentPhraseTokens):
    // - braket lengkap tanpa spasi selalu utuh ("[Sax]");
    // - braket berisi spasi hanya utuh bila tidak menempel chord
    //   ("[Gitar Dist], [Organ]"); pada baris chord ia ikut dipecah per kata
    //   agar kontrak spasi tidak berubah.
    const containsSpace = /\s/.test(bracket);
    if (
      toCanonicalBracketKeyword(bracket)
      || !containsSpace
      || nextIsSpaceOrEnd
    ) {
      tokens.push(bracket);
      rest = after;
    } else {
      pushBracketPieces(bracket);
      rest = after;
    }
  }

  return tokens;
};

function tokenizeChordLine(line, transpose) {
  return mergeInstrumentPhraseTokens(splitKeywordAwareTokens(line)).flatMap((token) => {
    if (/^\s+$/.test(token)) return [{ token, isSpace: true }];
    if (BARLINE_TOKEN_REGEX.test(token)) return [{ token, isBarline: true }];
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
  });
}

function tokenizeLyricLine(line, transpose) {
  // Tag ber-key MIDI ("[Keys: ...]") bukan keyword ChordDisplay: jangan
  // tokenisasi sebagai tag instrumen/cue — biarkan utuh untuk slot MIDI.
  if (MIDI_ONLY_BRACKET_REGEX.test(line.trim())) return [{ token: line }];

  return mergeInstrumentPhraseTokens(splitKeywordAwareTokens(line)).flatMap((token) => {
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
  });
}

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
  // "[Stop]" sendiri di satu baris adalah label cue, bukan lirik satu kata.
  if (isKnownCueMarkLabel(line)) {
    return { type: 'cue', label: line.trim().replace(/^\[|\]$/g, '').trim() };
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
  // "[Verse 2] [Cue: Fill Bell]": baris gabungan yang sengaja tidak dipecah
  // (lihat splitBracketCompoundLine). Header seksi dibaca dari bracket pertama
  // supaya baris itu tetap muncul sebagai seksi, bukan lirik.
  const leadingSection = trimmed.match(/^\[([^[\]]+)\](?=\s*\[)/);
  if (leadingSection) {
    const headSection = parseSection(`[${leadingSection[1]}]`);
    if (headSection?.type === 'structure') {
      return { type: 'structure', label: headSection.label };
    }
  }
  if (isInstrumentPatchLikeLine(line)) {
    return { type: 'metadata', text: line.trim() };
  }
  if (isMetadataLine(line)) {
    return { type: 'metadata', text: line.trim() };
  }
  if (isChordLine(line)) {
    return { type: 'chord', tokens: tokenizeChordLine(line, transpose) };
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
  return { type: 'lyrics', tokens: tokenizeLyricLine(line, transpose) };
}

/**
 * Klasifikasi SATU baris tanpa tokenisasi.
 *
 * Satu-satunya tempat yang memutuskan "baris ini apa", dipakai parseLine
 * (render) maupun parseStandardFormat (statistik). Sebelumnya kedua jalur itu
 * punya urutan dan aturan berbeda sehingga baris yang sama bisa dibaca berbeda.
 *
 * @returns {{ kind: 'empty' }
 *   | { kind: 'metadata', text: string }
 *   | { kind: 'instrument', label: string }
 *   | { kind: 'structure', label: string }
 *   | { kind: 'modulation', label: string }
 *   | { kind: 'chord' }
 *   | { kind: 'number' }
 *   | { kind: 'lyrics' }}
 */
export function classifyLine(line) {
  const trimmed = typeof line === 'string' ? line.trim() : '';
  if (!trimmed) return { kind: 'empty' };

  if (/^Cue\s*:/i.test(trimmed)) {
    return { kind: 'metadata', text: trimmed };
  }

  const bracketedInstrument = parseBracketedInstrumentLabel(trimmed);
  if (bracketedInstrument) {
    return { kind: 'instrument', label: formatBracketedInstrumentLabel(bracketedInstrument) };
  }
  if (isKnownCueMarkLabel(trimmed)) {
    return { kind: 'cue', label: trimmed.replace(/^\[|\]$/g, '').trim() };
  }

  const section = parseSection(trimmed);
  if (section) {
    return { kind: section.type, label: section.label };
  }

  if (isInstrumentPatchLikeLine(trimmed) || isMetadataLine(trimmed)) {
    return { kind: 'metadata', text: trimmed };
  }

  if (isChordLine(trimmed)) return { kind: 'chord' };
  if (parseNumberLine(trimmed)) return { kind: 'number' };

  return { kind: 'lyrics' };
}

export { parseLine };

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
    .map((segment) => segment.replace(/(?<![A-Za-z0-9]):\s.*$/, '').trim())
    .filter(Boolean);

  const realInstrumentKeywords = getRealInstrumentKeywords();

  const matches = segments
    .map((segment) => {
      const directMatch = findInlineInstrumentMatch(segment);
      if (directMatch) return directMatch;

      const lower = segment.toLowerCase();
      const keywordMatch = realInstrumentKeywords.find((keyword) => matchKeywordPattern(keyword).test(lower));
      if (!keywordMatch) return '';

      const directKeywordMatch = segment.match(new RegExp(escapeRegex(keywordMatch).replace(/\s+/g, '[\\s_-]+'), 'i'));
      return directKeywordMatch ? directKeywordMatch[0] : keywordMatch;
    })
    .map((value) => value.trim())
    .filter(Boolean);

  if (matches.length) {
    return matches[0];
  }

  const fallback = realInstrumentKeywords.find((keyword) => matchKeywordPattern(keyword).test(cleaned.toLowerCase()));

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

      if (!keyword || !getInstrumentSet().has(keyword.toLowerCase())) {
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
