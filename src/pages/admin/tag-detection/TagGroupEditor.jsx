/**
 * TagGroupEditor.jsx
 *
 * Satu kartu grup kata kunci di tab "Tag & Deteksi": daftar keyword (satu per
 * baris), validasi per baris, tombol simpan/reset.
 *
 * Kartu menerima draft teks dari hook induk agar error validasi bisa
 * dihitung sekali untuk seluruh grup (mis. saat menyimpan). Ringkasan
 * perubahan (+/−) juga berasal dari induk: perubahannya global, jadi admin
 * harus melihat akibatnya sebelum menekan simpan, bukan mengetahuinya setelah.
 *
 * Ada dua cara mengedit: textarea (satu keyword per baris, untuk bulk) dan
 * chip + input tambah (untuk menambah/menghapus SATU kata tanpa menyentuh
 * baris lain). Chip selalu mengikuti DRAFT — dulu chip menampilkan daftar
 * aktif, sehingga perubahan yang belum disimpan tidak terlihat di sana.
 */
import React, { useMemo, useState } from 'react';
import { parseKeywordList } from '../../../config/chordDisplayTagGroups.js';
import { describeDiff, DIFF_PREVIEW_LIMIT } from './tagAudit.js';

/* eslint-disable react/prop-types */

const MAX_VISIBLE_CHIPS = 60;

const capitalize = (value = '') => String(value)
  .split(/([\s-]+)/)
  .map((part) => (/^[a-z]+$/.test(part) ? part[0].toUpperCase() + part.slice(1) : part))
  .join('');

export default function TagGroupEditor({
  group,
  draft,
  errors,
  activeKeywords,
  isOverridden,
  fallbackCount,
  saving = false,
  diff,
  conflicts = [],
  groupLabels = {},
  onChange,
  onAddKeyword,
  onRemoveKeyword,
  onSave,
  onReset,
}) {
  const rows = useMemo(() => parseKeywordList(draft), [draft]);
  const validRows = rows.filter((row) => !row.reason);
  const badRows = rows.filter((row) => row.reason);
  // Keyword chip = isi draft (yang akan disimpan), bukan daftar aktif.
  const draftKeywords = useMemo(
    () => [...new Set(validRows.map((row) => row.value))],
    [rows],
  );
  const changed = useMemo(() => {
    const draftList = rows.filter((row) => !row.reason).map((row) => row.value);
    return draftList.length !== activeKeywords.length
      || draftList.some((keyword, index) => keyword !== activeKeywords[index]);
  }, [rows, activeKeywords]);

  const [newKeyword, setNewKeyword] = useState('');
  const [addError, setAddError] = useState('');

  // Grup alias menyimpan pasangan alias=kanonik: chip & input tambah keyword
  // tidak berlaku di sana, jadi hanya textarea yang ditampilkan.
  const isAliasMap = group.kind === 'aliasMap';

  const submitKeyword = (event) => {
    event.preventDefault();
    const result = onAddKeyword ? onAddKeyword(newKeyword) : { ok: false, reason: 'Tidak tersedia' };
    if (!result?.ok) {
      setAddError(result?.reason || 'Gagal menambahkan kata kunci');
      return;
    }
    setAddError('');
    setNewKeyword('');
  };

  const diffLabel = describeDiff(diff);
  const hiddenCount = Math.max(0, draftKeywords.length - MAX_VISIBLE_CHIPS);

  return (
    <section className="card admin-panel admin-tag-group" aria-labelledby={`tag-group-${group.id}`}>
      <div className="admin-panel-header">
        <h2 id={`tag-group-${group.id}`}>
          <span aria-hidden="true">{group.icon}</span> {group.label}
        </h2>
        {isOverridden ? (
          <span className="admin-tag-badge is-custom" title="Berbeda dari daftar bawaan">
            Diatur admin
          </span>
        ) : (
          <span className="admin-tag-badge">Bawaan</span>
        )}
        <span className="admin-tag-count" title="Jumlah kata kunci aktif">
          {activeKeywords.length} aktif
          {fallbackCount !== activeKeywords.length && ` · ${fallbackCount} bawaan`}
        </span>
      </div>

      <p className="admin-muted">{group.description}</p>

      <label className="admin-tag-editor">
        <span className="admin-tag-editor-label">
          Kata kunci (satu per baris, huruf besar/kecil tidak berpengaruh)
        </span>
        <textarea
          value={draft}
          onChange={(event) => onChange(event.target.value)}
          rows={Math.min(14, Math.max(5, draft.split('\n').length + 1))}
          spellCheck={false}
          aria-invalid={Boolean(errors?.length)}
          aria-describedby={`tag-group-${group.id}-hint`}
          className="admin-tag-textarea"
        />
      </label>

      <p className="admin-muted" id={`tag-group-${group.id}-hint`}>
        {isAliasMap ? (
          <>
            Format: <code>alias=seksi</code>, satu per baris — mis.{' '}
            <code>jembatan=bridge</code>. Kedua kata harus ada di daftar Struktur Lagu.
          </>
        ) : (
          <>
            Contoh baris: {activeKeywords.slice(0, 3).map((keyword) => `[${capitalize(keyword)}]`).join(' ')}
            {activeKeywords.length > 3 ? ' …' : ''}
          </>
        )}
      </p>

      {changed && diff && (
        <div className="admin-tag-diff" role="status">
          <strong>
            Perubahan belum disimpan: {diffLabel || 'urutan diubah'}
          </strong>
          {diff.added.length > 0 && (
            <p className="admin-tag-diff-line is-added">
              <span aria-hidden="true">+</span>{' '}
              {diff.added.slice(0, DIFF_PREVIEW_LIMIT).join(', ')}
              {diff.addedCount > DIFF_PREVIEW_LIMIT && ` dan ${diff.addedCount - DIFF_PREVIEW_LIMIT} lainnya`}
            </p>
          )}
          {diff.removed.length > 0 && (
            <p className="admin-tag-diff-line is-removed">
              <span aria-hidden="true">−</span>{' '}
              {diff.removed.slice(0, DIFF_PREVIEW_LIMIT).join(', ')}
              {diff.removedCount > DIFF_PREVIEW_LIMIT && ` dan ${diff.removedCount - DIFF_PREVIEW_LIMIT} lainnya`}
            </p>
          )}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="admin-panel-banner is-warning" role="status">
          <div>
            <strong>{conflicts.length} kata kunci juga terdaftar di grup lain.</strong>{' '}
            Parser memeriksa grup sesuai urutan tampil, jadi salah satu grup
            tidak akan pernah menangkap keyword ini.
            <ul className="admin-tag-error-list">
              {conflicts.slice(0, 6).map((conflict) => (
                <li key={conflict.keyword}>
                  <code>{conflict.keyword}</code> — juga di{' '}
                  {conflict.groups
                    .filter((id) => id !== group.id)
                    .map((id) => groupLabels[id] || id)
                    .join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {badRows.length > 0 && (
        <div className="admin-panel-banner is-error" role="alert">
          <div>
            <strong>{badRows.length} baris tidak valid:</strong>
            <ul className="admin-tag-error-list">
              {badRows.slice(0, 6).map((row) => (
                <li key={`${row.value}-${row.reason}`}>
                  <code>{row.value}</code> — {row.reason}
                </li>
              ))}
            </ul>
            {badRows.length > 6 && <span>dan {badRows.length - 6} baris lainnya.</span>}
          </div>
        </div>
      )}

      {!isAliasMap && (
        <>
          <div className="admin-tag-chips" aria-label={`Kata kunci ${group.label}`}>
            {draftKeywords.slice(0, MAX_VISIBLE_CHIPS).map((keyword) => (
              <span key={keyword} className="admin-tag-chip">
                {keyword}
                <button
                  type="button"
                  className="admin-tag-chip-remove"
                  aria-label={`Hapus kata kunci ${keyword}`}
                  title={`Hapus "${keyword}"`}
                  onClick={() => onRemoveKeyword && onRemoveKeyword(keyword)}
                >
                  ×
                </button>
              </span>
            ))}
            {hiddenCount > 0 && <span className="admin-tag-chip is-more">+{hiddenCount} lainnya</span>}
          </div>

          <form className="admin-tag-add" onSubmit={submitKeyword}>
            <input
              type="text"
              value={newKeyword}
              onChange={(event) => {
                setNewKeyword(event.target.value);
                if (addError) setAddError('');
              }}
              placeholder={`Tambah kata kunci ${group.label.toLowerCase()}…`}
              aria-label={`Tambah kata kunci ${group.label}`}
              aria-invalid={Boolean(addError)}
              aria-describedby={addError ? `tag-group-${group.id}-add-error` : undefined}
              spellCheck={false}
            />
            <button type="submit" className="btn btn-secondary" disabled={!newKeyword.trim()}>
              + Tambah
            </button>
          </form>
          {addError && (
            <p className="admin-tag-add-error" id={`tag-group-${group.id}-add-error`} role="alert">
              {addError}
            </p>
          )}
        </>
      )}

      <div className="admin-tag-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          disabled={Boolean(errors?.length) || !changed || saving}
        >
          {saving ? 'Menyimpan…' : `💾 Simpan ${group.label.split(' ')[0]}${diffLabel ? ` (${diffLabel})` : ''}`}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          disabled={!isOverridden || saving}
        >
          ↺ Reset ke bawaan
        </button>
      </div>
    </section>
  );
}
