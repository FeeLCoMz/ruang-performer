/**
 * TagGroupEditor.jsx
 *
 * Satu kartu grup kata kunci di tab "Tag & Deteksi": daftar keyword (satu per
 * baris), validasi per baris, tombol simpan/reset, dan tabel alias untuk grup
 * seksi ("alias → bentuk baku").
 *
 * Kartu menerima draft teks dari hook induk agar error validasi bisa
 * dihitung sekali untuk seluruh grup (mis. saat menyimpan).
 */
import React, { useMemo } from 'react';
import { parseKeywordList } from '../../../config/chordDisplayTagGroups.js';

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
  aliases,
  isOverridden,
  fallbackCount,
  saving = false,
  onChange,
  onSave,
  onReset,
}) {
  const rows = useMemo(() => parseKeywordList(draft), [draft]);
  const validRows = rows.filter((row) => !row.reason);
  const badRows = rows.filter((row) => row.reason);
  const changed = useMemo(() => {
    const draftList = rows.filter((row) => !row.reason).map((row) => row.value);
    return draftList.length !== activeKeywords.length
      || draftList.some((keyword, index) => keyword !== activeKeywords[index]);
  }, [rows, activeKeywords]);

  const hiddenCount = Math.max(0, validRows.length - MAX_VISIBLE_CHIPS);

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
        Contoh baris: {activeKeywords.slice(0, 3).map((keyword) => `[${capitalize(keyword)}]`).join(' ')}
        {activeKeywords.length > 3 ? ' …' : ''}
      </p>

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

      <div className="admin-tag-chips" aria-label={`Kata kunci aktif ${group.label}`}>
        {activeKeywords.slice(0, MAX_VISIBLE_CHIPS).map((keyword) => (
          <span key={keyword} className="admin-tag-chip">{keyword}</span>
        ))}
        {hiddenCount > 0 && <span className="admin-tag-chip is-more">+{hiddenCount} lainnya</span>}
      </div>

      {group.aliases && (
        <div className="admin-tag-aliases">
          <h3 className="admin-panel-subtitle">Alias (dianggap sama, tidak ditawarkan autocomplete)</h3>
          <ul>
            {Object.entries(aliases).map(([alias, canonical]) => (
              <li key={alias}>
                <code>{alias}</code> <span aria-hidden="true">→</span> <code>{canonical}</code>
                {!activeKeywords.includes(alias) && <span className="admin-tag-alias-off"> (nonaktif)</span>}
              </li>
            ))}
          </ul>
          <p className="admin-muted">
            Hapus kata alias dari daftar untuk mematikan alias tersebut.
          </p>
        </div>
      )}

      <div className="admin-tag-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          disabled={Boolean(errors?.length) || !changed || saving}
        >
          {saving ? 'Menyimpan…' : `💾 Simpan ${group.label.split(' ')[0]}`}
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
