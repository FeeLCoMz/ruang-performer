import React from 'react';

export default function SetlistSongNavigator({ navPrev, navNext, songNumber, totalSongs, onPrev, onNext }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '16px 20px',
      background: 'var(--card-bg)',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '24px'
    }}>
      <button
        className="btn"
        disabled={!navPrev}
        title="Previous song"
        onClick={onPrev}
        style={{
          padding: '8px 16px',
          opacity: !navPrev ? 0.5 : 1,
          cursor: !navPrev ? 'not-allowed' : 'pointer'
        }}
      >
        ← Previous
      </button>
      
      {songNumber && totalSongs && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 20px',
          background: 'var(--primary-bg)',
          borderRadius: '20px',
          border: '1px solid var(--border-color)'
        }}>
          <span style={{
            fontSize: '0.85em',
            color: 'var(--text-muted)',
            fontWeight: '500'
          }}>
            Song
          </span>
          <span style={{
            fontSize: '1.1em',
            fontWeight: '700',
            color: 'var(--primary-color)'
          }}>
            {songNumber}
          </span>
          <span style={{
            fontSize: '0.9em',
            color: 'var(--text-muted)'
          }}>
            of
          </span>
          <span style={{
            fontSize: '1em',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            {totalSongs}
          </span>
        </div>
      )}
      
      <button
        className="btn"
        disabled={!navNext}
        title="Next song"
        onClick={onNext}
        style={{
          padding: '8px 16px',
          opacity: !navNext ? 0.5 : 1,
          cursor: !navNext ? 'not-allowed' : 'pointer'
        }}
      >
        Next →
      </button>
    </div>
  );
}
