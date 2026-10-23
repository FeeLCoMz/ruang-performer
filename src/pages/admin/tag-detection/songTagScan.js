/**
 * songTagScan.js
 *
 * Pemindaian tag pada lagu NYATA di database — pelengkap pratinjau deteksi
 * yang hanya menerima contoh tempel. Tujuannya menemukan baris berbentuk tag
 * ("[Jembatan]", "[Interlude]") yang oleh parser dibaca sebagai LIRIK karena
 * kata kuncinya belum terdaftar.
 *
 * Fungsi di sini murni (tidak menyentuh jaringan/React) sehingga hasil pindai
 * bisa diuji tanpa memuat halaman admin.
 *
 * Memakai summarizeDetection() — parser yang sama dengan tampilan lagu — agar
 * temuan di sini identik dengan yang dialami pengguna.
 */
import { summarizeDetection } from './detectionStats.js';

/**
 * Nama yang muncul di tag yang TIDAK dikenali. Format tag bisa:
 *   [Jembatan]            → nama: "Jembatan"
 *   [Gitar: Dist]         → nama: "Gitar"
 *   [Jembatan 2]          → nama: "Jembatan 2"
 * Nama dinormalkan ke huruf kecil agar "[Jembatan]" dan "[jembatan]" dihitung
 * sebagai satu temuan.
 */
const TAG_NAME_PATTERN = /^\[([^[\]:]+)(?::[^[\]]*)?\]$/;

export const tagNameFromLine = (line = '') => {
  const match = TAG_NAME_PATTERN.exec(String(line || '').trim());
  if (!match) return '';
  return match[1].trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Pindai satu lagu.
 *
 * @param {{ id?: string, title?: string, artist?: string, lyrics?: string }} song
 * @returns {{ song: object, tags: {name: string, line: string}[], lineCount: number } | null}
 *   null bila lagu tidak punya lirik (tidak ada yang bisa dipindai).
 */
export function scanSong(song = {}) {
  const lyrics = String(song?.lyrics || '');
  if (!lyrics.trim()) return null;

  const detection = summarizeDetection(lyrics);
  const tags = [];
  const seen = new Set();

  detection.unrecognized.forEach((row) => {
    const name = tagNameFromLine(row.label);
    if (!name || seen.has(name)) return;
    seen.add(name);
    tags.push({ name, line: row.label });
  });

  return {
    song,
    tags,
    lineCount: detection.total,
  };
}

/**
 * Pindai banyak lagu sekaligus, dikelompokkan per nama tag.
 *
 * Hasil diurutkan dari temuan terbanyak: tag yang paling sering muncul adalah
 * yang paling bernilai untuk ditambahkan ke daftar kata kunci.
 *
 * @param {object[]} songs
 * @param {{ limitSongs?: number }} [options]
 * @returns {{
 *   scannedSongs: number,
 *   skippedSongs: number,
 *   totalTags: number,
 *   findings: { name: string, count: number, samples: {id: string, title: string}[], example: string }[],
 *   truncated: boolean,
 * }}
 */
export function scanSongs(songs = [], { limitSongs = 500 } = {}) {
  const list = Array.isArray(songs) ? songs : [];
  const limited = list.slice(0, limitSongs);
  const byName = new Map();
  let scannedSongs = 0;
  let skippedSongs = 0;

  limited.forEach((song) => {
    const result = scanSong(song);
    if (!result) {
      skippedSongs += 1;
      return;
    }
    scannedSongs += 1;

    result.tags.forEach(({ name, line }) => {
      if (!byName.has(name)) {
        byName.set(name, { name, count: 0, samples: [], example: line });
      }
      const entry = byName.get(name);
      entry.count += 1;
      // Cukup beberapa contoh agar daftar tetap ringkas; admin hanya butuh
      // tahu lagu mana yang perlu diperiksa.
      if (entry.samples.length < 5) {
        entry.samples.push({
          id: String(song?.id || ''),
          title: String(song?.title || 'Tanpa judul'),
        });
      }
    });
  });

  const findings = [...byName.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    scannedSongs,
    skippedSongs,
    totalTags: findings.reduce((sum, item) => sum + item.count, 0),
    findings,
    truncated: list.length > limited.length,
  };
}

/**
 * Temuan yang belum ada di daftar kata kunci mana pun.
 *
 * Pindai bisa menemukan nama yang MENYERUPAI kata kunci terdaftar tetapi tetap
 * dibaca sebagai lirik (mis. "[Jembatan 2]" saat yang terdaftar hanya
 * "jembatan"). Menandainya membantu admin melihat bentuk varian.
 *
 * @param {Array<{name: string}>} findings
 * @param {string[]} keywords - kata kunci aktif semua grup
 */
export function filterNewFindings(findings = [], keywords = []) {
  const known = new Set((keywords || []).map((keyword) => String(keyword).toLowerCase().trim()));
  return (Array.isArray(findings) ? findings : []).filter((item) => !known.has(item.name));
}

export default {
  tagNameFromLine,
  scanSong,
  scanSongs,
  filterNewFindings,
};
