import React from 'react';

export default function SetlistSongNavigator({
  navPrev,
  navNext,
  songNumber,
  totalSongs,
  onPrev,
  onNext,
  onOpenSetlist,
  compact = false,
}) {

  return (
    <div className={`setlist-song-navigator${compact ? ' setlist-song-navigator-compact' : ''}`}>
      <button
        className={`btn setlist-nav-btn${!navPrev ? ' disabled' : ''}`}
        disabled={!navPrev}
        title="Lagu sebelumnya"
        onClick={onPrev}
        aria-label="Lagu sebelumnya"
      >
        <span aria-hidden="true">←</span>
      </button>

      {songNumber && totalSongs && (
        <div className={`setlist-song-info${compact ? ' setlist-song-info-compact' : ''}`}>
          <span className="setlist-song-info-label">{compact ? 'Lagu' : 'Lagu'}</span>
          <span className="setlist-song-info-number">{songNumber}</span>
          <span className="setlist-song-info-label">{compact ? '/' : 'dari'}</span>
          <span className="setlist-song-info-total">{totalSongs}</span>
        </div>
      )}

      <button
        className={`btn setlist-nav-btn${!navNext ? ' disabled' : ''}`}
        disabled={!navNext}
        title="Lagu berikutnya"
        onClick={onNext}
        aria-label="Lagu berikutnya"
      >
        <span aria-hidden="true">→</span>
      </button>

      {typeof onOpenSetlist === 'function' && (
        <button
          className={`btn btn-secondary setlist-nav-open-list-btn${compact ? ' setlist-nav-open-list-btn-compact' : ''}`}
          title="Daftar setlist aktif"
          onClick={onOpenSetlist}
          aria-label="Daftar setlist aktif"
        >
          <span aria-hidden="true">📋</span>
        </button>
      )}
    </div>
  );
}
