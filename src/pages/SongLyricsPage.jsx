import React, { useEffect, useMemo } from 'react';
import EditIcon from '../components/EditIcon.jsx';
import ChordDisplay from '../components/ChordDisplay.jsx';
import YouTubeViewer from '../components/YouTubeViewer.jsx';
import TimeMarkers from '../components/TimeMarkers.jsx';
import TransposeBar from '../components/TransposeBar.jsx';
import AutoScrollBar from '../components/AutoScrollBar.jsx';
import SetlistSongNavigator from '../components/SetlistSongNavigator.jsx';
import SongDetailHeader from '../components/SongDetailHeader.jsx';
import SongInfo from '../components/SongInfo.jsx';
import SongControls from '../components/SongControls.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseChordPro, transposeChord, getTransposeSteps } from '../utils/chordUtils.js';

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
  // Jika setlist aktif, cari meta lagu dari setlist
  let setlistMeta = null;
  if (activeSetlist && Array.isArray(activeSetlist.setlistSongMeta) && song) {
    setlistMeta = activeSetlist.setlistSongMeta.find(meta => meta && meta.id === song.id);
  }
  // Gabungkan metadata: prioritas setlist > lirik > master song
  const metaKey = (setlistMeta && setlistMeta.key) || lyricMeta.key || song.key;
  const metaTempo = (setlistMeta && setlistMeta.tempo) || lyricMeta.tempo || song.tempo;
  const metaStyle = (setlistMeta && setlistMeta.style) || song.style;
  const originalKey = song.key;
  const originalTempo = song.tempo;
  const originalStyle = song.style;

  // Hitung steps transpose otomatis dari key database ke metaKey (setlist/lirik)
  const autoTranspose = useMemo(() => {
    if (typeof metaKey === 'string' && typeof song.key === 'string' && metaKey !== song.key) {
      return getTransposeSteps(song.key, metaKey);
    }
    return 0;
  }, [metaKey, song.key]);

  // Reset transpose manual saat song atau metaKey berubah
  useEffect(() => {
    setTranspose(0);
  }, [song.id, metaKey]);

  // Info rows: tampilkan meta, dan jika berbeda tampilkan original
  const infoRows = useMemo(() => [
    { label: 'Album', value: song.album },
    (typeof metaKey === 'string' && typeof song.key === 'string' && metaKey !== song.key)
      ? { label: 'Key', value: `${metaKey} (Original: ${song.key})` }
      : { label: 'Key', value: metaKey },
    (typeof metaTempo === 'string' && typeof song.tempo === 'string' && metaTempo !== song.tempo)
      ? { label: 'Tempo', value: `${metaTempo} (Original: ${song.tempo})` }
      : { label: 'Tempo', value: metaTempo },
    (typeof metaStyle === 'string' && typeof song.style === 'string' && metaStyle !== song.style)
      ? { label: 'Style', value: `${metaStyle} (Original: ${song.style})` }
      : { label: 'Style', value: metaStyle },
    { label: 'Capo', value: lyricMeta.capo },
    { label: 'Time Signature', value: lyricMeta.time_signature || song.time_signature },
  ].filter(row => row.value), [metaKey, metaTempo, metaStyle, lyricMeta, song]);
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
        <div className="song-detail-youtube">
          <YouTubeViewer
            videoId={song.youtubeId}
            songId={song.id}
            ref={ytRef => { window._ytRef = ytRef; }}
            onTimeUpdate={(t, d) => { window._ytCurrentTime = t; }}
          />
          <TimeMarkers
            markers={Array.isArray(song.timestamps) ? song.timestamps : []}
            getCurrentTime={() => window._ytRef?.currentTime || 0}
            seekTo={t => window._ytRef?.handleSeek?.(t)}
            readonly={true}
          />
        </div>
      )}
      <SongControls
        transpose={transpose + autoTranspose}
        setTranspose={delta => setTranspose(prev => typeof delta === 'function' ? delta(prev) : delta - autoTranspose)}
        highlightChords={highlightChords}
        setHighlightChords={setHighlightChords}
        tempo={metaTempo ? Number(metaTempo) : 80}
        TransposeBar={TransposeBar}
        AutoScrollBar={AutoScrollBar}
      />
      {/* Chord/lyrics */}
      <div className="song-detail-chord">
        <ChordDisplay song={song} transpose={transpose + autoTranspose} highlightChords={highlightChords} />
      </div>
    </div>
  );
}
