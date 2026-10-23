/**
 * SongEditorLoadingOverlay.jsx
 *
 * Tampilan tunggu saat editor lagu dibuka dari halaman lagu (song view).
 *
 * Kenapa overlay, bukan skeleton di dalam editor: editor di mode overlay baru
 * ter-mount setelah data lagu siap, dan portal-nya baru dibuat setelah
 * `loadingData` selesai. Akibatnya dulu tombol Edit hanya terasa "tidak
 * merespons" selama request berjalan (jaringan lambat = layar diam beberapa
 * detik), lalu editor muncul mendadak.
 *
 * Overlay ini muncul SEGERA saat Edit diklik, diberi animasi masuk, dan punya
 * tombol Batal supaya user tidak terjebak kalau request lambat/gagal.
 */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';

const SKELETON_ROWS = [
  { label: 'identity', widths: ['38%', '26%'] },
  { label: 'musical', widths: ['22%', '18%', '22%'] },
  { label: 'lyrics', widths: ['100%', '86%', '92%', '64%'] },
];

/** Penanda stabil untuk test (class bisa berubah demi tampilan). */
export const SONG_EDITOR_LOADING_TEST_IDS = {
  root: 'song-editor-loading',
  cancel: 'song-editor-loading-cancel',
};

const SongEditorLoadingOverlay = memo(function SongEditorLoadingOverlay({
  onCancel = null,
  statusText = 'Menyiapkan editor…',
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="song-editor-loading"
      data-testid={SONG_EDITOR_LOADING_TEST_IDS.root}
      role="status"
      aria-live="polite"
      aria-label="Membuka editor lagu"
    >
      {/* Animasi pembuka: dua panel menggeser dari tengah, meniru editor yang
          sedang "dibuka" di atas halaman lagu. */}
      <div className="song-editor-loading-backdrop" aria-hidden="true">
        <span className="song-editor-loading-pane song-editor-loading-pane--left" />
        <span className="song-editor-loading-pane song-editor-loading-pane--right" />
      </div>

      <div className="song-editor-loading-card">
        <div className="song-editor-loading-head">
          <span className="song-editor-loading-spinner" aria-hidden="true" />
          <div className="song-editor-loading-copy">
            <strong className="song-editor-loading-title">Membuka editor</strong>
            <span className="song-editor-loading-status">{statusText}</span>
          </div>
          {onCancel ? (
            <button
              type="button"
              className="btn song-editor-loading-cancel"
              data-testid={SONG_EDITOR_LOADING_TEST_IDS.cancel}
              onClick={onCancel}
            >
              Batal
            </button>
          ) : null}
        </div>

        <div className="song-editor-loading-skeleton" aria-hidden="true">
          {SKELETON_ROWS.map((row, rowIndex) => (
            <div
              key={row.label}
              className="song-editor-loading-row"
              style={{ '--row-delay': `${rowIndex * 90}ms` }}
            >
              <span className="song-editor-loading-chip" />
              {row.widths.map((width, index) => (
                <span
                  key={`${row.label}-${index}`}
                  className="song-editor-loading-line"
                  style={{ width }}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="song-editor-loading-bar" aria-hidden="true">
          <span className="song-editor-loading-bar-fill" />
        </div>
      </div>
    </div>,
    document.body,
  );
});

export default SongEditorLoadingOverlay;

SongEditorLoadingOverlay.propTypes = {
  /** Dipanggil saat user menekan Batal; tombolnya hanya muncul bila diisi. */
  onCancel: PropTypes.func,
  /** Teks status kecil di bawah judul. */
  statusText: PropTypes.string,
};
