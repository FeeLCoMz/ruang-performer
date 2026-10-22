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
      </aside>
    </div>
  );
}
