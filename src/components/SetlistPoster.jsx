import React from 'react';

export default function SetlistPoster({ setlist, setlistSongs, posterRef }) {
  const posterTitle = setlist?.bandName || 'Band';
  const posterSubtitle = setlist?.name || 'Setlist';

  return (
    <div className="setlist-poster-preview-wrapper">
      <div className="setlist-poster" ref={posterRef}>
        <div className="setlist-poster-header">
          <div className="setlist-poster-kicker">LIVE PERFORMANCE SETLIST</div>
          <div className="setlist-poster-title">{posterTitle}</div>
          <div className="setlist-poster-subtitle">{posterSubtitle}</div>
          <div className="setlist-poster-divider" />
        </div>
        <div className="setlist-poster-list">
          {(setlistSongs || []).map((song, idx) => (
            <div className="setlist-poster-item" key={`${song.id}-${idx}`}>
              <div className="setlist-poster-index">{idx + 1}</div>
              <div className="setlist-poster-info">
                <div className="setlist-poster-song">{song.title}</div>
                <div className="setlist-poster-artist">
                  {song.artist || '—'}
                </div>
              </div>
              <div className="setlist-poster-extra">
                {song.key && <span className="setlist-poster-tag">{song.key}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="setlist-poster-footer">
          <div className="setlist-poster-brand">PerformerHub</div>
        </div>
      </div>
    </div>
  );
}
