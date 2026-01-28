import React from 'react';
import EditIcon from './EditIcon';

export default function SongDetailHeader({ song, artist, onBack, onEdit }) {
  return (
    <div className="song-detail-header">
      <button className="btn-base back-btn" onClick={onBack} aria-label="Kembali ke halaman sebelumnya">&larr;</button>
      <div style={{flex: 1}}>
        <div className="song-detail-title">{song}</div>
        {artist && (
          <div className="song-artist">{artist}</div>
        )}
      </div>     
      <button
        className="btn-base aksi-btn"
        onClick={onEdit}
        title="Edit Lagu"
        aria-label="Edit Lagu"
      >
        <EditIcon size={18} />
      </button>
    </div>
  );
}
