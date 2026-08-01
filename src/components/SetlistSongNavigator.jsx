import React from 'react';

export default function SetlistSongNavigator({ navPrev, navNext, songNumber, totalSongs, onPrev, onNext, compact = false }) {
  return (
    <div className={`setlist-song-navigator${compact ? ' setlist-song-navigator-compact' : ''}`}>
      <button
        className={`btn setlist-nav-btn${!navPrev ? ' disabled' : ''}`}
        disabled={!navPrev}
        title="Previous song"
        onClick={onPrev}
      >
        {compact ? '←' : '← Previous'}
      </button>
      
      {songNumber && totalSongs && (
        <div className="setlist-song-info">
          <span className="setlist-song-info-label">{compact ? '' : 'Song'}</span>
          <span className="setlist-song-info-number">{songNumber}</span>
          <span className="setlist-song-info-label">{compact ? '/' : 'of'}</span>
          <span className="setlist-song-info-total">{totalSongs}</span>
        </div>
      )}
      
      <button
        className={`btn setlist-nav-btn${!navNext ? ' disabled' : ''}`}
        disabled={!navNext}
        title="Next song"
        onClick={onNext}
      >
        {compact ? '→' : 'Next →'}
      </button>
    </div>
  );
}
