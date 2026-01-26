
import EditIcon from '../components/EditIcon.jsx';
import TransposeBar from '../components/TransposeBar.jsx';
import YouTubeViewer from '../components/YouTubeViewer.jsx';
import TimeMarkers from '../components/TimeMarkers.jsx';
import AutoScrollBar from '../components/AutoScrollBar.jsx';
import ChordDisplay from '../components/ChordDisplay.jsx';

export default function SongDetailPage({ song, loading, error, onBack, onEdit, transpose, setTranspose, highlightChords, setHighlightChords, showYouTube = true, showTimeMarkers = true, showAutoScroll = true, showTranspose = true, showNav = false, onPrev, onNext, navIndex = 0, navTotal = 0, children, ...rest }) {
  if (loading) return <div className="main-content">Memuat data lagu...</div>;
  if (error) return <div className="main-content error-text">{error}</div>;
  if (!song) return <div className="main-content error-text">Lagu tidak ditemukan</div>;
  return (
    <div className="song-detail-fullscreen">
      <button className="back-btn" onClick={onBack}>&larr; Kembali ke daftar</button>
      {onEdit && (
        <div style={{ margin: '24px 0 16px 0', textAlign: 'left' }}>
          <button
            className="tab-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontWeight: 500 }}
            onClick={onEdit}
            title="Edit lagu"
          >
            <EditIcon size={18} style={{ verticalAlign: 'middle' }} />
            Edit Lagu
          </button>
        </div>
      )}
      {showNav && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, marginBottom: 18 }}>
          <button
            className="aksi-btn"
            disabled={navIndex <= 0}
            onClick={onPrev}
          >⟨ Sebelumnya</button>
          <span style={{ fontWeight: 700, fontSize: '1.1em' }}>
            {navTotal > 0 ? `${navIndex + 1} / ${navTotal}` : '0 / 0'}
          </span>
          <button
            className="aksi-btn"
            disabled={navIndex >= navTotal - 1}
            onClick={onNext}
          >Berikutnya ⟩</button>
        </div>
      )}
      {showYouTube && song.youtubeId && (
        <YouTubeViewer
          videoId={song.youtubeId}
          ref={ytRef => {
            window._ytRef = ytRef;
          }}
          onTimeUpdate={(t, d) => {
            window._ytCurrentTime = t;
          }}
        />
      )}
      {showTimeMarkers && (
        <TimeMarkers
          songId={song.id}
          getCurrentTime={() => window._ytCurrentTime || 0}
          seekTo={t => window._ytRef && window._ytRef.handleSeek && window._ytRef.handleSeek(t)}
          readonly
        />
      )}
      {showTranspose && (
        <TransposeBar
          transpose={transpose}
          setTranspose={setTranspose}
          highlightChords={highlightChords}
          setHighlightChords={setHighlightChords}
        />
      )}
      {showAutoScroll && <AutoScrollBar tempo={song.tempo ? Number(song.tempo) : 80} />}
      <ChordDisplay song={song} transpose={transpose} highlightChords={highlightChords} />
      {children}
    </div>
  );
}
