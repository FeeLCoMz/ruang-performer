/**
 * instruments.js
 *
 * Deteksi label instrumen inline dan cue mark pada teks lirik/chord.
 *
 * Semua keyword WAJIB ditulis dalam braket siku: "[Gitar]", "[Stop]",
 * "[Pad: Soft]", "[Cue: Fill]". Kurung biasa "(Gitar)"/"(Stop)" dan keyword
 * polos tanpa braket TIDAK lagi dikenali sebagai instrumen/cue — teks seperti
 * itu dirender sebagai lirik biasa.
 * Cue mark sengaja dipisah dari instrumen: aksi permainan seperti "Stop" atau
 * "Aksen" bukan alat, jadi tidak boleh terbaca sebagai instrumen.
 */
import { CUE_MARK_KEYWORDS, INSTRUMENT_KEYWORDS } from '../../config/chordDisplayConfig.js';
import {
  escapeRegex,
  matchKeywordPattern,
} from './textKeywords.js';
import {
  isChordToken,
  isLeadingDashChordToken,
  transposeChordToken,
  transposeLeadingDashChordToken,
} from './chordTokens.js';

const instrumentKeywords = INSTRUMENT_KEYWORDS;

/** Regex nama instrumen / cue mark (dibuat sekali, bukan tiap pemanggilan). */
const INSTRUMENT_KEYWORD_PATTERNS = instrumentKeywords.map(matchKeywordPattern);
const CUE_MARK_KEYWORD_PATTERNS = CUE_MARK_KEYWORDS.map(matchKeywordPattern);

/** True when the whole value is exactly one known instrument keyword. */
export const isInstrumentKeywordWord = (value = '') => (
  typeof value === 'string' && instrumentKeywords.includes(value.trim().toLowerCase())
);

export const matchInlineInstrumentLabel = (candidate = '') => {
  if (typeof candidate !== 'string') return false;

  const normalized = candidate.trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();

  // Singkatan instrumen ("gt", "kb", "elp") hanya cocok sebagai kata utuh.
  // Tanpa jalur ini, regex batas kata di bawah tetap cocok tapi LOLOS: ia
  // mengembalikan true hanya untuk keyword multi-kata, sehingga singkatan
  // dua huruf selalu jatuh ke false.
  if (instrumentKeywords.includes(lower)) return true;

  const fullPhraseMatch = INSTRUMENT_KEYWORD_PATTERNS.some((pattern) => pattern.test(lower));
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

export const findInlineInstrumentMatch = (candidate = '') => {
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
  const hasInstrumentInPhrase = INSTRUMENT_KEYWORD_PATTERNS.some((pattern) => pattern.test(lower));
  if (hasInstrumentInPhrase) return false;

  return CUE_MARK_KEYWORD_PATTERNS.some((pattern) => pattern.test(lower));
};

export const normalizeCueMarkToken = (candidate = '') => {
  if (!isCueMarkKeyword(candidate)) return false;

  const normalized = String(candidate || '').trim();
  return normalized.replace(/[()\[\]{}]+/g, '').trim();
};

export const normalizeInstrumentDisplayLabel = (label = '') => {
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

/**
 * Grouping punctuation for a keyword tag. Hanya braket siku yang diterima;
 * kurung biasa sengaja TIDAK ada di sini — lihat catatan di atas.
 */
const BRACKET_GROUP_REGEX = /^\[([^[\]]+)\]$/;

const isBracketGroup = (trimmed = '') => BRACKET_GROUP_REGEX.test(trimmed);

export const splitInlineTokens = (text = '') => {
  if (typeof text !== 'string') return [];

  const regex = /\s+|\([^)]*\)|\S+/g;
  return text.match(regex) || [];
};

const isGenericInstrumentSuffix = (value = '') => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !/[,&]/.test(trimmed);
};

export const mergeInstrumentPhraseTokens = (tokens = []) => {
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

export const splitParenthesizedMultiChordToken = (token = '', transpose = 0) => {
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

export const isInlineCueMarkToken = (token) => {
  if (typeof token !== 'string') return false;

  const trimmed = token.trim();
  if (!trimmed) return false;

  // Cue mark hanya dikenali di dalam braket siku: "[Stop]". "(Stop)" adalah
  // teks biasa, bukan keyword.
  if (!isBracketGroup(trimmed)) return false;
  const raw = trimmed.slice(1, -1).trim();
  if (!raw) return false;

  return normalizeCueMarkToken(raw);
};

export const isInlineInstrumentToken = (token) => {
  if (typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;

  // Hanya braket siku yang menandai keyword: "[Gitar]", "[Gitar: Dist]".
  // Tanpa braket ("Gitar:", "(Gitar)") kata itu bukan tag instrumen lagi.
  if (!isBracketGroup(trimmed)) return false;

  const inside = trimmed.slice(1, -1).trim();
  if (!inside) return false;

  const colonMatch = inside.match(/^([^:]+):\s*(.*)$/);
  if (colonMatch && matchInlineInstrumentLabel(colonMatch[1])) {
    return normalizeInstrumentDisplayLabel(inside);
  }

  // Isi braket berisi daftar instrumen ("[Gitar, Organ]") hanya perlu lolos
  // bila SETIAP bagiannya adalah instrumen.
  const parts = inside.split(/\s*[,;]\s*/).filter(Boolean);
  if (parts.length > 1) {
    if (!parts.every((part) => matchInlineInstrumentLabel(part))) return false;
    return parts.map((part) => normalizeInstrumentDisplayLabel(part)).filter(Boolean).join(', ');
  }

  if (matchInlineInstrumentLabel(inside)) {
    return normalizeInstrumentDisplayLabel(inside);
  }

  return false;
};
