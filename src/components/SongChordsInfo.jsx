import React from "react";
import TransposeKeyControl from "./TransposeKeyControl.jsx";

/**
 * SongChordsInfo
 * Komponen info lagu (key, tempo, genre, aransemen, patch, dsb)
 */
// originalKey: key from database (song)
// targetKey: key from setlist (if any)
export default function SongChordsInfo({
  originalKey, // from song DB
  targetKey,   // from setlist (can be undefined)
  transpose,
  setTranspose,
  timeSignature,
  tempo,
  scrollSpeed,
  setScrollSpeed,
  isMetronomeActive,
  setIsMetronomeActive,
  genre,
  arrangementStyle,
  keyboardPatch,
  showSongInfo,
  setShowSongInfo
}) {
  return (
    <div className="song-info-compact">
      <div className="song-info-compact-header">
        <h3 className="song-info-compact-title">📋 Info Lagu</h3>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => setShowSongInfo(!showSongInfo)}
          aria-label={showSongInfo ? 'Sembunyikan info lagu' : 'Tampilkan info lagu'}
          title={showSongInfo ? 'Sembunyikan info lagu' : 'Tampilkan info lagu'}
        >
          {showSongInfo ? '▼' : '▶'}
        </button>
      </div>
      {showSongInfo && (
        <div className="song-info-compact-grid">
           {(originalKey || targetKey) && (
             <div className="song-info-item song-info-priority song-info-key">
               <span className="song-info-label">🎹 Key</span>
               <TransposeKeyControl
                 originalKey={originalKey}
                 targetKey={targetKey}
                 transpose={transpose}
                 onTransposeChange={setTranspose}
               />
               {originalKey && (
                 <div className="song-info-original-key">
                   <span className="song-info-original-key-label">Original: </span>
                   <span>{originalKey}</span>
                 </div>
               )}
               {targetKey && targetKey !== originalKey && (
                 <div className="song-info-target-key">
                   <span className="song-info-target-key-label">Setlist: </span>
                   <span>{targetKey}</span>
                 </div>
               )}
             </div>
           )}
          {timeSignature && (
            <div className="song-info-item">
              <span className="song-info-label">🎼 Time</span>
              <span className="song-info-value">{timeSignature}</span>
            </div>
          )}
          {tempo && (
            <div className="song-info-item song-info-tempo">
              <span className="song-info-label">⏱️ Tempo</span>
              <div className="song-info-tempo-controls">
                <button
                  onClick={() => setScrollSpeed(Math.max(40, scrollSpeed - 5))}
                  className="btn btn-secondary"
                  title="Tempo down"
                  aria-label="Tempo down"
                >
                  −
                </button>
                <div className="song-info-tempo-display">
                  <span className="song-info-value">{scrollSpeed}</span>
                  <span className="song-info-tempo-unit">BPM</span>
                </div>
                <button
                  onClick={() => setScrollSpeed(Math.min(240, scrollSpeed + 5))}
                  className="btn btn-secondary"
                  title="Tempo up"
                  aria-label="Tempo up"
                >
                  +
                </button>
                <button
                  onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                  className={`btn btn-secondary ${isMetronomeActive ? "active" : ""}`}
                  title={isMetronomeActive ? "Stop metronome" : "Start metronome"}
                  aria-label={isMetronomeActive ? "Stop metronome" : "Start metronome"}
                >
                  {isMetronomeActive ? "⏹️" : "▶️"}
                </button>
              </div>
              <span className="song-info-tempo-term">
                {/* getTempoTerm harus dipanggil di parent */}
              </span>
              {isMetronomeActive && <div className="song-info-tempo-status">♪ Playing...</div>}
            </div>
          )}
          {genre && (
            <div className="song-info-item">
              <span className="song-info-label">🎸 Genre</span>
              <span className="song-info-value">{genre}</span>
            </div>
          )}
          {arrangementStyle && (
            <div className="song-info-item song-info-block song-info-block-arrangement">
              <span className="song-info-label">🎷 Aransemen</span>
              <span className="song-info-value">{arrangementStyle}</span>
            </div>
          )}
          {keyboardPatch && (
            <div className="song-info-item song-info-block song-info-block-keyboard">
              <span className="song-info-label">🎹 Keyboard Patch</span>
              <span className="song-info-value">{keyboardPatch}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
