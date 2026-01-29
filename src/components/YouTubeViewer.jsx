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
import TimeMarkers from './TimeMarkers.jsx';


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

const YouTubeViewer = React.forwardRef(({
  videoId,
  minimalControls = false,
  onTimeUpdate,
  seekToTime,
  showTimeMarkers = true,
  songId,
  timeMarkersProps = {},
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
  // Expand/collapse state for video
  const [videoExpanded, setVideoExpanded] = useState(true);

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
    setTimeout(() => { scrubberValueRef.current = null; }, 100); // Reset agar polling aktif lagi
    setCurrentTime(Number(value)); // Update currentTime setelah seek
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
        />
        {!minimalControls && (
          <span className="scrubber-time">{fmt(currentTime)} / {fmt(duration)}</span>
        )}
      </div>
      <div className="video-controls">
        <button type="button" onClick={handlePlayPause} className="btn-base btn-secondary">
          {isPlaying ? (minimalControls ? '⏸' : '⏸ Pause') : (minimalControls ? '▶' : '▶ Play')}
        </button>
        <button type="button" onClick={handleStop} className="btn-base btn-secondary">
          {minimalControls ? '⏹' : '⏹ Stop'}
        </button>
      </div>
    </>
  );

  return (
    <div className={minimalControls ? 'youtube-viewer-minimal' : 'youtube-viewer'}>
      <button
        type="button"
        className={`btn-base yt-collapse-btn${videoExpanded ? ' expanded' : ''}`}
        data-align={videoExpanded ? 'expanded' : 'collapsed'}
        onClick={() => setVideoExpanded(e => !e)}
        aria-label={videoExpanded ? 'Sembunyikan video' : 'Tampilkan video'}
        style={{ marginBottom: 8 }}
      >
        {videoExpanded ? 'Sembunyikan Video 🎬' : 'Tampilkan Video 🎬'}
      </button>
      <div className={videoExpanded ? 'yt-expandable expanded' : 'yt-expandable'}>
        {videoExpanded && (
          <>
            {minimalControls ? (
              <div className="yt-hidden-player">
                <div id={containerIdRef.current}></div>
              </div>
            ) : (
              <div className="video-container">
                <div id={containerIdRef.current}></div>
              </div>
            )}
            {Controls}
          </>
        )}
        {/* Gabungkan TimeMarkers di bawah video dan scrubber */}
        {showTimeMarkers && songId && (
          <TimeMarkers
            songId={songId}
            getCurrentTime={() => isScrubbing && scrubberValueRef.current !== null ? Number(scrubberValueRef.current) : currentTime}
            seekTo={handleSeek}
            {...timeMarkersProps}
          />
        )}
      </div>
    </div>
  );
});

export default YouTubeViewer;
