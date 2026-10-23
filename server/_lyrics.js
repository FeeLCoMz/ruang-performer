/**
 * lyricsWhitespace.js (server)
 *
 * Cermin tipis dari src/utils/chord/lyricsWhitespace.js untuk POST/PUT lagu.
 *
 * Client sudah merapikan lirik sebelum mengirim, tapi API bisa dipanggil
 * langsung (bulk import, tool restore, script). Normalisasi di sini menjaga
 * satu aturan penyimpanan: tidak ada spasi di ujung baris, tidak ada baris
 * kosong ganda, tidak ada baris kosong di awal/akhir.
 *
 * Salinan dibuat kecil dan tanpa impor dari src/ karena handler server
 * di-bundle terpisah dari aplikasi React.
 */

/** Normalisasi akhir baris (CRLF/CR -> LF) dan buang karakter arah tak terlihat. */
export const normalizeLyricsLineEndings = (text = '') => String(text || '')
  .replace(/\r\n?/g, '\n')
  .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');

/**
 * Rapikan trailing whitespace + baris kosong ganda pada lirik yang akan
 * disimpan. Spasi di TENGAH baris dibiarkan: pada chart, jarak antar chord
 * adalah penanda posisi.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeLyricsForStorage(text) {
  if (typeof text !== 'string') return '';
  if (!text) return text;

  return normalizeLyricsLineEndings(text)
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    // Tiga newline = dua baris kosong; sisakan satu baris kosong saja.
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
}
