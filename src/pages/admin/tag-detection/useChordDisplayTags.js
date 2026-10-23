/**
 * useChordDisplayTags.js
 *
 * State panel "Tag & Deteksi": daftar kata kunci per grup, teks yang sedang
 * diedit, error validasi, serta preview hasil deteksi.
 *
 * Simpan manual (bukan per ketikan) supaya admin bisa melihat pratinjau dan
 * memperbaiki typo. Penyimpanan bersifat GLOBAL: daftar dikirim ke
 * /api/settings/chordDisplayTags sehingga berlaku untuk semua pengguna.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatKeywordList,
  getTagGroups,
  parseKeywordList,
} from '../../../config/chordDisplayTagGroups.js';
import {
  buildTagPreviewSample,
  getChordDisplayTags,
  getOverriddenGroupIds,
  loadChordDisplayTags,
  getTagGroupFallback,
  readTagGroupKeywords,
  resetAllTagGroups,
  resetTagGroup,
  setTagGroupKeywords,
  subscribeChordDisplayTags,
  summarizeActiveTags,
} from '../../../utils/chord/chordDisplayTags.js';
import { summarizeDetection } from './detectionStats.js';

/**
 * Draft awal editor per grup. Memakai getTagGroups() (bukan konstanta) karena
 * halaman admin diimpor lebih dulu dari parser: saat modul baru dimuat, daftar
 * bawaan bisa belum siap akibat siklus impor config.
 */
const buildDrafts = () => Object.fromEntries(
  getTagGroups().map((group) => [group.id, formatKeywordList(readTagGroupKeywords(group.id))]),
);

const listFromDraft = (draft = '') => String(draft)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const validateDrafts = (drafts) => {
  const errors = {};
  Object.entries(drafts).forEach(([groupId, text]) => {
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

  // `version` bertambah setiap ada perubahan (simpan/reset/storage event);
  // daftar tag sendiri disimpan di luar React, jadi version-lah dependensinya.
  const active = useMemo(
    () => ({ ...getChordDisplayTags(), summary: summarizeActiveTags() }),
    [version],
  );

  const overriddenIds = useMemo(() => getOverriddenGroupIds(), [version]);

  const detection = useMemo(() => summarizeDetection(previewText), [previewText, version]);

  const setDraft = useCallback((groupId, text) => {
    setDrafts((prev) => ({ ...prev, [groupId]: text }));
    setSaveMessage('');
    setSaveError('');
  }, []);

  /** Simpan satu grup ke server (berlaku untuk semua pengguna). */
  const saveGroup = useCallback(async (groupId) => {
    if (errors[groupId]) return;
    const keywords = listFromDraft(drafts[groupId]);
    if (!keywords.length) {
      setSaveError('Daftar tidak boleh kosong. Gunakan "Reset ke bawaan" untuk mengembalikan kata kunci bawaan.');
      return;
    }

    const group = getTagGroups().find((item) => item.id === groupId);
    setSavingGroup(groupId);
    setSaveError('');
    setSaveMessage('');
    const result = await setTagGroupKeywords(groupId, keywords);
    setSavingGroup(null);

    if (!result.ok) {
      setSaveError(`Gagal menyimpan "${group?.label || groupId}": ${result.reason}`);
      return;
    }
    setDrafts(buildDrafts());
    setSaveMessage(`Daftar "${group?.label || groupId}" disimpan untuk semua pengguna.`);
    setVersion((value) => value + 1);
  }, [drafts, errors]);

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
    drafts,
    errors,
    overriddenIds,
    detection,
    previewText,
    setPreviewText,
    resetPreview,
    setDraft,
    saveGroup,
    revertGroup,
    resetAll,
    refreshFromServer,
    savingGroup,
    saveMessage,
    saveError,
    getFallback: getTagGroupFallback,
  };
}

export default useChordDisplayTags;
