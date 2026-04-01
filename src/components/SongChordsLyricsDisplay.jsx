import React from "react";
import AutoScrollBar from "./AutoScrollBar.jsx";
import SongSheetMusic from "./SongSheetMusic.jsx";
import ChordDisplay from "./ChordDisplay.jsx";

/**
 * SongChordsLyricsDisplay
 * Komponen utama untuk menampilkan lirik dan chord, partitur, dan autoscroll.
 * Props:
 *   - isEditingLyrics
 *   - lyricsDisplayRef
 *   - editedLyrics
 *   - setEditedLyrics
 *   - song
 *   - transpose
 *   - zoom
 *   - autoScrollActive
 *   - scrollSpeed
 *   - setAutoScrollActive
 *   - setScrollSpeed
 *   - currentBeat
 *   - setCurrentBeat
 *   - showSheetMusic
 *   - setShowSheetMusic
 */
export default function SongChordsLyricsDisplay({
  isEditingLyrics,
  lyricsDisplayRef,
  editedLyrics,
  setEditedLyrics,
  song,
  transpose,
  zoom,
  showChordNumbers,
  keySignature,
  autoScrollActive,
  scrollSpeed,
  setAutoScrollActive,
  setScrollSpeed,
  currentBeat,
  setCurrentBeat,
  showSheetMusic,
  setShowSheetMusic,
  youtubeRef,
}) {
  return (
    <div className="song-lyrics-display" ref={lyricsDisplayRef}>
      {/* Toolbar autoscroll diganti dengan AutoScrollBar di fullscreen */}
      <AutoScrollBar
        tempo={parseInt(song?.tempo) || 120}
        active={autoScrollActive}
        speed={scrollSpeed}
        onToggle={() => setAutoScrollActive(!autoScrollActive)}
        onSpeedChange={setScrollSpeed}
        lyricsDisplayRef={lyricsDisplayRef}
        currentBeat={currentBeat}
        setCurrentBeat={setCurrentBeat}
      />
      {/* Tombol Lihat Partitur (selalu tampil jika ada MusicXML) */}
      {song?.sheetMusicXml && (
        <button
          className="btn btn-secondary btn-margin-bottom"
          onClick={() => setShowSheetMusic((v) => !v)}
        >
          {showSheetMusic ? 'Sembunyikan Partitur' : 'Lihat Partitur'}
        </button>
      )}
      {/* Tampilkan partitur jika diaktifkan */}
      {showSheetMusic && song?.sheetMusicXml && (
        <SongSheetMusic sheetMusicXml={song.sheetMusicXml} />
      )}
      <ChordDisplay
        song={song}
        transpose={transpose}
        zoom={zoom}
        showChordNumbers={showChordNumbers}
        keySignature={keySignature || song?.key || 'C'}
        onTimestampClick={(seconds) => {
          if (youtubeRef && youtubeRef.current && typeof youtubeRef.current.handleSeek === 'function') {
            youtubeRef.current.handleSeek(seconds);
          }
        }}
        onTimestampPause={() => {
          if (youtubeRef && youtubeRef.current && typeof youtubeRef.current.handlePause === 'function') {
            youtubeRef.current.handlePause();
          }
        }}
      />
    </div>
  );
}
