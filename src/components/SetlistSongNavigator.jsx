import React from 'react';

export default function SetlistSongNavigator({ navPrev, navNext, songNumber, totalSongs, onPrev, onNext, compact = false }) {
  const hasNavigation = Boolean(navPrev || navNext);

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
