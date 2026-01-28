import React from 'react';
import EditIcon from '../components/EditIcon.jsx';
import ChordDisplay from '../components/ChordDisplay.jsx';
import YouTubeViewer from '../components/YouTubeViewer.jsx';
import TransposeBar from '../components/TransposeBar.jsx';
import AutoScrollBar from '../components/AutoScrollBar.jsx';
import SetlistSongNavigator from '../components/SetlistSongNavigator.jsx';
import SongDetailHeader from '../components/SongDetailHeader.jsx';
import SongInfo from '../components/SongInfo.jsx';
import SongControls from '../components/SongControls.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseChordPro } from '../utils/chordUtils.js';

export default function SongLyricsPage({ song, activeSetlist }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [transpose, setTranspose] = React.useState(0);
  const [highlightChords, setHighlightChords] = React.useState(false);
  // Parse metadata dari lirik jika ada
  let lyricMeta = {};
  if (song && song.lyrics) {
    try {
      lyricMeta = parseChordPro(song.lyrics).metadata || {};
    } catch {}
  }
  if (!song) return <div className="main-content error-text">Lagu tidak ditemukan</div>;
  // Gabungkan metadata dari song dan dari lirik
  const infoRows = [
    { label: 'Album', value: song.album },
    { label: 'Key', value: lyricMeta.key || song.key },
    { label: 'Tempo', value: lyricMeta.tempo || song.tempo },
    { label: 'Style', value: song.style },
    { label: 'Capo', value: lyricMeta.capo },
    { label: 'Time Signature', value: lyricMeta.time_signature || song.time_signature },
    { label: 'Original Key', value: lyricMeta.original_key },
  ].filter(row => row.value);
  // Metadata lain di lirik (selain yang sudah di atas)
  const extraMeta = Object.entries(lyricMeta)
    .filter(([k]) => !['key','tempo','capo','time','original_key'].includes(k))
    .map(([k,v]) => ({ label: k.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase()), value: v }));
  // Navigasi antar lagu jika activeSetlist tersedia
  let navPrev = null, navNext = null;
  if (activeSetlist && activeSetlist.songs && song && song.id) {
    const idx = activeSetlist.songs.findIndex(id => String(id) === String(song.id));
    if (idx > 0) navPrev = activeSetlist.songs[idx - 1];
    if (idx < activeSetlist.songs.length - 1) navNext = activeSetlist.songs[idx + 1];
  }
  // Nomor urutan lagu di setlist
  let songNumber = null, totalSongs = null;
  if (activeSetlist && activeSetlist.songs && song && song.id) {
    const idx = activeSetlist.songs.findIndex(id => String(id) === String(song.id));
    if (idx !== -1) {
      songNumber = idx + 1;
      totalSongs = activeSetlist.songs.length;
    }
  }
  return (
    <div className="song-detail-container">
      {/* Navigasi antar lagu (jika setlist aktif) */}
      {activeSetlist && (
        <SetlistSongNavigator
          navPrev={navPrev}
          navNext={navNext}
          songNumber={songNumber}
          totalSongs={totalSongs}
          onPrev={() => navPrev && navigate(`/songs/${navPrev}`)}
          onNext={() => navNext && navigate(`/songs/${navNext}`)}
        />
      )}
      <SongDetailHeader
        song={song.title}
        artist={song.artist}
        onBack={() => {
          if (activeSetlist) {
            navigate(`/setlists/${activeSetlist.id}/songs`);
          } else {
            navigate(location.state?.from || '/');
          }
        }}
        onEdit={() => navigate(`/songs/${song.id}/edit`)}
        // Ikon edit tetap diisi di komponen ini
        onEditIcon={<EditIcon size={16} />}
      />
      <SongInfo
        infoRows={infoRows}
        instruments={song.instruments}
        extraMeta={extraMeta}
      />
      {/* YouTube viewer */}
      {song.youtubeId && (
        <div className="song-detail-youtube" style={{ marginBottom: 18 }}>
          <YouTubeViewer
            videoId={song.youtubeId}
            songId={song.id}
            ref={ytRef => { window._ytRef = ytRef; }}
            onTimeUpdate={(t, d) => { window._ytCurrentTime = t; }}
          />
        </div>
      )}
      <SongControls
        transpose={transpose}
        setTranspose={setTranspose}
        highlightChords={highlightChords}
        setHighlightChords={setHighlightChords}
        tempo={song.tempo ? Number(song.tempo) : 80}
        TransposeBar={TransposeBar}
        AutoScrollBar={AutoScrollBar}
      />
      {/* Chord/lyrics */}
      <div className="song-detail-chord">
        <ChordDisplay song={song} transpose={transpose} highlightChords={highlightChords} />
      </div>
    </div>
  );
}
