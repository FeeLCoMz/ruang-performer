/**
 * YouTubeViewer Component
 * ----------------------
 * Komponen React untuk menampilkan video YouTube dengan kontrol play/pause, seek, dan event time update.
 *
 * Props:
 *   - videoId: string (YouTube video ID atau URL)
 *   - minimalControls: boolean (opsional, true untuk kontrol minimal)
 *   - onTimeUpdate: function(currentTime: number) (opsional, dipanggil saat waktu video berubah)
 *   - seekToTime: number (opsional, seek ke waktu tertentu dalam detik)
 *   - ref: React ref (opsional, expose handlePlayPause, handleStop, handleSeek, isPlaying, currentTime)
 *
 * Contoh penggunaan:
 *   <YouTubeViewer videoId="dQw4w9WgXcQ" minimalControls={false} />
 *   <YouTubeViewer videoId={youtubeUrl} onTimeUpdate={handleTime} ref={ytRef} />
 *
 * Untuk videoId, bisa langsung ID ("dQw4w9WgXcQ") atau URL YouTube.
 */
import React, { useState, useEffect, useRef } from 'react';

const YouTubeViewer = React.forwardRef(({
  videoId,
  minimalControls = false,
  onTimeUpdate,
  seekToTime,
}, ref) => {
  const [player, setPlayer] = useState(null);
  const pendingSeekRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const containerIdRef = useRef(`youtube-player-${Math.random().toString(36).slice(2,9)}`);
  const mountedRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubberValueRef = useRef(null);

  // Expose play/pause, stop, seek, and currentTime to parent via ref
  React.useImperativeHandle(ref, () => ({
    handlePlayPause,
    handleStop,
    handleSeek,
    isPlaying,
    currentTime
  }), [isPlaying, player, currentTime]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!videoId) return;

    let canceled = false;
    let prevOnReady = null;

    const ensureApiAndInit = () => {
      if (!window.YT || !window.YT.Player) {
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        prevOnReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prevOnReady === 'function') prevOnReady();
          if (!canceled) initPlayer(videoId);
        };
      } else {
        initPlayer(videoId);
      }
    };

    ensureApiAndInit();

    return () => {
      canceled = true;
      // Clean up onYouTubeIframeAPIReady if this component set it
      if (window.onYouTubeIframeAPIReady && prevOnReady) {
        window.onYouTubeIframeAPIReady = prevOnReady;
      }
      if (player && typeof player.destroy === 'function') {
        try { player.destroy(); } catch (e) { /* ignore */ }
      }
      if (mountedRef.current) setPlayer(null);
      scrubberValueRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const initPlayer = (id) => {
    const elId = containerIdRef.current;
    if (!(window.YT && window.YT.Player) || !mountedRef.current) return;
    // destroy existing
    if (player && typeof player.destroy === 'function') {
      try { player.destroy(); } catch (e) { /* ignore */ }
    }

    const newPlayer = new window.YT.Player(elId, {
      videoId: id,
      playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
      events: {
        onReady: (event) => {
          setPlayer(event.target);
          try {
            const d = event.target.getDuration?.() || 0;
            setDuration(Number.isFinite(d) ? d : 0);
          } catch {}
        },
        onStateChange: (event) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        }
      }
    });
  };

  const handlePlayPause = () => {
    if (player) {
      isPlaying ? player.pauseVideo() : player.playVideo();
    }
  };

  const handleStop = () => {
    if (player) player.stopVideo();
  };

  const handleSeek = (value) => {
    const t = Math.max(0, Math.floor(Number(value) || 0));
    if (player && typeof player.seekTo === 'function') {
      try {
        player.seekTo(t, true);
        setCurrentTime(t); // fallback update
        pendingSeekRef.current = null;
      } catch {
        pendingSeekRef.current = t;
      }
    } else {
      // Player belum siap, simpan target seek
      pendingSeekRef.current = t;
    }
  };

  const handleScrubberChange = (e) => {
    const value = e.target.value;
    setIsScrubbing(true);
    scrubberValueRef.current = value;
    // Jangan update currentTime di sini, biarkan preview hanya di UI
  };
  const handleScrubberCommit = (e) => {
    const value = e.target.value;
    setIsScrubbing(false);
    handleSeek(value);
    setTimeout(() => { scrubberValueRef.current = null; }, 100);
    setCurrentTime(Number(value));
  };

  // Poll current time every 200ms when player is available
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        if (pendingSeekRef.current != null && typeof player.seekTo === 'function') {
          try {
            player.seekTo(pendingSeekRef.current, true);
            setCurrentTime(pendingSeekRef.current);
            pendingSeekRef.current = null;
          } catch {}
        }
        if (!isScrubbing) {
          const t = player.getCurrentTime?.() || 0;
          const d = player.getDuration?.() || duration;
          setCurrentTime(Number.isFinite(t) ? t : 0);
          setDuration(Number.isFinite(d) ? d : 0);
          if (typeof onTimeUpdate === 'function') {
            try { onTimeUpdate(Number.isFinite(t) ? t : 0, Number.isFinite(d) ? d : 0); } catch {}
          }
        }
      } catch {}
    }, 200);
    return () => clearInterval(interval);
  }, [player, isScrubbing]);

  // External seek control
  useEffect(() => {
    if (player && typeof seekToTime === 'number' && Number.isFinite(seekToTime)) {
      try { player.seekTo(Math.max(0, seekToTime), true); } catch {}
      setCurrentTime(Math.max(0, Math.floor(seekToTime)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToTime]);

  const fmt = (s) => {
    const sec = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  if (!videoId) {
    return (
      <div className="youtube-viewer-empty">
        ID Video YouTube tidak valid
      </div>
    );
  }

  // Shared controls markup
  const Controls = (
    <>
      <div className="video-scrubber">
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(duration))}
          step={1}
          value={
            minimalControls
              ? Math.floor(currentTime)
              : (isScrubbing && scrubberValueRef.current !== null ? scrubberValueRef.current : Math.floor(currentTime))
          }
          onChange={minimalControls ? (e) => handleSeek(e.target.value) : handleScrubberChange}
          onInput={minimalControls ? (e) => handleSeek(e.target.value) : undefined}
          onMouseUp={minimalControls ? undefined : handleScrubberCommit}
          onTouchEnd={minimalControls ? undefined : handleScrubberCommit}
          disabled={!player || !duration}
          aria-label="Scrub waktu video"
          className="scrubber-input"
        />
        {!minimalControls && (
          <span className="scrubber-time">{fmt(currentTime)} / {fmt(duration)}</span>
        )}
      </div>
      <div className="video-controls">
        <button type="button" onClick={handlePlayPause} className="btn-base btn-secondary" aria-label={isPlaying ? 'Pause video' : 'Play video'}>
          {isPlaying ? (minimalControls ? '⏸' : '⏸ Pause') : (minimalControls ? '▶' : '▶ Play')}
        </button>
        <button type="button" onClick={handleStop} className="btn-base btn-secondary" aria-label="Stop video">
          {minimalControls ? '⏹' : '⏹ Stop'}
        </button>
      </div>
    </>
  );

  return (
    <div className="youtube-viewer">
      {minimalControls ? (
        <div className="youtube-viewer-hidden">
          <div id={containerIdRef.current}></div>
        </div>
      ) : (
        <div className="youtube-viewer-container">
          <div id={containerIdRef.current} className="youtube-iframe"></div>
        </div>
      )}
      
      {/* Scrubber */}
      <div className="youtube-scrubber-section">
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(duration))}
          step={1}
          value={
            minimalControls
              ? Math.floor(currentTime)
              : (isScrubbing && scrubberValueRef.current !== null ? scrubberValueRef.current : Math.floor(currentTime))
          }
          onChange={minimalControls ? (e) => handleSeek(e.target.value) : handleScrubberChange}
          onInput={minimalControls ? (e) => handleSeek(e.target.value) : undefined}
          onMouseUp={minimalControls ? undefined : handleScrubberCommit}
          onTouchEnd={minimalControls ? undefined : handleScrubberCommit}
          disabled={!player || !duration}
          aria-label="Scrub waktu video"
          className="scrubber-input"
        />
        {!minimalControls && (
          <div className="scrubber-time-display">
            {fmt(currentTime)} / {fmt(duration)}
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="youtube-controls">
        <button
          type="button"
          onClick={handlePlayPause}
          className={`youtube-btn-play ${isPlaying ? 'playing' : ''}`}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button
          type="button"
          onClick={handleStop}
          className="youtube-btn-stop"
        >
          ⏹️ Stop
        </button>
      </div>
    </div>
  );
});

export default YouTubeViewer;
