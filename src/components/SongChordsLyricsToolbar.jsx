import React, { useEffect, useRef, useState } from "react";
import AutoScrollBar from "./AutoScrollBar.jsx";
import SongChordsExportMenu from "./SongChordsExportMenu.jsx";

/**
 * SongChordsLyricsToolbar
 * Toolbar untuk kontrol lirik/chord: autoscroll, fullscreen, zoom, edit, export.
 * Props:
 *   - isEditingLyrics
 *   - performanceMode
 *   - canEdit
 *   - tempo
 *   - autoScrollActive
 *   - scrollSpeed
 *   - setAutoScrollActive
 *   - setScrollSpeed
 *   - lyricsDisplayRef
 *   - currentBeat
 *   - setCurrentBeat
 *   - zoom
 *   - setZoom
 *   - handleEditLyrics
 *   - savingLyrics
 *   - handleSaveLyrics
 *   - handleCancelEditLyrics
 *   - showExportMenu
 *   - setShowExportMenu
 *   - handleExportText
 *   - handleExportPDF
 */
export default function SongChordsLyricsToolbar({
  isEditingLyrics,
  performanceMode,
  vocalMode,
  canEdit,
  tempo,
  timeSignature,
  autoScrollActive,
  scrollSpeed,
  setAutoScrollActive,
  setScrollSpeed,
  lyricsDisplayRef,
  currentBeat,
  setCurrentBeat,
  transpose,
  setTranspose,
  showChords,
  setShowChords,
  zoom,
  setZoom,
  showChordNumbers,
  setShowChordNumbers,
  showJazzChords,
  setShowJazzChords,
  showSimpleChords,
  setShowSimpleChords,
  keySignature,
  handleEditLyrics,
  savingLyrics,
  handleSaveLyrics,
  handleAlignSelectedBarlines,
  handleWrap4BarsPerLine,
  barsPerLine,
  setBarsPerLine,
  handleWrapBarsPerLine,
  handleCancelEditLyrics,
  onOpenPiano,
  insertNotesToLyrics,
  setInsertNotesToLyrics,
  insertNoteFormat,
  setInsertNoteFormat,
  insertTrailingSpace,
  setInsertTrailingSpace,
  showExportMenu,
  setShowExportMenu,
  handleExportText,
  handleExportPDF,
  youtubeId,
  youtubeRef,
}) {
  const [showChordStyleMenu, setShowChordStyleMenu] = useState(false);
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const chordStyleMenuRef = useRef(null);
  const currentChordStyleLabel = showJazzChords ? 'Jazz' : showSimpleChords ? 'Simple' : 'Default';
  const currentChordStyleKey = showJazzChords ? 'jazz' : showSimpleChords ? 'simple' : 'default';

  // Sync YouTube playing state
  useEffect(() => {
    if (!youtubeRef?.current) return;
    const interval = setInterval(() => {
      const state = youtubeRef.current?.getPlayerState?.();
      setIsYoutubePlaying(state === 1);
    }, 500);
    return () => clearInterval(interval);
  }, [youtubeRef]);

  useEffect(() => {
    if (!showChordStyleMenu) return undefined;

    const handlePointerDown = (event) => {
      if (!chordStyleMenuRef.current?.contains(event.target)) {
        setShowChordStyleMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showChordStyleMenu]);

  const applyChordStyle = (style) => {
    setShowChordNumbers(false);
    setShowJazzChords(style === 'jazz');
    setShowSimpleChords(style === 'simple');
    setShowChordStyleMenu(false);
  };

  return (
    <>
      <div className="song-lyrics-toolbar">
        {!isEditingLyrics && (
          <>
            <button
              className="btn btn-secondary"
              title="Tampilkan lirik layar penuh"
              onClick={() => {
                const el = document.querySelector(".song-lyrics-display");
                if (el && el.requestFullscreen) {
                  el.requestFullscreen();
                } else if (el && el.webkitRequestFullscreen) {
                  el.webkitRequestFullscreen();
                } else if (el && el.msRequestFullscreen) {
                  el.msRequestFullscreen();
                }
              }}
            >
              🖥️
            </button>

            {youtubeId && youtubeRef && (
              <>
                <button
                  className="btn btn-secondary"
                  title={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
                  onClick={() => {
                    if (youtubeRef.current && typeof youtubeRef.current.handleTogglePlayPause === 'function') {
                      youtubeRef.current.handleTogglePlayPause();
                      // Update state setelah toggle
                      setTimeout(() => {
                        const state = youtubeRef.current?.getPlayerState?.();
                        setIsYoutubePlaying(state === 1);
                      }, 50);
                    }
                  }}
                >
                  {isYoutubePlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button
                  className="btn btn-secondary"
                  title="Putar dari awal"
                  onClick={() => {
                    if (youtubeRef.current && typeof youtubeRef.current.handleSeek === 'function') {
                      youtubeRef.current.handleSeek(0);
                      setTimeout(() => {
                        const state = youtubeRef.current?.getPlayerState?.();
                        setIsYoutubePlaying(state === 1);
                      }, 50);
                    }
                  }}
                >
                  ⏮️ Restart
                </button>
              </>
            )}

            <AutoScrollBar
              tempo={parseInt(tempo, 10) || 120}
              timeSignature={timeSignature || '4/4'}
              active={autoScrollActive}
              speed={scrollSpeed}
              onToggle={() => setAutoScrollActive(!autoScrollActive)}
              onSpeedChange={setScrollSpeed}
              lyricsDisplayRef={lyricsDisplayRef}
              currentBeat={currentBeat}
              setCurrentBeat={setCurrentBeat}
            />

            <div className="song-lyrics-transpose-controls" title="Transpose lirik/chord">
              {vocalMode && (
                <button
                  type="button"
                  className={`btn ${showChords ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => setShowChords((prev) => !prev)}
                  title={showChords ? 'Sembunyikan chord untuk fokus lirik' : 'Tampilkan chord'}
                  aria-label={showChords ? 'Sembunyikan chord' : 'Tampilkan chord'}
                >
                  {showChords ? '🙈 Chord' : '👀 Chord'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTranspose((prev) => prev - 1)}
                title="Transpose turun 1 semitone"
                aria-label="Transpose turun"
              >
                -
              </button>
              <span className="song-lyrics-transpose-value" aria-live="polite">
                Tr {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTranspose((prev) => prev + 1)}
                title="Transpose naik 1 semitone"
                aria-label="Transpose naik"
              >
                +
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTranspose(0)}
                title="Reset transpose"
                aria-label="Reset transpose"
                disabled={transpose === 0}
              >
                0
              </button>
            </div>

            {!performanceMode && (
              <>
                <button
                  className={`btn ${showChordNumbers ? 'btn-primary' : 'btn-secondary'}`}
                  title={showChordNumbers ? 'Chord (angka) - aktif' : 'Toggle angka chord'}
                  onClick={() => {
                    setShowChordNumbers((prev) => {
                      const next = !prev;
                      if (next) {
                        setShowJazzChords(false);
                        setShowSimpleChords(false);
                      }
                      return next;
                    });
                  }}
                >
                  🔢
                </button>

                <div className="song-lyrics-chord-style-menu-container" ref={chordStyleMenuRef}>
                  <button
                    className={`btn ${showJazzChords || showSimpleChords ? 'btn-primary' : 'btn-secondary'}`}
                    title={`Style chord: ${currentChordStyleLabel}`}
                    onClick={() => setShowChordStyleMenu((prev) => !prev)}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={showChordStyleMenu}
                  >
                    🎼
                  </button>
                  <span
                    className={`song-lyrics-chord-style-badge mode-${currentChordStyleKey}`}
                    title={`Style chord aktif: ${currentChordStyleLabel}`}
                  >
                    Style: {currentChordStyleLabel}
                  </span>
                  {showChordStyleMenu && (
                    <div className="song-lyrics-chord-style-menu" role="menu" aria-label="Pilih style chord">
                      <button
                        type="button"
                        className={`song-lyrics-chord-style-item${!showJazzChords && !showSimpleChords ? ' active' : ''}`}
                        onClick={() => applyChordStyle('default')}
                        role="menuitem"
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        className={`song-lyrics-chord-style-item${showJazzChords ? ' active' : ''}`}
                        onClick={() => applyChordStyle('jazz')}
                        role="menuitem"
                      >
                        Jazz
                      </button>
                      <button
                        type="button"
                        className={`song-lyrics-chord-style-item${showSimpleChords ? ' active' : ''}`}
                        onClick={() => applyChordStyle('simple')}
                        role="menuitem"
                      >
                        Simple
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {!isEditingLyrics && (
          <>
            {!performanceMode && canEdit && (
              <button
                type="button"
                onClick={handleEditLyrics}
                className="btn btn-primary"
                title="Edit Lirik"
              >
                ✏️
              </button>
            )}

            {!performanceMode && (
              <div className="song-lyrics-export-menu-container">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn btn-secondary"
                  title="Export"
                >
                  📥
                </button>
                <SongChordsExportMenu
                  showExportMenu={showExportMenu}
                  setShowExportMenu={setShowExportMenu}
                  handleExportText={handleExportText}
                  handleExportPDF={handleExportPDF}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
