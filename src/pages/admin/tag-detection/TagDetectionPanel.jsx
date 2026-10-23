/**
 * TagDetectionPanel.jsx
 *
 * Panel tab "Tag & Deteksi" di halaman Administrator (/admin#tags).
 *
 * Administrator dapat mengatur kelompok kata kunci yang dideteksi
 * ChordDisplay — struktur lagu, metadata, instrumen,
 * tanda tanpa chord, dan kunci MIDI — beserta pratinjau hasil deteksinya.
 *
 * Perubahan disimpan GLOBAL di tabel app_settings (lihat
 * src/utils/chord/chordDisplayTags.js) sehingga berlaku untuk semua pengguna
 * di semua perangkat, dan dicatat di audit log oleh server
 * (server/handlers/settings.js).
 *
 * Selain mengatur kata kunci, panel bisa memindai lagu NYATA di database
 * (SongTagScan) untuk menemukan tag yang belum dikenali, lalu memasukkannya ke
 * draft grup yang sesuai.
 */
import React, { useState } from 'react';
import useChordDisplayTags, { GROUP_TAG_KEYS } from './useChordDisplayTags.js';
import TagGroupEditor from './TagGroupEditor.jsx';
import DetectionPreview from './DetectionPreview.jsx';
import SongTagScan from './SongTagScan.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { scanSongs, filterNewFindings } from './songTagScan.js';
import { fetchSongs } from '../../../apiClient.js';
import { titleCaseKeyword } from '../../../config/chordDisplayConfig.js';

/* eslint-disable react/prop-types */

export default function TagDetectionPanel() {
  const tags = useChordDisplayTags();
  const { summary } = tags.active;
  // Reset semua mengubah pengaturan untuk SEMUA pengguna dan tidak bisa
  // dibatalkan, jadi tombolnya membuka konfirmasi lebih dulu.
  const [confirmingResetAll, setConfirmingResetAll] = useState(false);

  // Hasil pindai lagu nyata. Disimpan di panel (bukan di SongTagScan) supaya
  // "tambahkan ke grup" bisa memakai addKeyword milik hook yang sama.
  const [scan, setScan] = useState({ loading: false, error: '', result: null });

  const runScan = async () => {
    setScan({ loading: true, error: '', result: null });
    try {
      const songs = await fetchSongs();
      setScan({ loading: false, error: '', result: scanSongs(songs) });
    } catch (error) {
      setScan({
        loading: false,
        result: null,
        error: error?.message || 'Gagal memindai lagu. Pastikan Anda terhubung ke server.',
      });
    }
  };

  // Sembunyikan tag yang namanya sudah terdaftar di grup mana pun.
  const unknownFindings = scan.result
    ? filterNewFindings(
      scan.result.findings,
      tags.groups().flatMap((group) => tags.active[GROUP_TAG_KEYS[group.id] || group.id] || []),
    )
    : [];

  const jumpToGroup = (groupId) => {
    const target = document.getElementById(`tag-group-${groupId}`);
    // scrollIntoView tidak ada di sebagian environment test: pakai opsional.
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    // Fokuskan textarea draft agar admin bisa langsung meninjau perubahan;
    // heading id di kartu bukan elemen yang bisa difokus.
    const card = target?.closest?.('.admin-tag-group');
    card?.querySelector?.('textarea')?.focus?.();
  };

  // Nama grup untuk peringatan konflik ("juga di Instrumen") — tanpa ini
  // admin hanya melihat id internal seperti "midiKeys".
  const groupLabels = Object.fromEntries(tags.groups().map((group) => [group.id, group.label]));
  const overriddenLabels = tags.overriddenIds.map((id) => groupLabels[id] || id);

  const resetAll = async () => {
    await tags.resetAll();
    setConfirmingResetAll(false);
  };

  const summaryItems = [
    { label: 'Section', value: summary.sections, icon: '🎬' },
    { label: 'Metadata', value: summary.metadata, icon: '🏷️' },
    { label: 'Instrumen', value: summary.instruments, icon: '🎸' },
    { label: 'No chord', value: summary.noChord, icon: '🚫' },
    { label: 'Key MIDI', value: summary.midiKeys, icon: '🎹' },
  ];

  return (
    <>
      <div className="card admin-panel admin-tag-summary">
        <div className="admin-panel-header">
          <h2>🏷️ Tag &amp; Deteksi ChordDisplay</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setConfirmingResetAll(true)}
            disabled={tags.overriddenIds.length === 0 || Boolean(tags.savingGroup)}
          >
            ↺ Reset semua ke bawaan
          </button>
        </div>
        <p className="admin-muted">
          Atur kelompok kata kunci yang dikenali ChordDisplay dan editor lirik.{' '}
          <strong>Pengaturan berlaku global untuk semua pengguna</strong> dan
          disimpan di database, sehingga ikut terbaca di perangkat lain setelah
          aplikasi dimuat ulang.
          {tags.overriddenIds.length > 0
            ? ` ${tags.overriddenIds.length} grup sedang berbeda dari bawaan.`
            : ' Semua grup masih memakai daftar bawaan.'}
        </p>

        <div className="admin-tag-stat-grid">
          {summaryItems.map((item) => (
            <div key={item.label} className="admin-tag-stat">
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {tags.saveMessage && (
          <div className="admin-panel-banner is-success" role="status">{tags.saveMessage}</div>
        )}
        {tags.saveError && (
          <div className="admin-panel-banner is-error" role="alert">{tags.saveError}</div>
        )}
        {tags.conflictWarning && (
          <div className="admin-panel-banner is-warning" role="status">
            ⚠️ {tags.conflictWarning}
            <ul className="admin-tag-error-list">
              {tags.conflicts.slice(0, 6).map((conflict) => (
                <li key={conflict.keyword}>
                  <code>{conflict.keyword}</code> —{' '}
                  {conflict.groups.map((id) => groupLabels[id] || id).join(' + ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DetectionPreview
        text={tags.previewText}
        detection={tags.detection}
        onChange={tags.setPreviewText}
        onReset={tags.resetPreview}
      />

      <SongTagScan
        groups={tags.groups()}
        findings={unknownFindings}
        loading={scan.loading}
        error={scan.error}
        result={scan.result}
        onScan={runScan}
        onAddKeyword={tags.addKeyword}
        onJumpToGroup={jumpToGroup}
      />

      {tags.groups().map((group) => {
        const activeKeywords = tags.active[GROUP_TAG_KEYS[group.id] || group.id] || [];
        return (
          <TagGroupEditor
            key={group.id}
            group={group}
            draft={tags.drafts[group.id] || ''}
            errors={tags.errors[group.id]}
            activeKeywords={activeKeywords}
            isOverridden={tags.overriddenIds.includes(group.id)}
            fallbackCount={tags.getFallback(group.id).length}
            saving={tags.savingGroup === group.id}
            diff={tags.pendingDiffs[group.id]}
            conflicts={tags.draftConflicts[group.id] || []}
            groupLabels={groupLabels}
            onChange={(value) => tags.setDraft(group.id, value)}
            onAddKeyword={(keyword) => tags.addKeyword(group.id, keyword)}
            onRemoveKeyword={(keyword) => tags.removeKeyword(group.id, keyword)}
            onSave={() => tags.saveGroup(group.id)}
            onReset={() => tags.revertGroup(group.id)}
          />
        );
      })}

      <p className="admin-muted admin-tag-footnote">
        Pengaturan disimpan di tabel <code>app_settings</code> (database) dan
        disebar ke semua pengguna saat aplikasi dimuat.{' '}
        Kapitalisasi tampilan mengikuti aturan ChordDisplay:{' '}
        <code>{titleCaseKeyword('pre-chorus')}</code>, <code>{titleCaseKeyword('fx')}</code>.
        Regex chord (C, Am7, G/B, …) tidak diubah dari sini.
      </p>

      {confirmingResetAll && (
        <ConfirmDialog
          title="Kembalikan SEMUA tag ke bawaan?"
          description={`${tags.overriddenIds.length} grup yang diatur admin akan dikembalikan ke daftar bawaan. Pengaturan ini berlaku global, jadi semua pengguna langsung memakai daftar bawaan.`}
          details={overriddenLabels.map((label) => `${label} — kembali ke bawaan`)}
          confirmLabel="Ya, reset semua"
          danger
          busy={Boolean(tags.savingGroup)}
          onConfirm={resetAll}
          onCancel={() => setConfirmingResetAll(false)}
        />
      )}
    </>
  );
}
