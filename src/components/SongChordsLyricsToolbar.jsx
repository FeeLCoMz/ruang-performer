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
  // Satu mode chord aktif: 'default' | 'number' | 'jazz' | 'simple'
  const currentChordMode = showChordNumbers
    ? 'number'
    : showJazzChords
      ? 'jazz'
      : showSimpleChords
        ? 'simple'
        : 'default';
  const CHORD_MODE_LABELS = {
    default: 'Chord',
    number: 'Angka',
    jazz: 'Jazz',
    simple: 'Simple',
  };
  const currentChordModeLabel = CHORD_MODE_LABELS[currentChordMode];
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

  const applyChordMode = (mode) => {
    setShowChordNumbers(mode === 'number');
    setShowJazzChords(mode === 'jazz');
    setShowSimpleChords(mode === 'simple');
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
        <div className="song-lyrics-chord-style-menu-container" ref={chordStyleMenuRef}>
          <button
            type="button"
            className={`btn ${currentChordMode === 'default' ? 'btn-secondary' : 'btn-primary'} song-lyrics-toolbar-btn`}
            title={`Tampilan chord: ${currentChordModeLabel} (klik untuk ganti)`}
            onClick={() => setShowChordStyleMenu((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={showChordStyleMenu}
          >
            <span aria-hidden="true">🎼</span>
            <span className="song-lyrics-toolbar-btn-label">{currentChordModeLabel}</span>
            <span className="song-lyrics-toolbar-btn-caret" aria-hidden="true">▾</span>
          </button>
          {showChordStyleMenu && (
            <div className="song-lyrics-chord-style-menu" role="menu" aria-label="Pilih tampilan chord">
              <button
                type="button"
                className={`song-lyrics-chord-style-item${currentChordMode === 'default' ? ' active' : ''}`}
                onClick={() => applyChordMode('default')}
                role="menuitemradio"
                aria-checked={currentChordMode === 'default'}
              >
                Chord
              </button>
              <button
                type="button"
                className={`song-lyrics-chord-style-item${currentChordMode === 'number' ? ' active' : ''}`}
                onClick={() => applyChordMode('number')}
                role="menuitemradio"
                aria-checked={currentChordMode === 'number'}
              >
                Angka
              </button>
              <button
                type="button"
                className={`song-lyrics-chord-style-item${currentChordMode === 'jazz' ? ' active' : ''}`}
                onClick={() => applyChordMode('jazz')}
                role="menuitemradio"
                aria-checked={currentChordMode === 'jazz'}
              >
                Jazz
              </button>
              <button
                type="button"
                className={`song-lyrics-chord-style-item${currentChordMode === 'simple' ? ' active' : ''}`}
                onClick={() => applyChordMode('simple')}
                role="menuitemradio"
                aria-checked={currentChordMode === 'simple'}
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
