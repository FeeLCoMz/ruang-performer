/**
 * tagAudit.js
 *
 * Fungsi murni untuk audit & kesehatan daftar kata kunci tag:
 *   - diffKeywordLists : apa yang ditambah/dihapus pada satu daftar
 *   - diffGroupDraft   : bandingkan draft editor dengan daftar aktif
 *   - findKeywordConflicts : keyword yang terdaftar di lebih dari satu grup
 *   - describeDiff     : "+2 / −1" untuk label tombol simpan
 *
 * Dipisah dari hook agar bisa diuji tanpa React dan dipakai bersama oleh
 * TagGroupEditor (peringatan sebelum simpan) dan useChordDisplayTags
 * (pesan setelah simpan). Audit log sebenarnya ditulis SERVER
 * (server/handlers/settings.js) karena server melihat daftar lama & baru
 * sekaligus — client tidak perlu mengirim entri audit sendiri, yang bisa
 * duplikat atau tidak konsisten bila request gagal.
 */
import { normalizeKeyword } from '../../../config/chordDisplayTagGroups.js';

/** Batas entri yang ditampilkan per aksi agar ringkasan tetap terbaca. */
export const DIFF_PREVIEW_LIMIT = 8;

/**
 * Selisih antara dua daftar keyword.
 * Urutan dipertahankan mengikuti daftar setelah perubahan, jadi admin melihat
 * keyword baru di posisi yang ia ketik.
 *
 * @param {string[]} previous
 * @param {string[]} next
 * @returns {{added: string[], removed: string[], addedCount: number, removedCount: number}}
 */
export function diffKeywordLists(previous = [], next = []) {
  const before = [...new Set((previous || []).map(normalizeKeyword).filter(Boolean))];
  const after = [...new Set((next || []).map(normalizeKeyword).filter(Boolean))];
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  const added = after.filter((keyword) => !beforeSet.has(keyword));
  const removed = before.filter((keyword) => !afterSet.has(keyword));

  return {
    added,
    removed,
    addedCount: added.length,
    removedCount: removed.length,
  };
}

/**
 * Bandingkan draf editor (teks multiline) dengan daftar aktif.
 * Baris tidak valid diabaikan: tombol simpan sudah dinonaktifkan saat ada
 * error, jadi yang dihitung hanya perubahan yang benar-benar akan tersimpan.
 *
 * @param {string} draft - teks editor, satu keyword per baris/koma
 * @param {string[]} activeKeywords - daftar yang berlaku sekarang
 * @param {(text: string) => {value: string, reason: string}[]} parse - parseKeywordList
 */
export function diffGroupDraft(draft, activeKeywords, parse) {
  const parsed = typeof parse === 'function' ? parse(draft || '') : [];
  const next = parsed.filter((row) => !row.reason).map((row) => row.value);
  return diffKeywordLists(activeKeywords || [], next);
}

/** true bila ada tambahan atau penghapusan. */
export const hasDiff = (diff) => Boolean(diff && (diff.addedCount || diff.removedCount));

/** "+2 −1" (kosong bila tidak ada perubahan) — dipakai di tombol & banner. */
export function describeDiff(diff) {
  if (!hasDiff(diff)) return '';
  const parts = [];
  if (diff.addedCount) parts.push(`+${diff.addedCount}`);
  if (diff.removedCount) parts.push(`−${diff.removedCount}`);
  return parts.join(' ');
}

/**
 * Kata kunci yang muncul di lebih dari satu grup.
 *
 * Urutan grup menentukan pemenang saat parser memeriksa baris, jadi keyword
 * ganda adalah sumber bug yang tidak kasat mata: admin menambah "keys" ke
 * instrumen padahal kunci MIDI juga memakainya, dan hasilnya bergantung pada
 * urutan pengecekan, bukan pada maksud admin.
 *
 * @param {Record<string, string[]>} groups - keyword aktif per grup
 * @returns {{keyword: string, groups: string[]}[]}
 */
export function findKeywordConflicts(groups = {}) {
  const owners = new Map();

  Object.entries(groups || {}).forEach(([groupId, list]) => {
    if (!Array.isArray(list)) return;
    list.forEach((raw) => {
      const keyword = normalizeKeyword(raw);
      if (!keyword) return;
      if (!owners.has(keyword)) owners.set(keyword, []);
      const ids = owners.get(keyword);
      if (!ids.includes(groupId)) ids.push(groupId);
    });
  });

  return [...owners.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([keyword, ids]) => ({ keyword, groups: ids }));
}

/**
 * Konflik yang menyangkut satu grup saja — untuk peringatan di kartu grup.
 *
 * @param {string} groupId
 * @param {Record<string, string[]>} groups
 * @returns {{keyword: string, groups: string[]}[]}
 */
export const findGroupConflicts = (groupId, groups = {}) => findKeywordConflicts(groups)
  .filter((conflict) => conflict.groups.includes(groupId));

/**
 * Ambil daftar keyword dari draf lalu sisipkan ke grup — hasil untuk preview
 * konflik setelah draf DIUBAH sebelum disimpan.
 *
 * @param {string} draft
 * @param {(text: string) => {value: string, reason: string}[]} parse
 */
export const keywordsFromDraft = (draft, parse) => (typeof parse === 'function' ? parse(draft || '') : [])
  .filter((row) => !row.reason)
  .map((row) => row.value);

/**
 * Grup (selain grup yang diedit) agar peringatan bisa menyembunyikan konflik
 * yang memang sudah ada sejak bawaan kode — admin tidak perlu diberi tahu
 * ulang bahwa "keys" ada di dua grup bawaan kecuali ia mengubahnya.
 *
 * @param {Record<string, string[]>} groups - keyword aktif per grup
 * @param {Record<string, string[]>} fallbacks - keyword bawaan per grup
 * @returns {{keyword: string, groups: string[]}[]}
 */
export function findNewConflicts(groups = {}, fallbacks = {}) {
  const baseline = new Set(
    findKeywordConflicts(fallbacks).map((conflict) => conflict.keyword),
  );
  return findKeywordConflicts(groups)
    .filter((conflict) => !baseline.has(conflict.keyword));
}

/**
 * Tambahkan satu keyword ke teks draft.
 *
 * Dipakai input "tambah keyword" di samping textarea: admin yang hanya ingin
 * menambah satu kata tidak perlu menyentuh (dan berisiko merusak) baris lain.
 * Baris komentar ('#') dipertahankan apa adanya.
 *
 * @param {string} draft
 * @param {string} keyword - teks yang diketik admin (belum divalidasi)
 * @param {(text: string) => {value: string, reason: string}[]} parse - parseKeywordList
 * @returns {{ok: true, draft: string} | {ok: false, reason: string}}
 */
export function addKeywordToDraft(draft = '', keyword = '', parse) {
  const raw = String(keyword || '').trim();
  if (!raw) return { ok: false, reason: 'Kata kunci masih kosong' };

  const parsed = typeof parse === 'function' ? parse(raw) : [];
  const invalid = parsed.find((row) => row.reason);
  if (invalid) return { ok: false, reason: invalid.reason };
  if (!parsed.length) return { ok: false, reason: 'Kata kunci masih kosong' };

  const existing = new Set((typeof parse === 'function' ? parse(draft) : [])
    .filter((row) => !row.reason)
    .map((row) => row.value));

  const fresh = parsed.map((row) => row.value).filter((value) => !existing.has(value));
  if (!fresh.length) return { ok: false, reason: 'Kata kunci sudah ada di daftar' };

  const base = String(draft || '').replace(/\s+$/, '');
  const next = base ? `${base}\n${fresh.join('\n')}` : fresh.join('\n');
  return { ok: true, draft: next };
}

/**
 * Hapus satu keyword dari teks draft.
 *
 * Pencocokan memakai nilai ternormalisasi (huruf kecil, spasi dirapikan),
 * karena admin melihat chip dalam bentuk ternormalisasi. Baris komentar dan
 * baris tidak valid dibiarkan supaya menghapus satu chip tidak "membersihkan"
 * hal yang tidak diminta.
 *
 * @param {string} draft
 * @param {string} keyword - nilai yang akan dihapus
 * @param {(text: string) => {value: string, reason: string}[]} parse
 */
export function removeKeywordFromDraft(draft = '', keyword = '', parse) {
  const target = normalizeKeyword(keyword);
  if (!target) return String(draft || '');

  // Validasi tiap baris secara utuh: satu baris bisa memuat beberapa keyword
  // (dipisah koma/titik koma), jadi baris diurai ulang dan disatukan kembali.
  return String(draft || '')
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      const rows = typeof parse === 'function'
        ? trimmed.split(/[,;]/).map((token) => token.trim()).filter(Boolean)
        : [trimmed];
      const kept = rows.filter((row) => {
        const parsed = typeof parse === 'function' ? parse(row) : [];
        const valid = parsed.find((item) => !item.reason);
        // Baris tidak valid tidak boleh hilang karena tombol hapus keyword.
        if (!valid) return true;
        return valid.value !== target;
      });

      return kept.join(', ');
    })
    .filter((line) => line.trim() !== '')
    .join('\n');
}

export default {
  DIFF_PREVIEW_LIMIT,
  diffKeywordLists,
  diffGroupDraft,
  hasDiff,
  describeDiff,
  findKeywordConflicts,
  findGroupConflicts,
  keywordsFromDraft,
  findNewConflicts,
  addKeywordToDraft,
  removeKeywordFromDraft,
};
