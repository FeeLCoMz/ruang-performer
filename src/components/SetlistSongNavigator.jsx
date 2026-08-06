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
        {compact ? '←' : '← Sebelumnya'}
      </button>

      {songNumber && totalSongs && (
        <div className={`setlist-song-info${compact ? ' setlist-song-info-compact' : ''}`}>
          <span className="setlist-song-info-label">{compact ? 'Lagu' : 'Lagu'}</span>
          <span className="setlist-song-info-number">{songNumber}</span>
          <span className="setlist-song-info-label">{compact ? '/' : 'dari'}</span>
          <span className="setlist-song-info-total">{totalSongs}</span>
        </div>
      )}

      {typeof onOpenSetlist === 'function' && (
        <button
          className={`btn btn-secondary setlist-nav-open-list-btn${compact ? ' setlist-nav-open-list-btn-compact' : ''}`}
          title="Buka daftar lagu setlist"
          onClick={onOpenSetlist}
          aria-label="Buka daftar lagu setlist"
        >
          {compact ? '☰ Daftar' : '📋 Daftar Lagu'}
        </button>
      )}

      <button
        className={`btn setlist-nav-btn${!navNext ? ' disabled' : ''}`}
        disabled={!navNext}
        title="Lagu berikutnya"
        onClick={onNext}
        aria-label="Lagu berikutnya"
      >
        {compact ? '→' : 'Berikutnya →'}
      </button>
    </div>
  );
}
