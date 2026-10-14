import React from 'react';
import SongChordsLyricsDisplay from '../components/SongChordsLyricsDisplay.jsx';

/**
 * SongLyricsMainSection
 * Komponen utama untuk menampilkan lirik dan chord (read-only).
 */
export default function SongLyricsMainSection({
  lyricsDisplayRef,
  tempo,
  timeSignature,
  autoScrollActive,
  scrollSpeed,
  setAutoScrollActive,
  setScrollSpeed,
  zoom,
  setZoom,
  song,
  transpose,
  setTranspose,
  showChords,
  showChordNumbers,
  setShowChordNumbers,
  showJazzChords,
  setShowJazzChords,
  showSimpleChords,
  setShowSimpleChords,
  originalKey = '',
  targetKey = '',
  onTempoChange,
  pianoRecommendation = null,
  onApplyRecommendedTranspose,
  keySignature,
  showSheetMusic,
  setShowSheetMusic,
  youtubeRef,
  youtubeId,
  isYoutubePlaying = false,
  loading = false
}) {
  return (
    <div className="song-panel song-lyrics-main">
      {/* Toolbar lirik dihapus: transpose/autoscroll/chord/YouTube tersedia
          di tab Info, panel media, dan kontrol fullscreen. Panel ini murni
          menampilkan lirik. */}

        {loading ? (
            <div className="lyrics-loading-skeleton">
              <div className="skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton-line" style={{ width: '70%' }} />
              <div className="skeleton-line" style={{ width: '60%' }} />
              <div className="skeleton-line" style={{ width: '85%' }} />
            </div>
          ) : (
            <SongChordsLyricsDisplay
              lyricsDisplayRef={lyricsDisplayRef}
              song={song}
              tempo={tempo}
              transpose={transpose}
              setTranspose={setTranspose}
              showChords={showChords}
              zoom={zoom}
              setZoom={setZoom}
              showChordNumbers={showChordNumbers}
              showJazzChords={showJazzChords}
              showSimpleChords={showSimpleChords}
              keySignature={keySignature}
              autoScrollActive={autoScrollActive}
              scrollSpeed={scrollSpeed}
              setAutoScrollActive={setAutoScrollActive}
              showSheetMusic={showSheetMusic}
              setShowSheetMusic={setShowSheetMusic}
              youtubeRef={youtubeRef}
              youtubeId={youtubeId}
              isYoutubePlaying={isYoutubePlaying}
              timeSignature={timeSignature}
              originalKey={originalKey}
              targetKey={targetKey}
              pianoRecommendation={pianoRecommendation}
              onApplyRecommendedTranspose={onApplyRecommendedTranspose}
            />
        )}
    </div>
  );
}
