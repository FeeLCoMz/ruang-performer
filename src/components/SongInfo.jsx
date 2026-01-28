import React from 'react';

export default function SongInfo({ infoRows = [], instruments, extraMeta = [] }) {
  return (
    <div className="song-detail-info" style={{ marginBottom: 18, flexDirection: 'column', alignItems: 'flex-start', display: 'flex', gap: 4 }}>
      {infoRows.map(row => (
        <span key={row.label}><b>{row.label}:</b> {row.value}</span>
      ))}
      {instruments && instruments.length > 0 && (
        <span><b>Instrumen:</b> {Array.isArray(instruments) ? instruments.join(', ') : instruments}</span>
      )}
      {extraMeta.length > 0 && (
        <div style={{ marginTop: 6, fontSize: '0.97em', color: '#64748b' }}>
          {extraMeta.map(row => (
            <div key={row.label}><b>{row.label}:</b> {row.value}</div>
          ))}
        </div>
      )}
    </div>
  );
}
