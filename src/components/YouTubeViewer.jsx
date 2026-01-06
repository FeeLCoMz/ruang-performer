import React, { useState, useEffect, useRef } from 'react';

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

const YouTubeViewer = ({ videoId, minimalControls = false }) => {
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerIdRef = useRef(`youtube-player-${Math.random().toString(36).slice(2,9)}`);
  const mountedRef = useRef(false);

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

  const id = extractYouTubeId(videoId);
  if (!id) {
    return (
      <div className="youtube-viewer">
        <div className="no-video">ID Video YouTube tidak valid</div>
      </div>
    );
  }

  if (minimalControls) {
    return (
      <div className="youtube-viewer-minimal">
        <div className="video-controls">
          <button onClick={handlePlayPause} className="btn btn-secondary">
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={handleStop} className="btn btn-secondary">
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
      <div className="video-controls">
        <button onClick={handlePlayPause} className="btn btn-secondary">
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={handleStop} className="btn btn-secondary">
          ⏹ Stop
        </button>
      </div>
    </div>
  );
};

export default YouTubeViewer;
