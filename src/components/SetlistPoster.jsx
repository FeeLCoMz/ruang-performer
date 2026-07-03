
import React from 'react';
import '../styles/setlist-poster.css';


export default function SetlistPoster({ setlist, setlistSongs, setlistRows, posterRef }) {
  const SONGS_PER_COLUMN = 10;
  const posterKicker = 'LIVE PERFORMANCE SETLIST';
  const posterTitle = setlist?.bandName || 'Band';
  const posterSubtitle = setlist?.name || 'Setlist';

  const normalizedRows = Array.isArray(setlistRows) && setlistRows.length > 0
    ? setlistRows
    : (setlistSongs || []).map((song) => ({ type: 'song', song }));
  const hasDividers = normalizedRows.some((row) => row.type === 'divider');
  const songRows = normalizedRows.filter((row) => row.type === 'song');

  const totalSongs = songRows.length;
  const useTwoColumns = totalSongs > SONGS_PER_COLUMN && !hasDividers;

  let firstCol = normalizedRows;
  let secondCol = [];
  if (useTwoColumns) {
    const colCount = Math.ceil(totalSongs / 2);
    firstCol = normalizedRows.slice(0, colCount);
    secondCol = normalizedRows.slice(colCount);
  }

  const renderRow = (row, songNumber) => {
    if (row.type === 'divider') {
      return (
        <div className="setlist-poster-session-divider" key={`divider-${row.songId}`}>
          <span className="setlist-poster-session-label">SESSION</span>
          <span className="setlist-poster-session-name">{row.name}</span>
        </div>
      );
    }

    const song = row.song;
    return (
      <div className="setlist-poster-item" key={`${song.id}-${songNumber}`}>
        <div className="setlist-poster-index">{songNumber}</div>
        <div className="setlist-poster-info">
          <div className="setlist-poster-song">{song.title}</div>
          <div className="setlist-poster-artist">{song.artist || '—'}</div>
        </div>
        <div className="setlist-poster-extra">
          {song.key && <span className="setlist-poster-tag">{song.key}</span>}
          {song.tempo && (
            <span className="setlist-poster-tag" style={{ marginLeft: song.key ? 6 : 0 }}>{song.tempo} BPM</span>
          )}
        </div>
      </div>
    );
  };

  const renderRowsWithNumbers = (rows, startAt = 1) => {
    let songNumber = startAt;
    return rows.map((row) => {
      if (row.type === 'divider') {
        return renderRow(row, songNumber);
      }
      const node = renderRow(row, songNumber);
      songNumber += 1;
      return node;
    });
  }

  return (
    <div className="setlist-poster-preview-wrapper">
      <div className="setlist-poster" ref={posterRef}>
        <div className="setlist-poster-header">
          <div className="setlist-poster-kicker">{posterKicker}</div>
          <div className="setlist-poster-title">{posterTitle}</div>
          <div className="setlist-poster-subtitle">{posterSubtitle}</div>
          <div className="setlist-poster-divider" />
        </div>
            {/* Tanggal & Venue */}
            {setlist?.date && (
              <div style={{ fontSize: '1.1rem', color: '#fbbf24', fontWeight: 700, marginBottom: 4 }}>
                {new Date(setlist.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {setlist?.venue && (
                  <span style={{ color: '#a5b4fc', fontWeight: 600, marginLeft: 8 }}>
                    | {setlist.venue}
                  </span>
                )}
              </div>
            )}
            {/* Tagline / Deskripsi Singkat */}
            {setlist?.tagline && (
              <div style={{ fontSize: '1.05rem', color: '#fbbf24', fontWeight: 600, marginBottom: 6, fontStyle: 'italic' }}>
                {setlist.tagline}
              </div>
            )}
            {!setlist?.tagline && setlist?.notes && (
              <div style={{ fontSize: '1.05rem', color: '#fbbf24', fontWeight: 600, marginBottom: 6, fontStyle: 'italic' }}>
                {setlist.notes}
              </div>
            )}
        <div className={`setlist-poster-list${useTwoColumns ? ' two-columns' : ''}`}
          style={useTwoColumns ? { display: 'flex', flexDirection: 'row', columnGap: 24 } : {}}>
          {useTwoColumns ? (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {renderRowsWithNumbers(firstCol, 1)}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {renderRowsWithNumbers(secondCol, firstCol.length + 1)}
              </div>
            </>
          ) : (
            renderRowsWithNumbers(normalizedRows, 1)
          )}
        </div>
        <div className="setlist-poster-footer">
          <div className="setlist-poster-brand">Ruang Performer</div>
        </div>
      </div>
    </div>
  );
}
