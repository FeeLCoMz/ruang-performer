/**
 * DetectionPreview.jsx
 *
 * Pratinjau hasil deteksi ChordDisplay memakai parser asli (classifyLine).
 * Admin dapat menempel contoh lirik/chord untuk memastikan kata kunci yang
 * baru diatur benar-benar dikenali — dan melihat baris bertanda "[...]" yang
 * ternyata belum dikenali.
 */
import React from 'react';
import { DETECTION_KINDS } from './detectionStats.js';

/* eslint-disable react/prop-types */

export default function DetectionPreview({
  text,
  detection,
  onChange,
  onReset,
}) {
  return (
    <section className="card admin-panel admin-tag-preview" aria-labelledby="tag-preview-title">
      <div className="admin-panel-header">
        <h2 id="tag-preview-title">🔍 Pratinjau Deteksi</h2>
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Contoh otomatis
        </button>
      </div>
      <p className="admin-muted">
        Tempel contoh lirik/chord di bawah. Hasil memakai parser yang sama dengan
        tampilan lagu, jadi ini persis yang akan dilakukan ChordDisplay.
      </p>

      <textarea
        className="admin-tag-textarea admin-tag-preview-input"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        rows={9}
        spellCheck={false}
        aria-label="Contoh lirik dan chord untuk pratinjau deteksi"
      />

      <div className="admin-tag-stat-grid">
        {DETECTION_KINDS.map((kind) => (
          <div key={kind.id} className="admin-tag-stat">
            <span aria-hidden="true">{kind.icon}</span>
            <strong>{detection.counts[kind.id] || 0}</strong>
            <span>{kind.label}</span>
          </div>
        ))}
      </div>

      {detection.unrecognized.length > 0 && (
        <div className="admin-panel-banner is-error" role="status">
          <div>
            <strong>{detection.unrecognized.length} tag tidak dikenali</strong> dan
            dibaca sebagai lirik. Tambahkan kata kuncinya ke grup yang sesuai:
            <ul className="admin-tag-error-list">
              {detection.unrecognized.slice(0, 6).map((row) => (
                <li key={row.lineNumber}>
                  baris {row.lineNumber}: <code>{row.label}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {detection.lines.length > 0 && (
        <ol className="admin-tag-detections" aria-label="Baris dan hasil deteksinya">
          {detection.lines.map((row) => {
            const kind = DETECTION_KINDS.find((item) => item.id === row.kind);
            return (
              <li key={`${row.lineNumber}-${row.kind}`} className={`admin-tag-detection is-${row.kind}`}>
                <span className="admin-tag-detection-line">{row.lineNumber}</span>
                <span className="admin-tag-detection-kind">
                  {kind?.icon} {kind?.label || row.kind}
                </span>
                <span className="admin-tag-detection-label">{row.label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
