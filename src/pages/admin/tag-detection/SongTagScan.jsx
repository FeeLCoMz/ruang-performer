/**
 * SongTagScan.jsx
 *
 * "Pindai lagu di database" — menjalankan pendeteksi tag atas lirik lagu yang
 * benar-benar tersimpan, lalu menampilkan tag "[...]" yang dibaca sebagai lirik.
 *
 * Pratinjau deteksi (DetectionPreview) hanya menguji contoh yang ditempel
 * manual. Masalah parser justru paling sering muncul dari data nyata: admin
 * tidak tahu bahwa 12 lagu memakai "[Jembatan]" yang belum terdaftar.
 *
 * Tambah ke grup hanya mengisi DRAFT grup tujuan (lewat onAddKeyword); admin
 * tetap melihat ringkasan perubahan dan menekan simpan sendiri.
 */
import React, { useMemo, useState } from 'react';

/* eslint-disable react/prop-types */

const GROUP_OPTIONS = [
  { id: 'sections', label: 'Struktur Lagu' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'instruments', label: 'Instrumen' },
  { id: 'noChord', label: 'Tanpa Chord' },
];

export default function SongTagScan({
  groups = [],
  findings = [],
  loading = false,
  error = '',
  result = null,
  onScan,
  onAddKeyword,
  onJumpToGroup,
}) {
  const [targetGroup, setTargetGroup] = useState('sections');
  const [added, setAdded] = useState({});
  const [addError, setAddError] = useState('');

  // Grup tujuan default: grup pertama yang ada di panel (label ikut konfigurasi).
  const options = useMemo(() => {
    const known = new Set(groups.map((group) => group.id));
    return GROUP_OPTIONS.filter((option) => known.has(option.id)).map((option) => ({
      ...option,
      label: groups.find((group) => group.id === option.id)?.label || option.label,
    }));
  }, [groups]);

  const selectedGroup = options.some((option) => option.id === targetGroup)
    ? targetGroup
    : (options[0]?.id || '');

  const handleAdd = (finding) => {
    const outcome = onAddKeyword ? onAddKeyword(selectedGroup, finding.name) : { ok: false };
    if (!outcome?.ok) {
      setAddError(outcome?.reason || 'Gagal menambahkan kata kunci');
      return;
    }
    setAddError('');
    setAdded((prev) => ({ ...prev, [finding.name]: selectedGroup }));
    if (onJumpToGroup) onJumpToGroup(selectedGroup);
  };

  return (
    <section className="card admin-panel admin-tag-scan" aria-labelledby="tag-scan-title">
      <div className="admin-panel-header">
        <h2 id="tag-scan-title">🔎 Pindai Lagi di Database</h2>
        <button type="button" className="btn btn-primary" onClick={onScan} disabled={loading}>
          {loading ? 'Memindai…' : '▶ Pindai sekarang'}
        </button>
      </div>
      <p className="admin-muted">
        Menjalankan pendeteksi yang sama dengan tampilan lagu atas seluruh lirik yang tersimpan,
        lalu menampilkan tag <code>[...]</code> yang belum dikenali — inilah tag yang saat ini
        tampil sebagai lirik biasa.
      </p>

      {error && (
        <div className="admin-panel-banner is-error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <p className="admin-muted" role="status">
          {result.scannedSongs} lagu dipindai
          {result.skippedSongs > 0 && `, ${result.skippedSongs} tanpa lirik`}
          {' · '}
          {result.findings.length} tag tidak dikenali
          {result.totalTags > 0 && ` (${result.totalTags} kemunculan)`}.
          {result.truncated && ' Sebagian lagu tidak dipindai (batas 500 lagu).'}
        </p>
      )}

      {result && findings.length === 0 && (
        <div className="admin-panel-banner is-success" role="status">
          Semua tag di lagu-lagu tersebut sudah dikenali. Tidak ada yang perlu ditambahkan.
        </div>
      )}

      {findings.length > 0 && (
        <>
          <div className="admin-tag-scan-actions">
            <label>
              Tambahkan ke grup
              <select
                value={selectedGroup}
                onChange={(event) => setTargetGroup(event.target.value)}
              >
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {addError && (
            <div className="admin-panel-banner is-error" role="alert">
              {addError}
            </div>
          )}

          <table className="admin-tag-scan-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Muncul di</th>
                <th>Contoh lagu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <tr key={finding.name}>
                  <td data-label="Tag">
                    <code>[{finding.name}]</code>
                  </td>
                  <td data-label="Muncul di">{finding.count} lagu</td>
                  <td data-label="Contoh lagu">
                    {finding.samples.map((sample, index) => (
                      <span key={`${sample.id}-${index}`}>
                        {index > 0 && ', '}
                        {sample.title}
                      </span>
                    ))}
                    {finding.count > finding.samples.length &&
                      ` +${finding.count - finding.samples.length}`}
                  </td>
                  <td data-label="Aksi">
                    {added[finding.name] ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onJumpToGroup && onJumpToGroup(added[finding.name])}
                      >
                        ✓ Ditambahkan — tinjau draft
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleAdd(finding)}
                      >
                        + Tambahkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="admin-muted admin-tag-footnote">
        Pindai memakai parser yang sama dengan ChordDisplay, jadi hasilnya tidak mungkin berbeda
        dari yang dilihat pengguna. Kata kunci yang ditambahkan dari sini masuk ke draft grup —
        belum tersimpan sampai Anda menekan tombol simpan di kartu grup tersebut.
      </p>
    </section>
  );
}
