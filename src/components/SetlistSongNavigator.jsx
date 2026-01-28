import React from 'react';

export default function SetlistSongNavigator({ navPrev, navNext, songNumber, totalSongs, onPrev, onNext }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'center', alignItems: 'center' }}>
      <button
        className="tab-btn icon-btn"
        disabled={!navPrev}
        title="Lagu Sebelumnya"
        onClick={onPrev}
      >
        &#8592;
      </button>
      {songNumber && totalSongs && (
        <span style={{ fontWeight: 600, fontSize: '1.08em', color: '#6366f1' }}>
          {songNumber} / {totalSongs}
        </span>
      )}
      <button
        className="tab-btn icon-btn"
        disabled={!navNext}
        title="Lagu Berikutnya"
        onClick={onNext}
      >
        &#8594;
      </button>
    </div>
  );
}
