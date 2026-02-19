import React from 'react';

/**
 * BandListItem
 * Komponen untuk menampilkan 1 item band pada daftar band.
 * Tidak ada tombol hapus di sini (hanya di BandDetailPage).
 *
 * Props:
 *   - band: object band (id, name, genre, description, ...)
 *   - navigate: function untuk navigasi ke detail band
 */
export default function BandListItem({ band, navigate }) {
  return (
    <div
      className="setlist-item"
      onClick={() => navigate(`/bands/${band.id}`)}
      tabIndex={0}
      role="button"
      aria-label={`Lihat detail band ${band.name}`}
      style={{ cursor: 'pointer' }}
    >
      <div className="setlist-info">
        <h3 className="setlist-title">{band.name}</h3>
        <div className="setlist-meta">
          {band.genre && <span>🎵 {band.genre}</span>}
          {band.description && <span>{band.description}</span>}
        </div>
      </div>
    </div>
  );
}
