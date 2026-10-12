import React from "react";

/**
 * SongChordsHeader
 * Komponen header untuk halaman SongChordsPage.
 * Menampilkan tombol aksi dan navigasi.
 */
export default function SongChordsHeader({
  canEdit,
  onEdit,
  onShare,
  shareMessage,
}) {
  return (
    <div className="song-lyrics-header song-lyrics-header-row">
      {/* Tombol kembali dihapus */}
      {canEdit && (
        <button onClick={onEdit} className="btn btn-secondary" title="Edit lagu">
          ✏️ Edit
        </button>
      )}
      <button onClick={onShare} className="btn btn-secondary" title="Bagikan lagu">
        🔗 Bagikan
      </button>
      {shareMessage && (
        <div className="info-text info-text-margin">{shareMessage}</div>
      )}
    </div>
  );
}
