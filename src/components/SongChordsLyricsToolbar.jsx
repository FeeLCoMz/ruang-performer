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
  lyricsMode,
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
  zoom,
  setZoom,
  showChordNumbers,
  setShowChordNumbers,
  showRomanNumerals,
  setShowRomanNumerals,
  showJazzChords,
  setShowJazzChords,
  showSimpleChords,
  setShowSimpleChords,
  chordLayoutMode,
  setChordLayoutMode,
  barGridColumns,
  setBarGridColumns,
  barGridFocusMode,
  setBarGridFocusMode,
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
  onPlayYouTube,
  onRestartYouTube,
}) {
  const [showChordStyleMenu, setShowChordStyleMenu] = useState(false);
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [isYoutubeReady, setIsYoutubeReady] = useState(false);
  const chordStyleMenuRef = useRef(null);
  const normalizedTempo = Math.max(40, Math.min(240, Number(tempo) || 120));
  const isBarGridMode = chordLayoutMode === 'bar-grid';
  const currentChordStyleLabel = showRomanNumerals ? 'Romawi' : showJazzChords ? 'Jazz' : showSimpleChords ? 'Simple' : 'Default';
  const currentChordStyleKey = showRomanNumerals ? 'roman' : showJazzChords ? 'jazz' : showSimpleChords ? 'simple' : 'default';
  const toolbarClassName = `song-lyrics-toolbar ${performanceMode ? 'song-lyrics-toolbar--performance' : 'song-lyrics-toolbar--normal'}`;
  const currentGridPreset = isBarGridMode
    ? (() => {
      const columns = String(barGridColumns || 'auto');
      if (columns === '4' && barGridFocusMode) return 'dense';
      if (columns === '2' && barGridFocusMode) return 'conductor';
      if (columns === 'auto' && !barGridFocusMode) return 'balanced';
      return 'custom';
    })()
    : 'off';

  // Sync YouTube playing state
  useEffect(() => {
    if (!youtubeRef?.current) {
      setIsYoutubeReady(false);
      setIsYoutubePlaying(false);
      return;
    }

    const syncPlaybackState = () => {
      const state = youtubeRef.current?.getPlayerState?.();
      const nextPlaying = state === 1;
      setIsYoutubePlaying(nextPlaying);
      setIsYoutubeReady(true);
    };

    syncPlaybackState();
    const interval = setInterval(syncPlaybackState, 500);
    return () => clearInterval(interval);
  }, [youtubeRef, youtubeId]);

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
    setShowRomanNumerals(style === 'roman');
    setShowJazzChords(style === 'jazz');
    setShowSimpleChords(style === 'simple');
    setShowChordStyleMenu(false);
  };

  const applyGridPreset = (preset) => {
    if (typeof setChordLayoutMode !== 'function') return;
    if (typeof setBarGridColumns !== 'function') return;
    if (typeof setBarGridFocusMode !== 'function') return;

    if (preset === 'off') {
      setChordLayoutMode('lyrics');
      return;
    }

    setChordLayoutMode('bar-grid');

    if (preset === 'balanced') {
      setBarGridColumns('auto');
      setBarGridFocusMode(false);
      return;
    }

    if (preset === 'dense') {
      setBarGridColumns('4');
      setBarGridFocusMode(true);
      return;
    }

    if (preset === 'conductor') {
      setBarGridColumns('2');
      setBarGridFocusMode(true);
    }
  };

  return (
    <>
      <div className={toolbarClassName}>
        {!isEditingLyrics && !lyricsMode && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-actions">
            {!performanceMode && canEdit && (
              <button
                type="button"
                onClick={handleEditLyrics}
                className="btn btn-primary song-lyrics-toolbar-btn"
                title="Edit Lirik"
              >
                <span aria-hidden="true">✏️</span>
                <span className="song-lyrics-toolbar-btn-label">Edit Lirik</span>
              </button>
            )}

            {!performanceMode && (
              <div className="song-lyrics-export-menu-container">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn btn-secondary song-lyrics-toolbar-btn"
                  title="Export"
                >
                  <span aria-hidden="true">📥</span>
                  <span className="song-lyrics-toolbar-btn-label">Export</span>
                </button>
                <SongChordsExportMenu
                  showExportMenu={showExportMenu}
                  setShowExportMenu={setShowExportMenu}
                  handleExportText={handleExportText}
                  handleExportPDF={handleExportPDF}
                />
              </div>
            )}
          </div>
        )}

        {!isEditingLyrics && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-view">
            {!lyricsMode && youtubeId && youtubeRef && (
              <>
                <button
                  type="button"
                  className={`btn btn-secondary song-lyrics-youtube-btn${!performanceMode ? ' song-lyrics-youtube-btn--normal' : ''}`}
                  title={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
                  aria-label={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
                  onClick={() => {
                    if (performanceMode && typeof onPlayYouTube === 'function') {
                      onPlayYouTube();
                      return;
                    }
                    if (youtubeRef.current && typeof youtubeRef.current.handleTogglePlayPause === 'function') {
                      youtubeRef.current.handleTogglePlayPause();
                      setTimeout(() => {
                        const state = youtubeRef.current?.getPlayerState?.();
                        setIsYoutubePlaying(state === 1);
                      }, 100);
                    }
                  }}
                >
                  <span aria-hidden="true">{isYoutubePlaying ? '⏸' : '▶'}</span>
                  {!performanceMode && (
                    <span className="song-lyrics-toolbar-btn-label">{isYoutubePlaying ? 'Pause' : 'Play'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`btn btn-secondary song-lyrics-youtube-btn${!performanceMode ? ' song-lyrics-youtube-btn--normal' : ''}`}
                  title="Putar dari awal"
                  aria-label="Putar dari awal"
                  onClick={() => {
                    if (performanceMode && typeof onRestartYouTube === 'function') {
                      onRestartYouTube();
                      return;
                    }
                    if (youtubeRef.current && typeof youtubeRef.current.handleSeek === 'function') {
                      youtubeRef.current.handleSeek(0);
                      setTimeout(() => {
                        const state = youtubeRef.current?.getPlayerState?.();
                        setIsYoutubePlaying(state === 1);
                      }, 50);
                    }
                  }}
                >
                  <span aria-hidden="true">↺</span>
                  {!performanceMode && <span className="song-lyrics-toolbar-btn-label">Restart</span>}
                </button>
              </>
            )}
          </div>
        )}

        {!isEditingLyrics && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-fullscreen">
            <button
              type="button"
              className="btn btn-primary song-lyrics-fullscreen-btn song-lyrics-toolbar-btn"
              title="Tampilkan lirik layar penuh"
              aria-label="Buka layar penuh"
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
              <span aria-hidden="true">⛶</span>
              <span className="song-lyrics-fullscreen-btn-label">Full screen</span>
            </button>
          </div>
        )}

        {!isEditingLyrics && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-autoscroll">
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
              compactMode={performanceMode}
            />
          </div>
        )}

        {!isEditingLyrics && !lyricsMode && performanceMode && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-layout-toggle">
            <button
              type="button"
              className={`btn ${isBarGridMode ? 'btn-primary' : 'btn-secondary'} song-lyrics-toolbar-btn`}
              title={isBarGridMode ? 'Mode birama aktif' : 'Aktifkan mode birama'}
              aria-label={isBarGridMode ? 'Mode birama aktif' : 'Aktifkan mode birama'}
              onClick={() => {
                if (typeof setChordLayoutMode !== 'function') return;
                setChordLayoutMode((prev) => (prev === 'bar-grid' ? 'lyrics' : 'bar-grid'));
              }}
            >
              <span aria-hidden="true">▦</span>
            </button>
          </div>
        )}

        {!isEditingLyrics && !lyricsMode && isBarGridMode && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-grid-density">
            <select
              className="song-lyrics-grid-preset-select"
              value={currentGridPreset}
              onChange={(e) => applyGridPreset(e.target.value)}
              aria-label="Preset bar grid"
              title="Preset bar grid"
            >
              <option value="balanced">Balanced</option>
              <option value="dense">Dense</option>
              <option value="conductor">Conductor</option>
              {currentGridPreset === 'custom' && <option value="custom">Custom</option>}
            </select>
            <select
              className="song-lyrics-grid-density-select"
              value={String(barGridColumns || 'auto')}
              onChange={(e) => {
                if (typeof setBarGridColumns !== 'function') return;
                setBarGridColumns(e.target.value);
              }}
              aria-label="Kepadatan bar grid"
              title="Kepadatan bar grid"
            >
              <option value="auto">Auto</option>
              <option value="2">2 bar/row</option>
              <option value="4">4 bar/row</option>
            </select>
            <button
              type="button"
              className={`btn ${barGridFocusMode ? 'btn-primary' : 'btn-secondary'} song-lyrics-toolbar-btn`}
              onClick={() => {
                if (typeof setBarGridFocusMode !== 'function') return;
                setBarGridFocusMode((prev) => !prev);
              }}
              title={barGridFocusMode ? 'Nonaktifkan focus mode birama' : 'Aktifkan focus mode birama'}
              aria-label={barGridFocusMode ? 'Nonaktifkan focus mode birama' : 'Aktifkan focus mode birama'}
            >
              <span aria-hidden="true">◎</span>
              {!performanceMode && <span className="song-lyrics-toolbar-btn-label">{barGridFocusMode ? 'Focus ON' : 'Focus OFF'}</span>}
            </button>
          </div>
        )}

        {!isEditingLyrics && !lyricsMode && !performanceMode && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-layout-toggle">
            <button
              type="button"
              className={`btn ${isBarGridMode ? 'btn-primary' : 'btn-secondary'} song-lyrics-toolbar-btn`}
              title={isBarGridMode ? 'Kembali ke mode lirik standar' : 'Aktifkan mode bar grid'}
              aria-label={isBarGridMode ? 'Kembali ke mode lirik standar' : 'Aktifkan mode bar grid'}
              onClick={() => {
                if (typeof setChordLayoutMode !== 'function') return;
                setChordLayoutMode((prev) => (prev === 'bar-grid' ? 'lyrics' : 'bar-grid'));
              }}
            >
              <span aria-hidden="true">▦</span>
              <span className="song-lyrics-toolbar-btn-label">{isBarGridMode ? 'Line Mode' : 'Bar Grid'}</span>
            </button>
          </div>
        )}

        {!isEditingLyrics && !lyricsMode && performanceMode && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-tempo-led-compact" title={`Tempo ${normalizedTempo} BPM`}>
            <span
              className="song-info-tempo-led"
              style={{ animationDuration: `${Math.round(60000 / normalizedTempo)}ms` }}
              aria-hidden="true"
            />
            <span className="song-lyrics-tempo-led-compact-text">{normalizedTempo}</span>
          </div>
        )}

        {!isEditingLyrics && !lyricsMode && performanceMode && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-transpose-compact">
            <div className="song-lyrics-transpose-controls-compact" title="Transpose sederhana">
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
            </div>
          </div>
        )}

        {!isEditingLyrics && !lyricsMode && !performanceMode && (
          <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-chords">
            <div className="song-lyrics-transpose-controls" title="Transpose lirik/chord">
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

            <button
              className={`btn ${showChordNumbers ? 'btn-primary' : 'btn-secondary'} song-lyrics-toolbar-btn`}
              title={showChordNumbers ? 'Chord (angka) - aktif' : 'Toggle angka chord'}
              onClick={() => {
                setShowChordNumbers((prev) => {
                  const next = !prev;
                  if (next) {
                    setShowRomanNumerals(false);
                    setShowJazzChords(false);
                    setShowSimpleChords(false);
                  }
                  return next;
                });
              }}
            >
              <span aria-hidden="true">🔢</span>
              <span className="song-lyrics-toolbar-btn-label">Angka</span>
            </button>

            <button
              className={`btn ${showRomanNumerals ? 'btn-primary' : 'btn-secondary'} song-lyrics-toolbar-btn`}
              title={showRomanNumerals ? 'Chord (romawi) - aktif' : 'Toggle chord romawi'}
              onClick={() => {
                setShowRomanNumerals((prev) => {
                  const next = !prev;
                  if (next) {
                    setShowChordNumbers(false);
                    setShowJazzChords(false);
                    setShowSimpleChords(false);
                  }
                  return next;
                });
              }}
            >
              <span aria-hidden="true">Ⅳ</span>
              <span className="song-lyrics-toolbar-btn-label">Romawi</span>
            </button>

            <div className="song-lyrics-chord-style-menu-container" ref={chordStyleMenuRef}>
              <button
                className={`btn ${showJazzChords || showSimpleChords ? 'btn-primary' : 'btn-secondary'} song-lyrics-toolbar-btn`}
                title={`Style chord: ${currentChordStyleLabel}`}
                onClick={() => setShowChordStyleMenu((prev) => !prev)}
                type="button"
                aria-haspopup="menu"
                aria-expanded={showChordStyleMenu}
              >
                <span aria-hidden="true">🎼</span>
                <span className="song-lyrics-toolbar-btn-label">Style</span>
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
                    className={`song-lyrics-chord-style-item${!showJazzChords && !showSimpleChords && !showRomanNumerals ? ' active' : ''}`}
                    onClick={() => applyChordStyle('default')}
                    role="menuitem"
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    className={`song-lyrics-chord-style-item${showRomanNumerals ? ' active' : ''}`}
                    onClick={() => applyChordStyle('roman')}
                    role="menuitem"
                  >
                    Roman
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
          </div>
        )}
      </div>
    </>
  );
}
