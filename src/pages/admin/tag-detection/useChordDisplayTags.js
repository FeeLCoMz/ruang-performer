/**
 * useChordDisplayTags.js
 *
 * State panel "Tag & Deteksi": daftar kata kunci per grup, teks yang sedang
 * diedit, error validasi, serta preview hasil deteksi.
 *
 * Simpan manual (bukan per ketikan) supaya admin bisa melihat pratinjau dan
 * memperbaiki typo. Penyimpanan bersifat GLOBAL: daftar dikirim ke
 * /api/settings/chordDisplayTags sehingga berlaku untuk semua pengguna.
 *
 * Audit log TIDAK ditulis di sini: server mencatat TAG_DETECTION_* berikut diff
 * lama→baru (server/handlers/settings.js) karena hanya server yang tahu daftar
 * lama yang benar. Yang ditampilkan hook ini adalah akibatnya bagi admin:
 * ringkasan perubahan (banner) dan konflik antar grup (peringatan).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatKeywordList,
  formatSectionAliases,
  getTagGroups,
  parseKeywordList,
  parseSectionAliases,
} from '../../../config/chordDisplayTagGroups.js';
import {
  buildTagPreviewSample,
  getChordDisplayTags,
  getOverriddenGroupIds,
  loadChordDisplayTags,
  getTagGroupFallback,
  readTagGroupValue,
  resetAllTagGroups,
  resetTagGroup,
  setTagGroupKeywords,
  subscribeChordDisplayTags,
  summarizeActiveTags,
} from '../../../utils/chord/chordDisplayTags.js';
import { summarizeDetection } from './detectionStats.js';
import {
  addKeywordToDraft,
  diffAliases,
  diffGroupDraft,
  describeDiff,
  findKeywordConflicts,
  keywordsFromDraft,
  removeKeywordFromDraft,
} from './tagAudit.js';

/**
 * Draft awal editor per grup. Memakai getTagGroups() (bukan konstanta) karena
 * halaman admin diimpor lebih dulu dari parser: saat modul baru dimuat, daftar
 * bawaan bisa belum siap akibat siklus impor config.
 */
const buildDrafts = () => Object.fromEntries(
  getTagGroups().map((group) => {
    const value = readTagGroupValue(group.id);
    return [group.id, group.kind === 'aliasMap'
      ? formatSectionAliases(value)
      : formatKeywordList(value)];
  }),
);

/**
 * Nama properti daftar aktif (getChordDisplayTags) untuk tiap id grup.
 * Dipakai untuk membandingkan draft dengan daftar aktif saat menghitung diff.
 */
export const GROUP_TAG_KEYS = {
  sections: 'STRUCTURE_SECTION_KEYWORDS',
  metadata: 'METADATA_KEYS',
  instruments: 'INSTRUMENT_KEYWORDS',
  noChord: 'NO_CHORD_TOKENS',
  midiKeys: 'MIDI_ROUTING_KEYS',
  sectionAliases: 'SECTION_NAME_ALIASES',
};

const listFromDraft = (draft = '') => String(draft)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const groupKind = (groupId) => getTagGroups().find((group) => group.id === groupId)?.kind || 'list';

/** Nilai draf siap disimpan: objek untuk aliasMap, array untuk grup keyword. */
const valueFromDraft = (groupId, draft = '') => (groupKind(groupId) === 'aliasMap'
  ? parseSectionAliases(draft).aliases
  : listFromDraft(draft));

const validateDrafts = (drafts) => {
  const errors = {};
  Object.entries(drafts).forEach(([groupId, text]) => {
    if (groupKind(groupId) === 'aliasMap') {
      const { errors: aliasErrors } = parseSectionAliases(text);
      if (aliasErrors.length) errors[groupId] = aliasErrors;
      return;
    }

    const parsed = parseKeywordList(text);
    const invalid = parsed.filter((item) => item.reason);
    if (invalid.length) {
      errors[groupId] = invalid.map((item) => ({
        value: item.value,
        reason: item.reason,
      }));
    }
  });
  return errors;
};

export function useChordDisplayTags() {
  const [version, setVersion] = useState(0);
  const [drafts, setDrafts] = useState(buildDrafts);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingGroup, setSavingGroup] = useState(null);
  const [previewText, setPreviewText] = useState(() => buildTagPreviewSample());
  // Peringatan konflik terakhir dari server (keyword di >1 grup). Tetap
  // ditampilkan setelah simpan sukses: admin perlu tahu dampaknya.
  const [conflicts, setConflicts] = useState([]);
  const [conflictWarning, setConflictWarning] = useState('');
  // Keyword yang SUDAH konflik sebelum admin menyimpan (umnya dari daftar
  // bawaan). Disimpan di ref agar setiap simpan bisa membedakan problem baru.
  const baselineConflicts = useRef(new Set());

  /** Muat pengaturan global terbaru lalu segarkan draft editor. */
  const refreshFromServer = useCallback(async () => {
    await loadChordDisplayTags({ force: true });
    setDrafts(buildDrafts());
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    // Tab admin bisa dibuka langsung: pastikan daftar yang ditampilkan adalah
    // versi global terbaru, bukan cache lokal.
    refreshFromServer();
  }, [refreshFromServer]);

  // Ikuti perubahan dari tab lain / pengguna lain (cache berubah → muat ulang).
  useEffect(() => subscribeChordDisplayTags(() => setVersion((value) => value + 1)), []);

  const errors = useMemo(() => validateDrafts(drafts), [drafts]);

  // Rekam konflik awal hanya sekali (saat panel dibuka): "konflik bawaan"
  // harus dinilai dari daftar sebelum admin mengubah apa pun.
  const baselineCaptured = useRef(false);

  // `version` bertambah setiap ada perubahan (simpan/reset/storage event);
  // daftar tag sendiri disimpan di luar React, jadi version-lah dependensinya.
  const active = useMemo(
    () => ({ ...getChordDisplayTags(), summary: summarizeActiveTags() }),
    [version],
  );

  const overriddenIds = useMemo(() => getOverriddenGroupIds(), [version]);

  const detection = useMemo(() => summarizeDetection(previewText), [previewText, version]);

  // Konflik dihitung dari semua daftar AKTIF, bukan hanya yang sedang diedit,
  // karena keyword bisa pindah grup: peringatan harus muncul di kedua kartu.
  // Daftar bawaan sendiri sudah bisa mengandung keyword ganda, jadi
  // activeConflicts dipakai apa adanya untuk peringatan DRAFT, dan
  // baselineConflicts dipakai untuk menyaring pesan SETELAH simpan.
  const activeConflicts = useMemo(() => findKeywordConflicts(active), [active]);

  useEffect(() => {
    if (baselineCaptured.current) return;
    baselineCaptured.current = true;
    baselineConflicts.current = new Set(activeConflicts.map((item) => item.keyword));
  }, [activeConflicts]);

  /**
   * Konflik pada DRAFT tiap grup (belum disimpan) — peringatan di kartu grup.
   * Konflik yang sudah ada sejak panel dibuka disaring agar admin tidak
   * diperingatkan soal daftar bawaan yang bukan ia ubah.
   */
  const draftConflicts = useMemo(() => Object.fromEntries(
    getTagGroups().map((group) => {
      // Alias bukan daftar keyword: tidak bisa bentrok dengan grup mana pun.
      if (group.kind === 'aliasMap') return [group.id, []];
      const tagKey = GROUP_TAG_KEYS[group.id] || group.id;
      const others = { ...active };
      others[tagKey] = keywordsFromDraft(drafts[group.id], parseKeywordList);
      const conflicts = findKeywordConflicts(others)
        .filter((item) => !baselineConflicts.current.has(item.keyword))
        .filter((item) => item.groups.includes(group.id));
      return [group.id, conflicts];
    }),
  ), [drafts, active]);

  /**
   * Selisih draft vs daftar aktif per grup — dipakai tombol simpan untuk
   * menampilkan "+2 −1" sehingga admin tahu persis apa yang akan dikirim
   * sebelum menekan simpan. Baris tidak valid diabaikan (tombol sudah mati).
   */
  const pendingDiffs = useMemo(() => Object.fromEntries(
    Object.entries(drafts).map(([groupId, text]) => {
      const activeKeywords = active[GROUP_TAG_KEYS[groupId]] || [];
      if (groupKind(groupId) === 'aliasMap') {
        return [groupId, diffAliases(activeKeywords, parseSectionAliases(text).aliases)];
      }
      return [groupId, diffGroupDraft(text, activeKeywords, parseKeywordList)];
    }),
  ), [drafts, active]);

  const setDraft = useCallback((groupId, text) => {
    setDrafts((prev) => ({ ...prev, [groupId]: text }));
    setSaveMessage('');
    setSaveError('');
    // Peringatan konflik hasil simpan sebelumnya tidak berlaku lagi untuk
    // draft yang baru diubah — hindari admin mengira konflik itu masih sama.
    setConflictWarning('');
  }, []);

  /**
   * Tambah satu keyword lewat input chip (bukan textarea).
   * Hanya mengubah DRAFT: admin tetap melihat ringkasan perubahan dan harus
   * menekan simpan, sama seperti suntingan manual.
   * @returns {{ok: boolean, reason?: string}}
   */
  const addKeyword = useCallback((groupId, keyword) => {
    const result = addKeywordToDraft(drafts[groupId] || '', keyword, parseKeywordList);
    if (!result.ok) return result;
    setDraft(groupId, result.draft);
    return { ok: true };
  }, [drafts, setDraft]);

  /** Hapus satu keyword dari draft (chip ber-×). */
  const removeKeyword = useCallback((groupId, keyword) => {
    setDraft(groupId, removeKeywordFromDraft(drafts[groupId] || '', keyword, parseKeywordList));
  }, [drafts, setDraft]);

  /** Simpan satu grup ke server (berlaku untuk semua pengguna). */
  const saveGroup = useCallback(async (groupId) => {
    if (errors[groupId]) return;
    const keywords = valueFromDraft(groupId, drafts[groupId]);
    const isEmpty = Array.isArray(keywords)
      ? !keywords.length
      : !Object.keys(keywords || {}).length;
    if (isEmpty) {
      setSaveError('Daftar tidak boleh kosong. Gunakan "Reset ke bawaan" untuk mengembalikan kata kunci bawaan.');
      return;
    }

    const group = getTagGroups().find((item) => item.id === groupId);
    // Diff dihitung dari daftar SEBELUM simpan agar ringkasan mencerminkan
    // perubahan request ini, bukan seluruh isi daftar.
    const diff = pendingDiffs[groupId];
    setSavingGroup(groupId);
    setSaveError('');
    setSaveMessage('');
    const result = await setTagGroupKeywords(groupId, keywords);
    setSavingGroup(null);

    if (!result.ok) {
      setSaveError(`Gagal menyimpan "${group?.label || groupId}": ${result.reason}`);
      return;
    }

    const newConflicts = (Array.isArray(result.conflicts) ? result.conflicts : [])
      .filter((item) => !baselineConflicts.current.has(item.keyword));
    setConflicts(newConflicts);
    // Konflik yang sudah ada sejak bawaan bukan masalah baru bagi admin.
    setConflictWarning(newConflicts.length
      ? `${newConflicts.length} kata kunci terdaftar di lebih dari satu grup — urutan grup menentukan hasil deteksi.`
      : '');

    setDrafts(buildDrafts());
    const diffText = describeDiff(diff);
    const changedGroups = newConflicts.length
      ? ` Ditemukan konflik di: ${[...new Set(newConflicts.map((item) => item.groups.join(' + ')))].join('; ')}.`
      : '';
    setSaveMessage(
      `Daftar "${group?.label || groupId}" disimpan untuk semua pengguna${diffText ? ` (${diffText})` : ''}.${changedGroups}`,
    );
    setVersion((value) => value + 1);
  }, [drafts, errors, pendingDiffs]);

  /** Kembalikan satu grup ke bawaan untuk semua pengguna. */
  const revertGroup = useCallback(async (groupId) => {
    const group = getTagGroups().find((item) => item.id === groupId);
    setSavingGroup(groupId);
    setSaveError('');
    setSaveMessage('');
    const result = await resetTagGroup(groupId);
    setSavingGroup(null);

    if (!result.ok) {
      setSaveError(`Gagal mereset "${group?.label || groupId}": ${result.reason}`);
      return;
    }
    setConflicts([]);
    setConflictWarning('');
    setDrafts(buildDrafts());
    setSaveMessage(`Daftar "${group?.label || groupId}" dikembalikan ke bawaan.`);
    setVersion((value) => value + 1);
  }, []);

  /** Kembalikan SEMUA grup ke bawaan (hapus pengaturan global). */
  const resetAll = useCallback(async () => {
    setSaveError('');
    setSaveMessage('');
    const result = await resetAllTagGroups();
    if (!result.ok) {
      setSaveError(`Gagal mereset pengaturan: ${result.reason}`);
      return;
    }
    setConflicts([]);
    setConflictWarning('');
    setDrafts(buildDrafts());
    setSaveMessage('Semua daftar kata kunci dikembalikan ke bawaan untuk semua pengguna.');
    setVersion((value) => value + 1);
  }, []);

  const resetPreview = useCallback(() => {
    setPreviewText(buildTagPreviewSample());
  }, []);

  return {
    version,
    /** Daftar grup: fungsi, karena config baru siap setelah siklus impor selesai. */
    groups: getTagGroups,
    active,
    activeConflicts,
    draftConflicts,
    pendingDiffs,
    drafts,
    errors,
    overriddenIds,
    detection,
    previewText,
    setPreviewText,
    resetPreview,
    setDraft,
    addKeyword,
    removeKeyword,
    saveGroup,
    revertGroup,
    resetAll,
    refreshFromServer,
    savingGroup,
    saveMessage,
    saveError,
    conflicts,
    conflictWarning,
    getFallback: getTagGroupFallback,
  };
}

export default useChordDisplayTags;
