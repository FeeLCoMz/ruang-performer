import React from 'react';

export default function SongDetailHeader({ song, artist, onBack, onEdit }) {
  return (
    <div className="song-detail-header">
      <button className="back-btn" onClick={onBack}>&larr;</button>
      <div style={{flex: 1}}>
        <div className="song-detail-title">{song}</div>
        {artist && (
          <div className="song-artist" style={{textAlign: 'center', marginTop: 2}}>{artist}</div>
        )}
      </div>
      <button
        className="tab-btn setlist-edit-btn icon-btn"
        title="Edit Lagu"
        onClick={onEdit}
      >
        {/* Ikon edit diisi dari parent */}
        {typeof onEdit === 'object' ? onEdit : <span>Edit</span>}
      </button>
    </div>
  );
}
