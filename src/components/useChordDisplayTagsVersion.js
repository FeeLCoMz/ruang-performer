/**
 * useChordDisplayTagsVersion.js
 *
 * Angka versi yang berubah setiap daftar tag ChordDisplay berubah — baik karena
 * admin menyimpan pengaturan global, pengguna lain menyimpannya, maupun aplikasi
 * baru selesai memuat pengaturan dari server.
 *
 * Masalah yang dipecahkan: ChordDisplay mem-parse lirik dengan useMemo yang
 * dependensinya hanya teks lirik. Tanpa versi ini, perubahan daftar tag (mis.
 * keyword section baru dari admin) tidak terlihat sampai halaman direload.
 *
 * Pemakaian:
 *   const tagsVersion = useChordDisplayTagsVersion();
 *   const parsed = useMemo(() => parseLines(lines), [lines, tagsVersion]);
 *
 * Returns: number (0, 1, 2, ...)
 */
import { useEffect, useState } from 'react';
import { subscribeChordDisplayTags } from '../utils/chord/chordDisplayTags.js';

export const useChordDisplayTagsVersion = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeChordDisplayTags(() => {
    setVersion((prev) => prev + 1);
  }), []);

  return version;
};

export default useChordDisplayTagsVersion;
