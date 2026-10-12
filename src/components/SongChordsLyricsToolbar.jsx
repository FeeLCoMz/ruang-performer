import React, { useEffect, useRef, useState } from "react";

/**
 * SongChordsLyricsToolbar
 * Toolbar untuk panel lirik/chord: kontrol chord (angka & style),
 * pemutaran YouTube, dan autoscroll.
 *
 * Catatan: kontrol edit lirik, transpose, tempo, dan fullscreen sudah dihapus.
 */
export default function SongChordsLyricsToolbar({
  autoScrollActive,
  setAutoScrollActive,
  showChordNumbers,
  setShowChordNumbers,
  showJazzChords,
  setShowJazzChords,
  showSimpleChords,
  setShowSimpleChords,
  youtubeId,
  youtubeRef,
}) {
  const [showChordStyleMenu, setShowChordStyleMenu] = useState(false);
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [isYoutubeReady, setIsYoutubeReady] = useState(false);
  const chordStyleMenuRef = useRef(null);
  const currentChordStyleLabel = showJazzChords ? 'Jazz' : showSimpleChords ? 'Simple' : 'Default';
  const currentChordStyleKey = showJazzChords ? 'jazz' : showSimpleChords ? 'simple' : 'default';
  const toolbarClassName = 'song-lyrics-toolbar song-lyrics-toolbar--normal';

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
    setShowJazzChords(style === 'jazz');
    setShowSimpleChords(style === 'simple');
    setShowChordStyleMenu(false);
  };

  return (
    <div className={toolbarClassName}>
      {youtubeId && youtubeRef && (
        <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-view">
          <button
            type="button"
            className="btn btn-secondary song-lyrics-youtube-btn song-lyrics-youtube-btn--normal"
            title={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
            aria-label={isYoutubePlaying ? 'Pause YouTube' : 'Play YouTube'}
            onClick={() => {
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
            <span className="song-lyrics-toolbar-btn-label">{isYoutubePlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary song-lyrics-youtube-btn song-lyrics-youtube-btn--normal"
            title="Putar dari awal"
            aria-label="Putar dari awal"
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
            <span aria-hidden="true">↺</span>
            <span className="song-lyrics-toolbar-btn-label">Restart</span>
          </button>
        </div>
      )}

      <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-autoscroll">
        <button
          type="button"
          className={`btn song-lyrics-toolbar-btn ${autoScrollActive ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setAutoScrollActive(!autoScrollActive)}
          title={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
          aria-label={autoScrollActive ? 'Matikan autoscroll' : 'Nyalakan autoscroll'}
          aria-pressed={autoScrollActive}
        >
          <span aria-hidden="true">↕</span>
          <span className="song-lyrics-toolbar-btn-label">Autoscroll</span>
        </button>
      </div>

      <div className="song-lyrics-toolbar-group song-lyrics-toolbar-group-chords">
        <button
          type="button"
          className={`btn ${showChordNumbers ? 'btn-primary' : 'btn-secondary'} song-lyrics-toolbar-btn`}
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
          <span aria-hidden="true">🔢</span>
          <span className="song-lyrics-toolbar-btn-label">Angka</span>
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
                    </div>
                  </div>
                );
              }
