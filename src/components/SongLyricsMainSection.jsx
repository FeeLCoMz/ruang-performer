import React, { useState } from 'react';
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
  pianoRecommendation = null,
  onApplyRecommendedTranspose,
  keySignature,
  showSheetMusic,
  setShowSheetMusic,
  youtubeRef,
  youtubeId,
  isYoutubePlaying = false,
  performanceMode = false,
  loading = false
}) {
  // Expand/collapse state for lyrics panel — selalu terbuka, state dipertahankan
  // agar transisi dari versi lama tidak menghilangkan panel.
  const [lyricsPanelExpanded] = useState(true);

  return (
    <div className={`song-panel song-lyrics-main${performanceMode ? ' song-panel-performance' : ''}`}>
      {!performanceMode && (
        <div className="song-lyrics-main-header">
          {/* Key & tempo aktif: identitas musik lagu, tanpa judul panel */}
          <div className="song-lyrics-main-keytempo">
            <span className="song-lyrics-key-chip" title={`Key ${keySignature || '-'}`}>
              🎹 {keySignature || '-'}
            </span>
            {tempo && (
              <span className="song-lyrics-tempo-chip" title={`Tempo ${tempo} BPM`}>
                ⏱️ {tempo} BPM
              </span>
            )}
          </div>
          <SongChordsLyricsToolbar
            autoScrollActive={autoScrollActive}
            setAutoScrollActive={setAutoScrollActive}
            scrollSpeed={scrollSpeed}
            setScrollSpeed={setScrollSpeed}
            tempo={tempo}
            showChordNumbers={showChordNumbers}
            setShowChordNumbers={setShowChordNumbers}
            showJazzChords={showJazzChords}
            setShowJazzChords={setShowJazzChords}
            showSimpleChords={showSimpleChords}
            setShowSimpleChords={setShowSimpleChords}
            youtubeId={youtubeId}
            youtubeRef={youtubeRef}
          />
        </div>
      )}

      {(
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
              performanceMode={performanceMode}
              pianoRecommendation={pianoRecommendation}
              onApplyRecommendedTranspose={onApplyRecommendedTranspose}
            />
          )}
        </>
      )}
    </div>
  );
}
