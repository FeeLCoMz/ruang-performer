/**
 * sourceFile.js
 *
 * Helper untuk test "guard" yang membaca source code langsung (bukan lewat
 * HTTP/import) lalu meng-assert keberadaan string tertentu.
 *
 * Mengapa helper ini ada:
 *
 * `readFileSync`/`vite`-style import yang gagal TIDAK membuat assertion gagal
 * dengan pesan yang jelas — di beberapa pola (mis. path dipindah) file terbaca
 * sebagai string kosong, dan assertion berbentuk `expect(src).not.toContain(x)`
 * lolos secara palsu. Itu pernah terjadi: handler pindah dari `api/songs/` ke
 * `server/handlers/`, guard tetap hijau padahal tidak memeriksa apa pun.
 *
 * `readSource()` di sini melempar error yang menyebut path absolut segera,
 * sehingga test gagal keras dan penyebabnya langsung terlihat.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Folder `src/__tests__` (tempat helper ini berada). */
export const TESTS_DIR = dirname(fileURLToPath(import.meta.url));

/** Akar proyek: naik tiga level dari `src/__tests__/helpers/` → src → proyek. */
export const PROJECT_ROOT = join(TESTS_DIR, '..', '..', '..');

/**
 * Baca file source relatif terhadap akar proyek.
 *
 * @param {string} relPath - Mis. 'server/handlers/songs.js'.
 * @param {object} [options]
 * @param {number} [options.minLength=1] - Panjang minimum isi yang dianggap valid.
 * @returns {string} Isi file (tidak di-trim).
 * @throws {Error} Bila file tidak ada, bukan file, atau terlalu pendek.
 */
export function readSource(relPath, { minLength = 1 } = {}) {
  const absolutePath = join(PROJECT_ROOT, relPath);

  if (!existsSync(absolutePath)) {
    throw new Error(
      `[sourceFile] File tidak ditemukan: ${absolutePath}\n`
      + `Path relatif: ${relPath}\n`
      + 'Kemungkinan file dipindah/di-rename. Perbarui path di test guard ini — '
      + 'jangan biarkan guard lolos karena source kosong.',
    );
  }

  if (!statSync(absolutePath).isFile()) {
    throw new Error(`[sourceFile] Bukan file: ${absolutePath}`);
  }

  const source = readFileSync(absolutePath, 'utf8');

  if (source.trim().length < minLength) {
    throw new Error(
      `[sourceFile] Isi file terlalu pendek (${source.trim().length} karakter) `
      + `dari ${relative(PROJECT_ROOT, absolutePath)}. Guard tidak bisa memeriksa apa pun.`,
    );
  }

  return source;
}

/** Versi yang langsung membuang komentar, untuk assertion berbasis kode. */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/[^\r\n]*/g, ''))
    .join('\n');
}

export default readSource;
