import React, { useState } from "react";
import SongChordsLyricsToolbar from '../components/SongChordsLyricsToolbar.jsx';
import SongChordsLyricsDisplay from '../components/SongChordsLyricsDisplay.jsx';
import ExpandButton from './ExpandButton.jsx';

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
  // Expand/collapse state for lyrics panel
  const [lyricsPanelExpanded, setLyricsPanelExpanded] = useState(true);

  return (
    <div className="song-panel song-lyrics-main">
      <div className="song-lyrics-main-header">
        <ExpandButton
          isExpanded={lyricsPanelExpanded}
          setIsExpanded={setLyricsPanelExpanded}
          icon="🎤"
          label="Lirik & Chord"
          ariaLabel={lyricsPanelExpanded ? 'Sembunyikan panel lirik' : 'Tampilkan panel lirik'}
        />
        {lyricsPanelExpanded && (
          <SongChordsLyricsToolbar
            autoScrollActive={autoScrollActive}
            setAutoScrollActive={setAutoScrollActive}
            showChordNumbers={showChordNumbers}
            setShowChordNumbers={setShowChordNumbers}
            showJazzChords={showJazzChords}
            setShowJazzChords={setShowJazzChords}
            showSimpleChords={showSimpleChords}
            setShowSimpleChords={setShowSimpleChords}
            youtubeId={youtubeId}
            youtubeRef={youtubeRef}
          />
        )}
      </div>

      {lyricsPanelExpanded && (
        <>
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
        </>
      )}
    </div>
  );
}
