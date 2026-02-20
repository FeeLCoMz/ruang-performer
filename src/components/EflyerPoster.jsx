import React from 'react';
import '../styles/setlist-poster.css';

export default function EflyerPoster({ gig, setlist, posterRef }) {
  // Reuse SetlistPoster style, but adapt for gig info
  const posterKicker = 'LIVE MUSIC EVENT';
  const posterTitle = gig?.bandName || 'Band';
  const posterSubtitle = gig?.venue ? `${gig.venue}${gig.city ? ', ' + gig.city : ''}` : '';
  const posterDate = gig?.date ? new Date(gig.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const posterTime = gig?.date ? new Date(gig.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  const setlistSongs = setlist?.songs || [];

  return (
    <div className="setlist-poster-preview-wrapper">
      <div className="setlist-poster" ref={posterRef}>
        <div className="setlist-poster-header">
          <div className="setlist-poster-kicker">{posterKicker}</div>
          <div className="setlist-poster-title">{posterTitle}</div>
          <div className="setlist-poster-subtitle">{posterSubtitle}</div>
          <div className="setlist-poster-divider" />
        </div>
        <div style={{ fontSize: '1.2rem', color: '#fbbf24', fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
          {posterDate} {posterTime && <span style={{ color: '#a5b4fc', fontWeight: 600, marginLeft: 8 }}>| {posterTime}</span>}
        </div>
        {gig?.notes && (
          <div style={{ fontStyle: 'italic', color: '#f1f5f9', margin: '24px 0', padding: 16, background: 'rgba(59,130,246,0.10)', borderRadius: 12, fontSize: 20 }}>
            “{gig.notes}”
          </div>
        )}
        {/* Setlist song list hidden for E-Flyer */}
        <div className="setlist-poster-footer">
          <div className="setlist-poster-brand">Ruang Performer</div>
        </div>
      </div>
    </div>
  );
}
