/**
 * useMidiCueVersion.js
 *
 * Menghasilkan angka versi yang berubah setiap status modul MIDI Cue berubah.
 *
 * Masalah yang dipecahkan: ChordDisplay memakai useMemo berdasarkan teks lirik
 * saja. Saat modul MIDI Cue dimatikan, parser akan mengembalikan `midi: null`,
 * tetapi memo tidak tahu ada yang berubah sehingga badge cue lama tetap tampil.
 * Komponen cukup menyertakan nilai hook ini ke dependency useMemo-nya.
 *
 * Returns: number (0, 1, 2, ...)
 */
import { useEffect, useState } from 'react';
import { isMidiCueEnabled, subscribeMidiCueEnabled } from './midiCueSettings.js';

export const useMidiCueVersion = () => {
  const [version, setVersion] = useState(() => (isMidiCueEnabled() ? 0 : -1));

  useEffect(() => subscribeMidiCueEnabled((enabled) => {
    setVersion((prev) => (enabled ? Math.abs(prev) + 1 : -(Math.abs(prev) + 1)));
  }), []);

  return version;
};

export default useMidiCueVersion;
