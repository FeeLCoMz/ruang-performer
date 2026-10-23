/**
 * TagDetectionPanel.jsx
 *
 * Panel tab "Tag & Deteksi" di halaman Administrator (/admin#tags).
 *
 * Administrator dapat mengatur kelompok kata kunci yang dideteksi
 * ChordDisplay — struktur lagu, modulasi, metadata, cue mark, instrumen,
 * tanda tanpa chord, dan kunci MIDI — beserta pratinjau hasil deteksinya.
 *
 * Perubahan disimpan di localStorage browser ini (lihat
 * src/utils/chord/chordDisplayTags.js) sehingga tidak memerlukan backend, dan
 * langsung dipakai parser/editor tanpa reload.
 */
import React from 'react';
import useChordDisplayTags from './useChordDisplayTags.js';
import TagGroupEditor from './TagGroupEditor.jsx';
import DetectionPreview from './DetectionPreview.jsx';
import { titleCaseKeyword } from '../../../config/chordDisplayConfig.js';

/* eslint-disable react/prop-types */

export default function TagDetectionPanel() {
  const tags = useChordDisplayTags();
  const { summary } = tags.active;

  const summaryItems = [
    { label: 'Section', value: summary.sections, icon: '🎬' },
    { label: 'Modulasi', value: summary.modulation, icon: '🎚️' },
    { label: 'Metadata', value: summary.metadata, icon: '🏷️' },
    { label: 'Cue mark', value: summary.cueMarks, icon: '🔔' },
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
            onClick={tags.resetAll}
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
      </div>

      <DetectionPreview
        text={tags.previewText}
        detection={tags.detection}
        onChange={tags.setPreviewText}
        onReset={tags.resetPreview}
      />

      {tags.groups().map((group) => {
        const activeKeywords = tags.active[groupIdToTagKey(group.id)] || [];
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
            onChange={(value) => tags.setDraft(group.id, value)}
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
    </>
  );
}

/** Nama properti daftar aktif (getChordDisplayTags) untuk tiap id grup. */
const GROUP_TAG_KEYS = {
  sections: 'STRUCTURE_SECTION_KEYWORDS',
  modulation: 'MODULATION_KEYWORDS',
  metadata: 'METADATA_KEYS',
  performance: 'PERFORMANCE_HINT_KEYS',
  cueMarks: 'CUE_MARK_KEYWORDS',
  instruments: 'INSTRUMENT_KEYWORDS',
  noChord: 'NO_CHORD_TOKENS',
  midiKeys: 'MIDI_ROUTING_KEYS',
};

function groupIdToTagKey(groupId) {
  return GROUP_TAG_KEYS[groupId] || groupId;
}
