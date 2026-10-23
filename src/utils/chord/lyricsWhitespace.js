/**
 * lyricsWhitespace.js
 *
 * Satu aturan perapian whitespace lirik, dipakai parser ChordDisplay DAN
 * penyimpanan (client + server).
 *
 * Modul ini sengaja tidak mengimpor apa pun: parsing.js membutuhkannya, dan
 * lyricsEditorUtils.js (yang mengimpor parsing lewat barrel chord) juga
 * memakainya — menaruhnya di salah satu modul itu akan membentuk siklus impor.
 *
 * Aturan:
 *   - spasi/tab di AKHIR baris dibuang (indentasi awal dipertahankan: kolom
 *     chord di atas lirik bergantung padanya);
 *   - baris yang hanya berisi spasi menjadi baris kosong;
 *   - maksimal SATU baris kosong berurutan;
 *   - baris kosong di awal/akhir dokumen dibuang.
 *
 * Spasi ganda di TENGAH baris TIDAK dirapatkan: pada chart, jarak antar chord
 * adalah penanda posisi.
 */

/** Normalisasi akhir baris (CRLF/CR -> LF) dan buang karakter arah tak terlihat. */
export const normalizeLyricsLineEndings = (text = '') =>
  String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');

/**
 * Buang spasi/tab di akhir SETIAP baris + rapikan baris kosong ganda, TANPA
 * menyentuh baris kosong di awal/akhir dokumen.
 *
 * Dipakai parser: jumlah baris harus tetap sama dengan teks asli, karena
 * `sourceLine` pada hasil parse dipakai untuk sinkronisasi editor <-> preview.
 *
 * @param {string} text
 * @returns {string}
 */
export function compactLyricsBlankLines(text) {
  if (typeof text !== 'string' || !text) return typeof text === 'string' ? text : '';

  return (
    normalizeLyricsLineEndings(text)
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, ''))
      .join('\n')
      // Tiga newline = dua baris kosong; sisakan satu baris kosong saja.
      .replace(/\n{3,}/g, '\n\n')
  );
}

/**
 * Sama seperti compactLyricsBlankLines, ditambah buang baris kosong di awal dan
 * akhir dokumen. Inilah bentuk yang disimpan ke database.
 *
 * @param {string} text
 * @returns {string}
 */
export function trimLyricsTrailingWhitespace(text) {
  return compactLyricsBlankLines(text).replace(/^\n+|\n+$/g, '');
}

export default trimLyricsTrailingWhitespace;
