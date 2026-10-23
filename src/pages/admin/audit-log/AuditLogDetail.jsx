/**
 * AuditLogDetail.jsx
 *
 * Drawer detail satu entri audit log. Baris tabel sebelumnya hanya menampilkan
 * potongan informasi (deskripsi & IP sekilas di `title`); drawer ini memberi
 * tampilan lengkap tanpa memuat ulang data.
 *
 * Ditutup lewat tombol, klik latar, atau Escape — sama seperti modal panel lain.
 */
import React, { useEffect, useRef } from 'react';
import { formatActionName } from '../../../utils/auditLogger.js';

function formatFullTimestamp(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * `changes` bisa berupa string JSON (dari API) atau objek terurai (dari
 * formatAuditLog). Objek non-tag (mis. `groups`) tetap aman: pemanggil hanya
 * membaca kunci yang diharapkan.
 */
function parseChanges(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function AuditLogDetail({ log, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    // Handler di dokumen (fase capture) menangkap Escape dari mana pun; handler
    // di elemen menjaga Escape tetap bekerja walau fokus berada di dalam drawer.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  if (!log) return null;

  const rows = [
    { label: 'Waktu', value: formatFullTimestamp(log.createdAt) },
    { label: 'User', value: log.username || log.userId || '-' },
    { label: 'Aksi', value: formatActionName(log.action || '') },
    { label: 'Kode aksi', value: log.action || '-' },
    { label: 'Kategori', value: log.category || '-' },
    { label: 'Severity', value: log.severity || '-' },
    { label: 'Status', value: log.status || '-' },
    { label: 'IP', value: log.ipAddress || '-' },
    { label: 'Band', value: log.bandId || '-' },
    { label: 'Deskripsi', value: log.description || '-' },
  ];

  // `changes` datang sebagai JSON string atau objek (lihat formatAuditLog).
  const changes = parseChanges(log.changes);
  const tagGroups = Array.isArray(changes?.tagGroups) ? changes.tagGroups : [];
  const conflicts = Array.isArray(changes?.conflicts) ? changes.conflicts : [];

  return (
    <div className="audit-log-detail-overlay" onClick={onClose}>
      <aside
        className="audit-log-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="audit-log-detail-header">
          <h2 id="audit-detail-title">Detail Aktivitas</h2>
          <button
            ref={closeRef}
            type="button"
            className="audit-log-detail-close"
            aria-label="Tutup detail"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <dl className="audit-log-detail-list">
          {rows.map((row) => (
            <div key={row.label} className="audit-log-detail-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        {tagGroups.length > 0 && (
          <section className="audit-log-detail-changes" aria-label="Perubahan kata kunci tag">
            <h3>Perubahan kata kunci</h3>
            {tagGroups.map(({ groupId, diff }) => (
              <div key={groupId} className="audit-log-detail-change">
                <strong>{groupId}</strong>{' '}
                <span className="admin-muted">
                  {diff?.before ?? '?'} → {diff?.after ?? '?'} kata kunci
                </span>
                {Array.isArray(diff?.added) && diff.added.length > 0 && (
                  <p className="admin-tag-diff-line is-added">
                    <span aria-hidden="true">+</span> {diff.added.join(', ')}
                    {diff.truncated ? ' …' : ''}
                  </p>
                )}
                {Array.isArray(diff?.removed) && diff.removed.length > 0 && (
                  <p className="admin-tag-diff-line is-removed">
                    <span aria-hidden="true">−</span> {diff.removed.join(', ')}
                    {diff.truncated ? ' …' : ''}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {conflicts.length > 0 && (
          <section className="audit-log-detail-changes" aria-label="Konflik kata kunci">
            <h3>Konflik antar grup</h3>
            <ul className="admin-tag-error-list">
              {conflicts.map((conflict) => (
                <li key={conflict.keyword}>
                  <code>{conflict.keyword}</code> — {(conflict.groups || []).join(' + ')}
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
