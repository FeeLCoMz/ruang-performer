import React, { useState, useEffect, useRef } from 'react';
import './YouTubeViewer.css';

function extractYouTubeId(input) {
  if (!input) return null;
  // If already looks like an ID (11 chars, letters/numbers/-/_)
  const maybeId = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(maybeId)) return maybeId;

  // Try to extract from URL
  try {
    const url = new URL(maybeId.includes('http') ? maybeId : `https://${maybeId}`);
    // v= query param
    if (url.searchParams && url.searchParams.get('v')) return url.searchParams.get('v');
    // youtu.be short link
    if (url.hostname && url.pathname) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    }
  } catch (e) {
    // not a full url, try regex fallback
    const m = maybeId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  }

  return null;
}

const YouTubeViewer = React.forwardRef(({ videoId, minimalControls = false, onTimeUpdate, seekToTime }, ref) => {
  const [player, setPlayer] = useState(null);
  const pendingSeekRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const containerIdRef = useRef(`youtube-player-${Math.random().toString(36).slice(2,9)}`);
  const mountedRef = useRef(false);

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
    const id = extractYouTubeId(videoId);
    if (!id) return;

    let canceled = false;

    const ensureApiAndInit = () => {
      if (!window.YT || !window.YT.Player) {
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prev === 'function') prev();
          if (!canceled) initPlayer(id);
        };
      } else {
        initPlayer(id);
      }
    };

    ensureApiAndInit();

    return () => {
      canceled = true;
      if (player && typeof player.destroy === 'function') {
        try { player.destroy(); } catch (e) { /* ignore */ }
      }
      setPlayer(null);
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

  const id = extractYouTubeId(videoId);
  if (!id) {
    return (
      <div className="youtube-viewer">
        <div className="no-video">ID Video YouTube tidak valid</div>
      </div>
    );
  }

  // Poll current time every 200ms when player is available (smoother sync)
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        // Jika ada pending seek, lakukan sekarang
        if (pendingSeekRef.current != null && typeof player.seekTo === 'function') {
          try {
            player.seekTo(pendingSeekRef.current, true);
            setCurrentTime(pendingSeekRef.current);
            pendingSeekRef.current = null;
          } catch {}
        }
        const t = player.getCurrentTime?.() || 0;
        const d = player.getDuration?.() || duration;
        setCurrentTime(Number.isFinite(t) ? t : 0);
        setDuration(Number.isFinite(d) ? d : 0);
        if (typeof onTimeUpdate === 'function') {
          try { onTimeUpdate(Number.isFinite(t) ? t : 0, Number.isFinite(d) ? d : 0); } catch {}
        }
      } catch {}
    }, 200);
    return () => clearInterval(interval);
  }, [player]);

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

  if (minimalControls) {
    return (
      <div className="youtube-viewer-minimal">
        {/* Hidden player container to enable audio playback without showing video */}
        <div className="yt-hidden-player">
          <div id={containerIdRef.current}></div>
        </div>
        {/* Scrubber above controls */}
        <div className="video-scrubber">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            step={1}
            value={Math.floor(currentTime)}
            onChange={(e) => handleSeek(e.target.value)}
            onInput={(e) => handleSeek(e.target.value)}
            disabled={!player || !duration}
            aria-label="Scrub waktu video"
          />
          <span className="scrubber-time">{fmt(currentTime)} / {fmt(duration)}</span>
        </div>
        <div className="video-controls">
          <button type="button" onClick={handlePlayPause} className="btn btn-secondary">
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button type="button" onClick={handleStop} className="btn btn-secondary">
            ⏹ Stop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="youtube-viewer">
      <div className="video-container">
        <div id={containerIdRef.current}></div>
      </div>
      {/* Scrubber above controls */}
      <div className="video-scrubber">
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(duration))}
          step={1}
          value={Math.floor(currentTime)}
          onChange={(e) => handleSeek(e.target.value)}
          onInput={(e) => handleSeek(e.target.value)}
          disabled={!player || !duration}
          aria-label="Scrub waktu video"
        />
        <span className="scrubber-time">{fmt(currentTime)} / {fmt(duration)}</span>
      </div>
      <div className="video-controls">
        <button type="button" onClick={handlePlayPause} className="btn btn-secondary">
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button type="button" onClick={handleStop} className="btn btn-secondary">
          ⏹ Stop
        </button>
      </div>
    </div>
  );
});

export default YouTubeViewer;
