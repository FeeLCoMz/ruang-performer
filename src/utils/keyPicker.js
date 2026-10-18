
/* ======== Key picker: daftar key musik untuk pemilihan langsung ======== */
/* 24 key (12 root × mayor/minor) — tata urut kromatik dari C supaya berurutan
   dan mudah dicari (C, Db, D, Eb, E, F, ...). */
export const MUSICAL_KEYS = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'Dbm', 'Dm', 'Ebm', 'Em', 'Fm', 'Gbm', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm',
];

/* Daftar key MAYOR saja (12 root), urut kromatik dari C. */
export const MUSICAL_KEYS_MAJOR = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

/* Daftar key MINOR saja (12 root), urut kromatik dari Cm. */
export const MUSICAL_KEYS_MINOR = [
  'Cm', 'Dbm', 'Dm', 'Ebm', 'Em', 'Fm', 'Gbm', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm',
];

/**
 * Deteksi key dari string lagu (root + mayor/menor berdasarkan suffix 'm').
 * Fallback: null bila tidak sesuai format.
 */
export const parseKeyLabel = (key) => {
  if (typeof key !== 'string') return null;
  const match = key.trim().match(/^([A-G][#b]?)(m)?$/i);
  if (!match) return null;
  const root = match[1];
  const isMinor = Boolean(match[2]);
  // Normalisasi: tampilkan seperti di MUSICAL_KEYS (mayor kapital polos, minor + 'm').
  return isMinor ? `${root}m` : root;
};
