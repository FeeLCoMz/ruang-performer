/**
 * detectionStats.js
 *
 * Ringkasan hasil deteksi ChordDisplay untuk preview di tab "Tag & Deteksi":
 * berapa baris yang terbaca sebagai seksi, metadata,
 * instrumen, chord, dan lirik — beserta tag yang TIDAK dikenali.
 *
 * Memakai classifyLine() dari parser yang sama dengan tampilan lagu
 * (chordUtils), jadi preview di halaman admin benar-benar mencerminkan hasil
 * di ChordDisplay, bukan pencocokan teks terpisah yang bisa menyimpang.
 */
// Barrel chord/index.js dipakai seperti di seluruh aplikasi; modul di bawahnya
// sengaja dijaga bebas siklus impor agar aman diimpor lebih dulu (admin page).
import { classifyLine } from '../../../utils/chordUtils.js';

export const DETECTION_KINDS = [
  { id: 'structure', label: 'Struktur', icon: '🎬' },
  { id: 'metadata', label: 'Metadata', icon: '🏷️' },
  { id: 'instrument', label: 'Instrumen', icon: '🎸' },
  { id: 'chord', label: 'Baris chord', icon: '🎵' },
  { id: 'number', label: 'Not angka', icon: '🎼' },
  { id: 'lyrics', label: 'Lirik', icon: '📝' },
];

/**
 * @param {string} text
 * @returns {{
 *   counts: Record<string, number>,
 *   total: number,
 *   lines: { lineNumber: number, kind: string, label: string }[],
 *   unrecognized: { lineNumber: number, label: string }[],
 * }}
 */
export const summarizeDetection = (text = '') => {
  const lines = String(text || '').split(/\r?\n/);
  const counts = Object.fromEntries(DETECTION_KINDS.map((kind) => [kind.id, 0]));
  const classified = [];
  const unrecognized = [];

  lines.forEach((line, index) => {
    const trimmed = String(line || '').trim();
    if (!trimmed) return;

    const result = classifyLine(trimmed) || { kind: 'empty' };
    const kind = result.kind === 'empty' ? 'lyrics' : result.kind;
    counts[kind] = (counts[kind] || 0) + 1;

    classified.push({
      lineNumber: index + 1,
      kind,
      label: String(result.label || result.text || trimmed).slice(0, 90),
    });

    // Baris yang hanya jadi lirik padahal berbentuk tag ("[Sesuatu]") biasanya
    // tanda kata kunci belum terdaftar — justru inilah yang dicari admin.
    if (kind === 'lyrics' && /^\[[^[\]]+\]$/.test(trimmed)) {
      unrecognized.push({ lineNumber: index + 1, label: trimmed });
    }
  });

  return {
    counts,
    total: classified.length,
    lines: classified,
    unrecognized,
  };
};

export default summarizeDetection;
