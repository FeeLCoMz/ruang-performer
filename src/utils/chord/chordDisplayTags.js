/**
 * chordDisplayTags.js — KATA KUNCI AKTIF ChordDisplay (pengaturan GLOBAL)
 * =====================================================================
 * Parser, editor, autocomplete, dan bulk import membaca daftar kata kunci
 * lewat modul ini — bukan langsung dari chordDisplayConfig.js — supaya
 * perubahan yang dibuat Administrator (halaman /admin, tab "Tag & Deteksi")
 * berlaku untuk SEMUA user di SEMUA perangkat.
 *
 * Sumber data (urutan prioritas):
 *   1. Pengaturan global di database → GET /api/settings/chordDisplayTags
 *   2. Cache localStorage            → dipakai saat aplikasi dimuat / offline
 *   3. Bawaan kode                   → src/config/chordDisplayTagGroups.js
 *
 * Penyimpanan (khusus admin, diperiksa server):
 *   - setTagGroupKeywords() → PUT /api/settings/chordDisplayTags
 *   - resetTagGroup()       → PUT tanpa grup itu (DELETE bila tak ada lagi)
 *   - resetAllTagGroups()   → DELETE /api/settings/chordDisplayTags
 *
 * Modul ini tidak mengimpor chordDisplayConfig.js: config sendiri membaca
 * modul ini (alias & tone seksi yang aktif), sehingga impor balik akan
 * membentuk siklus ESM. Karena itu semua bawaan diambil dari
 * chordDisplayTagGroups.js, dan regex chord (tidak dapat diubah admin) tetap
 * tinggal di chordDisplayConfig.js.
 *
 * Semua fungsi pembaca memakai versi TERBARU (getChordDisplayTags()), juga
 * saat modul diimpor sebelum admin sempat mengubah apa pun. Regex turunan
 * dibuat ulang hanya ketika daftar berubah (cache dengan sidik jari daftar).
 *
 * API:
 *   - getChordDisplayTags()            -> { STRUCTURE_SECTION_KEYWORDS, ... }
 *   - loadChordDisplayTags({force})    -> Promise: muat pengaturan global
 *   - setTagGroupKeywords(id, list)    -> Promise: simpan satu grup (global)
 *   - resetTagGroup(id)                -> Promise: kembali ke bawaan
 *   - resetAllTagGroups()              -> Promise: kembali ke bawaan semua grup
 *   - getOverriddenGroupIds()          -> grup yang berbeda dari bawaan
 *   - subscribeChordDisplayTags(fn)    -> unsubscribe (perubahan & antar tab)
 */
import * as tagGroupConfig from '../../config/chordDisplayTagGroups.js';
import { deleteAppSetting, getAppSetting, saveAppSetting } from '../../apiClient.js';

/** Key baris di tabel app_settings (lihat server/handlers/settings.js). */
export const SETTINGS_KEY = 'chordDisplayTags';

/** Cache global terakhir — dipakai saat offline & sebelum API selesai dimuat. */
const CACHE_STORAGE_KEY = 'ruang-performer:chorddisplay:tags-cache-v1';

/**
 * Akses LAZY ke chordDisplayTagGroups.js.
 *
 * Config tersebut membaca chordDisplayConfig.js, sementara chordDisplayConfig
 * mengimpor modul ini (alias & tone seksi yang aktif). Dalam siklus ESM, nilai
 * `import { X }` pada modul pertama kali dimuat masih belum terinisialisasi.
 * Namespace import (`* as`) menyelesaikan masalah itu: binding-nya baru dibaca
 * ketika fungsi di bawah dipanggil, saat kedua modul sudah selesai dimuat.
 */
const tagGroups = () => (
  typeof tagGroupConfig.getTagGroups === 'function' ? tagGroupConfig.getTagGroups() : []
);
const getTagGroup = (id) => (
  typeof tagGroupConfig.getTagGroup === 'function' ? tagGroupConfig.getTagGroup(id) : null
);
const normalizeKeyword = (value = '') => (
  typeof tagGroupConfig.normalizeKeyword === 'function'
    ? tagGroupConfig.normalizeKeyword(value)
    : String(value).trim().toLowerCase().replace(/\s+/g, ' ')
);

/** Alias seksi bawaan (dibaca lazy untuk menghindari siklus impor ESM). */
const defaultSectionAliases = () => (
  typeof tagGroupConfig.getDefaultSectionAliases === 'function'
    ? tagGroupConfig.getDefaultSectionAliases()
    : {}
);

/**
 * Nilai bawaan per grup. Dihitung malas (saat pertama dipakai) — bukan saat
 * modul dimuat — karena chordDisplayConfig.js mengimpor modul ini untuk alias
 * & tone seksi. Menghitungnya saat import akan mengenai siklus ESM: daftar
 * bawaan di config belum terinisialisasi.
 */
let fallbacksByGroup = null;
const fallbacks = () => {
  if (!fallbacksByGroup) {
    fallbacksByGroup = Object.freeze(Object.fromEntries(
      tagGroups().map((group) => [group.id, Object.freeze([...group.fallback])]),
    ));
  }
  return fallbacksByGroup;
};

const listeners = new Set();

// Regex turunan (set + pola) harus murah: isMetadataLine & parseSection
// dipanggil untuk setiap baris. Cache dibuang hanya saat daftar berubah,
// bukan tiap pembacaan localStorage.
let memo = null;
const derivedCache = {
  metadataKeys: null,
  instrumentSet: null,
  cueMarkSet: null,
  sectionPatterns: null,
  structureAlternation: null,
};

const invalidateDerived = () => {
  derivedCache.metadataKeys = null;
  derivedCache.instrumentSet = null;
  derivedCache.cueMarkSet = null;
  derivedCache.sectionPatterns = null;
  derivedCache.structureAlternation = null;
};

/** Ambil hanya grup yang dikenal, array teks, tanpa duplikat. */
const sanitizeGroups = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const groups = {};
  tagGroups().forEach((group) => {
    const list = value[group.id];
    if (!Array.isArray(list)) return;
    const cleaned = [...new Set(list.map(normalizeKeyword).filter(Boolean))];
    if (cleaned.length) groups[group.id] = cleaned;
  });
  return groups;
};

const readCache = () => {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? sanitizeGroups(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const writeCache = (groups) => {
  try {
    if (groups) {
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(groups));
    } else {
      window.localStorage.removeItem(CACHE_STORAGE_KEY);
    }
  } catch {
    // localStorage bisa gagal (private mode); data tetap didapat dari API.
  }
};

/** Baca satu grup: versi global bila ada, selain itu bawaan. */
export const readTagGroupKeywords = (groupId) => {
  if (!getTagGroup(groupId)) return [];
  return currentGroups()[groupId] || [];
};

const buildMemo = (storedGroups) => {
  const groups = {};
  const groupsList = tagGroups();
  groupsList.forEach((group) => {
    const list = storedGroups?.[group.id];
    groups[group.id] = list && list.length ? list : fallbacks()[group.id];
  });

  // Alias seksi aktif. Admin yang menghapus kata kunci alias berarti
  // menghapus alias itu juga; alias yang bentuk bakunya dihapus tidak berguna
  // lagi sehingga ikut dibuang.
  const aliases = {};
  // Alias bawaan diambil langsung dari config (bukan dari grup admin) supaya
  // panel admin hanya mengatur daftar kata kunci dan modul ini bebas siklus
  // impor terhadap config.
  const defaultAliases = defaultSectionAliases();
  Object.entries(defaultAliases).forEach(([alias, canonical]) => {
    if (groups.sections.includes(alias) && groups.sections.includes(canonical)) {
      aliases[alias] = canonical;
    }
  });

  memo = { groups, aliases };
  // Jangan simpan cache yang dibangun sebelum config siap (siklus impor):
  // grup akan kosong dan parser diam-diam tidak mengenali apa pun.
  if (groupsList.some((group) => !(groups[group.id] || []).length)) memo = null;
  invalidateDerived();
  return memo || { groups, aliases };
};

/** Grup aktif (selain bawaan) — dipakai saat menyimpan ke server. */
const currentGroups = () => {
  const { groups } = memo || buildMemo(readCache());
  return groups;
};

/* ------------------------------------------------------------------ */
/* Muat dari server                                                     */
/* ------------------------------------------------------------------ */

let loadPromise = null;

/**
 * Muat pengaturan GLOBAL dari API. Dipanggil sekali saat aplikasi start
 * (lihat main.jsx / App) dan setelah login. Aman dipanggil berkali-kali:
 * request yang sedang berjalan dipakai bersama, kecuali `force`.
 *
 * Bila server tidak tersedia (offline), cache localStorage / bawaan dipakai
 * sehingga aplikasi tetap berjalan.
 *
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<object>} daftar tag aktif setelah dimuat
 */
export const loadChordDisplayTags = ({ force = false } = {}) => {
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    let groups = null;
    try {
      const data = await getAppSetting(SETTINGS_KEY);
      groups = sanitizeGroups(data?.settings?.[SETTINGS_KEY]);
    } catch {
      // Offline / belum login / server tidak tersedia: lanjut ke cache lalu
      // bawaan. Jangan mengosongkan daftar hanya karena API gagal.
    }

    if (groups) writeCache(groups);
    else groups = readCache();

    buildMemo(groups);
    notify();
    return getChordDisplayTags();
  })();

  return loadPromise;
};

/**
 * Seluruh kata kunci aktif, dengan nama yang sama seperti di
 * chordDisplayConfig.js agar import lama tinggal diganti sumbernya.
 */
export const getChordDisplayTags = () => {
  // buildMemo() mengembalikan hasil mentah bila cache tidak boleh disimpan
  // (config belum siap saat modul pertama dimuat); jangan baca `memo` lagi.
  const { groups, aliases } = memo || buildMemo(readCache());

  return {
    STRUCTURE_SECTION_KEYWORDS: groups.sections,
    SECTION_NAME_ALIASES: aliases,
    METADATA_KEYS: groups.metadata,
    INSTRUMENT_KEYWORDS: groups.instruments,
    NO_CHORD_TOKENS: groups.noChord,
    MIDI_ROUTING_KEYS: groups.midiKeys,
  };
};

/**
 * Daftar metadata yang dipakai parser.
 *
 * Dulu isinya digabung dengan grup "petunjuk permainan" terpisah; sekarang
 * keduanya (dan cue mark) sudah satu grup metadata, jadi ini tinggal
 * mengembalikan daftar aktif apa adanya.
 */
export const getActiveMetadataKeys = () => [...new Set(getChordDisplayTags().METADATA_KEYS)];

/* ------------------------------------------------------------------ */
/* Turunan (set + regex) dengan cache                                   */
/* ------------------------------------------------------------------ */

const fingerprint = (list) => `${list.length}\u0001${list.join('\u0002')}`;

/**
 * Daftar key MIDI efektif, termasuk instrumen yang juga diklaim MIDI hanya
 * di level config ('keys') agar tetap berlaku walau daftar instrumen diedit.
 */
const midiKeysWithInstruments = () => getChordDisplayTags().MIDI_ROUTING_KEYS;

/** Set huruf kecil untuk pencarian O(1). */
export const getInstrumentSet = () => {
  const list = getChordDisplayTags().INSTRUMENT_KEYWORDS;
  const key = fingerprint(list);
  if (derivedCache.instrumentSet?.key !== key) {
    derivedCache.instrumentSet = { key, set: new Set(list.map(normalizeKeyword)) };
  }
  return derivedCache.instrumentSet.set;
};

/** Set metadata aktif (semua key metadata, termasuk petunjuk & cue mark). */
export const getMetadataKeySet = () => {
  const metadata = getChordDisplayTags().METADATA_KEYS;
  const key = fingerprint(metadata);
  if (derivedCache.metadataKeys?.key !== key) {
    derivedCache.metadataKeys = {
      key,
      set: new Set(metadata.map(normalizeKeyword)),
    };
  }
  return derivedCache.metadataKeys.set;
};

/**
 * Pola kata utuh per keyword seksi, di-cache seperti regex di sections.js.
 * `createPattern(keyword)` disediakan pemanggil agar modul ini tidak perlu
 * mengimpor utilitas parser (menghindari siklus impor).
 */
export const getSectionKeywordPatterns = (createPattern) => {
  const list = getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS;
  const key = fingerprint(list);
  if (derivedCache.sectionPatterns?.key !== key) {
    derivedCache.sectionPatterns = {
      key,
      patterns: list.map((keyword) => ({ keyword, pattern: createPattern(keyword) })),
    };
  }
  return derivedCache.sectionPatterns.patterns;
};

/** Alternation regex keyword seksi (dipakai bulk import & config turunan). */
export const getStructureAlternation = (buildAlternation) => {
  const list = getChordDisplayTags().STRUCTURE_SECTION_KEYWORDS;
  const key = fingerprint(list);
  if (derivedCache.structureAlternation?.key !== key) {
    derivedCache.structureAlternation = { key, value: buildAlternation(list) };
  }
  return derivedCache.structureAlternation.value;
};

/** Daftar kata kunci MIDI efektif (routing + instrumen yang juga key MIDI). */
export const getMidiKeyWords = () => midiKeysWithInstruments();

/* ------------------------------------------------------------------ */
/* Daftar turunan untuk autocomplete (lihat AUTOCOMPLETE_* config)      */
/* ------------------------------------------------------------------ */

/** Label kanonik seksi, tanpa alias, tanpa duplikat (kapitalisasi via callback). */
export const getAutocompleteSectionLabels = (titleCase) => {
  const tags = getChordDisplayTags();
  const seen = new Set();
  return tags.STRUCTURE_SECTION_KEYWORDS
    .map((keyword) => titleCase(tags.SECTION_NAME_ALIASES[normalizeKeyword(keyword)] || normalizeKeyword(keyword)))
    .filter((label) => {
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
};

/** Nama instrumen untuk autocomplete (kapitalisasi via callback). */
export const getAutocompleteInstruments = (titleCase) => (
  [...new Set(getChordDisplayTags().INSTRUMENT_KEYWORDS.map(titleCase))]
);

/**
 * Baris contoh yang dipakai preview panel admin: satu baris untuk setiap
 * jenis tag yang sedang aktif, sehingga perubahan daftar langsung terlihat
 * hasil deteksinya.
 */
export const buildTagPreviewSample = () => {
  const tags = getChordDisplayTags();
  // Kapitalisasi cukup di huruf pertama kata; titleCaseKeyword tidak diimpor
  // di sini agar modul ini tetap bebas dari siklus impor config.
  const first = (list) => (list[0]
    ? String(list[0]).replace(/(^|[\s-])([a-z])/g, (_, sep, letter) => sep + letter.toUpperCase())
    : null);

  const lines = [];
  const section = first(tags.STRUCTURE_SECTION_KEYWORDS);
  if (section) lines.push(`[${section}]`);
  const metadata = first(getActiveMetadataKeys());
  if (metadata) lines.push(`[${metadata}: contoh]`);
  const instrument = first(tags.INSTRUMENT_KEYWORDS);
  if (instrument) lines.push(`[${instrument}: Dist]`);
  if (tags.NO_CHORD_TOKENS.length) lines.push('| N.C. |');
  lines.push('| C | G | Am | F |');

  return lines.join('\n');
};

/* ------------------------------------------------------------------ */
/* Mutasi + langganan                                                   */
/* ------------------------------------------------------------------ */

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(getChordDisplayTags());
    } catch {
      // satu listener error tidak boleh menghentikan yang lain
    }
  });
};

/** Grup yang isinya berbeda dari bawaan. */
const overriddenIdsFrom = (groups) => tagGroups()
  .filter((group) => {
    const current = groups[group.id] || [];
    const fallback = fallbacks()[group.id] || [];
    return current.length !== fallback.length
      || current.some((keyword, index) => keyword !== fallback[index]);
  })
  .map((group) => group.id);

/**
 * Kirim seluruh daftar grup ke server. PUT selalu mengirim semua grup karena
 * baris app_settings disimpan sebagai satu dokumen JSON.
 */
const saveGroups = async (groups) => {
  const payload = Object.fromEntries(
    tagGroups().map((group) => [group.id, groups[group.id] || []]),
  );

  try {
    const data = await saveAppSetting(SETTINGS_KEY, payload);
    const saved = sanitizeGroups(data?.setting?.value) || sanitizeGroups(payload) || {};
    writeCache(saved);
    buildMemo(saved);
    notify();
    return { ok: true, groups: saved };
  } catch (error) {
    return { ok: false, reason: error?.message || 'Tidak dapat menghubungi server' };
  }
};

/**
 * Simpan daftar keyword satu grup secara GLOBAL (semua user, semua perangkat).
 * Daftar dinormalisasi (huruf kecil, tanpa duplikat). Daftar kosong ditolak —
 * gunakan resetTagGroup() untuk kembali ke bawaan.
 */
export const setTagGroupKeywords = async (groupId, keywords = []) => {
  if (!getTagGroup(groupId)) return { ok: false, reason: 'Grup tidak dikenal' };

  const cleaned = [...new Set((keywords || []).map(normalizeKeyword).filter(Boolean))];
  if (!cleaned.length) return { ok: false, reason: 'Daftar keyword tidak boleh kosong' };

  return saveGroups({ ...currentGroups(), [groupId]: cleaned });
};

/** Kembalikan satu grup ke bawaan untuk semua user. */
export const resetTagGroup = async (groupId) => {
  if (!getTagGroup(groupId)) return { ok: false, reason: 'Grup tidak dikenal' };

  const next = { ...currentGroups() };
  delete next[groupId];
  // Tidak ada lagi grup yang diatur admin → hapus baris pengaturan global.
  if (!overriddenIdsFrom(next).length) return resetAllTagGroups();
  return saveGroups(next);
};

/** Kembalikan SEMUA grup ke bawaan (hapus pengaturan global). */
export const resetAllTagGroups = async () => {
  try {
    await deleteAppSetting(SETTINGS_KEY);
    writeCache(null);
    buildMemo(null);
    notify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || 'Tidak dapat menghubungi server' };
  }
};

/** Daftar id grup yang saat ini berbeda dari bawaan. */
export const getOverriddenGroupIds = () => overriddenIdsFrom(currentGroups());

export const isTagGroupOverridden = (groupId) => getOverriddenGroupIds().includes(groupId);

/** Jumlah keyword bawaan satu grup (untuk keterangan "12 / 14"). */
export const getTagGroupFallback = (groupId) => fallbacks()[groupId] || [];

export const subscribeChordDisplayTags = (listener) => {
  if (typeof listener !== 'function') return () => {};
  const handler = () => listener(getChordDisplayTags());
  listeners.add(handler);
  // Sinkron antar tab: cache lokal berubah (mis. setelah admin menyimpan di
  // tab lain) → muat ulang pengaturan global dari server.
  const onStorage = (event) => {
    if (event.key === CACHE_STORAGE_KEY) loadChordDisplayTags({ force: true });
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(handler);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
};

/** Untuk test / logout: lupakan cache dan paksa muat ulang dari server. */
export const clearChordDisplayTagsCache = () => {
  memo = null;
  invalidateDerived();
  loadPromise = null;
  writeCache(null);
};

/** Ringkasan jumlah tag aktif (dipakai panel admin untuk kartu statistik). */
export const summarizeActiveTags = () => {
  const tags = getChordDisplayTags();
  return {
    sections: tags.STRUCTURE_SECTION_KEYWORDS.length,
    aliases: Object.keys(tags.SECTION_NAME_ALIASES).length,
    metadata: getActiveMetadataKeys().length,
    instruments: tags.INSTRUMENT_KEYWORDS.length,
    noChord: tags.NO_CHORD_TOKENS.length,
    midiKeys: getMidiKeyWords().length,
  };
};

export { tagGroups as CHORD_DISPLAY_TAG_GROUPS, fallbacks as FALLBACKS };
