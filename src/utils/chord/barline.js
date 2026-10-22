/**
 * barline.js
 *
 * Utilitas format teks chord berbasis barline (|, ||, |:, :|):
 * merapikan spasi di sekitar barline, menyejajarkan kolom bar, dan memecah
 * baris menjadi N bar per baris.
 */

const BARLINE_SOURCE = '\\|:|:\\||\\|\\||\\|';
const BARLINE_REGEX_GLOBAL = new RegExp(`(${BARLINE_SOURCE})`, 'g');
const BARLINE_TEST_REGEX = new RegExp(BARLINE_SOURCE);
const BARLINE_TOKEN_REGEX = new RegExp(`^(${BARLINE_SOURCE})$`);

const hasBarline = (line) => BARLINE_TEST_REGEX.test(line);
const isBarToken = (token) => BARLINE_TOKEN_REGEX.test(token);

/** Pastikan ada satu spasi di kiri-kanan barline. */
const padBarlineSpacing = (line) => line
  .replace(/([^\s|])(\|:|:\||\|\||\|)/g, '$1 $2')
  .replace(/(\|:|:\||\|\||\|)([^\s|])/g, '$1 $2');

/**
 * Sejajarkan posisi barline pada teks multiline.
 * Dipakai di mode edit lirik untuk merapikan teks chord yang dipilih.
 *
 * @param {string} text - Potongan teks yang dipilih
 * @returns {string}
 */
export function alignSelectedBarlines(text) {
  if (typeof text !== 'string' || !text) return text;

  const normalizeBarSpacing = (line) => {
    if (!hasBarline(line)) return line;

    return padBarlineSpacing(line)
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
    BARLINE_REGEX_GLOBAL.lastIndex = 0;
    let match;
    while ((match = BARLINE_REGEX_GLOBAL.exec(line)) !== null) {
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

  const normalizeBarSpacing = (line) => {
    if (!hasBarline(line)) return line;
    return padBarlineSpacing(line)
      .replace(/\s+/g, ' ')
      .trim();
  };

  const wrapped = text.split(/\r?\n/).flatMap((line) => {
    const normalized = normalizeBarSpacing(line);
    if (!hasBarline(normalized)) return [line];

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
