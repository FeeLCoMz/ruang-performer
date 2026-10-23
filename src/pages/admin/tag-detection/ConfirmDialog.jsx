/**
 * ConfirmDialog.jsx
 *
 * Dialog konfirmasi untuk aksi global yang tidak bisa dibatalkan dari tab
 * "Tag & Deteksi" (mis. "Reset semua ke bawaan").
 *
 * Aksi ini mengubah pengaturan untuk SEMUA pengguna, jadi satu klik tidak
 * cukup: dialog menyebutkan jumlah grup yang akan kehilangan pengaturan,
 * tombol berbahaya tidak otomatis fokus, dan Escape/klik latar membatalkan.
 */
import React, { useEffect, useRef } from 'react';

/* eslint-disable react/prop-types */

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  busy = false,
  details = [],
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    // Fokus ke "Batal" (pilihan aman) agar Enter tidak langsung menghapus.
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [busy, onCancel]);

  return (
    <div className="modal-overlay" onClick={() => !busy && onCancel()}>
      <div
        className="modal admin-reset-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-tag-confirm-title"
        aria-describedby="admin-tag-confirm-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-tag-confirm-title">{title}</h2>
        <p id="admin-tag-confirm-desc">{description}</p>

        {details.length > 0 && (
          <ul className="admin-tag-error-list">
            {details.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        <div className="admin-tag-actions">
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Memproses…' : confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
