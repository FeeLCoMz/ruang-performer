import React from 'react';

export default function ChordLinks({ searchQuery }) {
  if (!searchQuery) return null;

  return (
    <div className="chord-links-panel">
      <div className="chord-links-title">
        Cari chord di situs lain:
      </div>
      <div className="chord-links-list">
        <a
          href={`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(searchQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tab-btn chord-link-btn"
        >
          🎸 Ultimate Guitar
        </a>
        <a
          href={`https://www.chordtela.com/?s=${encodeURIComponent(searchQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tab-btn chord-link-btn"
        >
          🎵 ChordTela
        </a>
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' chord')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tab-btn chord-link-btn"
        >
          🔍 Google Search
        </a>
      </div>
    </div>
  );
}
