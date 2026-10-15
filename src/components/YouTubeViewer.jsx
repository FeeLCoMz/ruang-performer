/**
 * YouTubeViewer Component
 * ----------------------
 * Komponen React untuk menampilkan video YouTube (iframe embed) tanpa kontrol custom.
 *
 * Props:
 *   - videoId: string (YouTube video ID atau URL)
 *   - onTimeUpdate: function(currentTime: number) (opsional, dipanggil saat waktu video berubah)
 *   - ref: React ref (opsional, expose currentTime)
 *
 * Contoh penggunaan:
 *   <YouTubeViewer videoId="dQw4w9WgXcQ" />
 *   <YouTubeViewer videoId={youtubeUrl} ref={ytRef} />
 *
 * Untuk videoId, bisa langsung ID ("dQw4w9WgXcQ") atau URL YouTube.
 */
import React, { useState, useEffect, useRef } from 'react';

const YouTubeViewer = React.forwardRef(({
  videoId,
  onTimeUpdate,
  onStateChange,
  autoPlay = false
}, ref) => {
  const [player, setPlayer] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const containerIdRef = useRef(`youtube-player-${Math.random().toString(36).slice(2,9)}`);
  const mountedRef = useRef(false);
  // Player disimpan juga di ref agar aksi seek/pause dari imperative handle
  // tidak pernah memakai closure yang telat (root cause: tombol ±5 detik
  // menghitung dari currentTime state yang stale dan lompat ke 0/5 detik).
  const playerRef = useRef(null);

  const getLiveTime = () => {
    const p = playerRef.current;
    if (p && typeof p.getCurrentTime === 'function') {
      try {
        const t = Number(p.getCurrentTime());
        if (Number.isFinite(t) && t > 0) return t;
      } catch {}
    }
    return null;
  };

  const doSeek = (time) => {
    const p = playerRef.current;
    if (!p || typeof p.seekTo !== 'function') return;
    try {
      p.seekTo(Math.max(0, time), true);
      if (typeof p.playVideo === 'function') p.playVideo();
    } catch {}
  };

  // Expose currentTime and handleSeek to parent via ref.
  // Semua aksi memakai playerRef (instansi player live), bukan state `player`
  // yang bisa telat satu render — root cause tombol pause & ±5 detik tidak jalan:
  // handle menutup state lama sehingga `player` masih null / stale.
  React.useImperativeHandle(ref, () => ({
    currentTime,
    handlePlay: () => {
      const p = playerRef.current;
      if (p && typeof p.playVideo === 'function') {
        try { p.playVideo(); } catch {}
      }
    },
    handlePause: () => {
      const p = playerRef.current;
      if (p && typeof p.pauseVideo === 'function') {
        try { p.pauseVideo(); } catch {}
      }
    },
    handleTogglePlayPause: () => {
      const p = playerRef.current;
      if (p && typeof p.getPlayerState === 'function') {
        const state = p.getPlayerState();
        // state: 1 = PLAYING, 2 = PAUSED, 0/5 = ended/not started
        try {
          if (state === 1) p.pauseVideo();
          else p.playVideo();
        } catch {}
      }
    },
    getPlayerState: () => {
      const p = playerRef.current;
      if (p && typeof p.getPlayerState === 'function') {
        return p.getPlayerState();
      }
      return -1; // uninitialized
    },
    handleSeek: (time) => doSeek(time),
    /** Seek relatif dari posisi live player: ±delta detik. Anti-stale. */
    handleSeekOffset: (deltaSeconds) => {
      const live = getLiveTime();
      const base = live !== null ? live : Number(currentTime) || 0;
      doSeek(base + Number(deltaSeconds));
    },
  }), [currentTime, player]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Helper: extract YouTube video ID from URL or return as-is if already an ID
  function extractVideoId(input) {
    if (!input) return '';
    // If input looks like a YouTube URL, extract the ID
    const urlMatch = String(input).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:.*v=|v\/|embed\/|shorts\/|live\/|user\/.*#p\/u\/\d\/))([\w-]{11})/);
    if (urlMatch && urlMatch[1]) return urlMatch[1];
    // If input is 11-char ID
    if (/^[\w-]{11}$/.test(input)) return input;
    return '';
  }

  useEffect(() => {
    const id = extractVideoId(videoId);
    if (!id) return;

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
          if (!canceled) initPlayer(id);
        };
      } else {
        initPlayer(id);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const initPlayer = (id) => {
    const elId = containerIdRef.current;
    if (!(window.YT && window.YT.Player) || !mountedRef.current) return;
    if (player && typeof player.destroy === 'function') {
      try { player.destroy(); } catch (e) { /* ignore */ }
    }
    const newPlayer = new window.YT.Player(elId, {
      videoId: id,
      playerVars: {
        autoplay: autoPlay ? 1 : 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          setPlayer(event.target);
          playerRef.current = event.target;
          try {
            const d = event.target.getDuration?.() || 0;
            setDuration(Number.isFinite(d) ? d : 0);
          } catch {}

          if (autoPlay && typeof event.target.playVideo === 'function') {
            try {
              event.target.playVideo();
            } catch {}
          }
        },
        onStateChange: (event) => {
          if (typeof onStateChange === 'function') {
            try {
              onStateChange(event);
            } catch {}
          }
        }
      }
    });
  };


  // Poll current time every 200ms when player is available
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        const t = playerRef.current?.getCurrentTime?.() || 0;
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

  // Remove external seek effect (not needed)

  const fmt = (s) => {
    const sec = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const validId = extractVideoId(videoId);
  if (!validId) {
    return (
      <div className="youtube-viewer-empty">
        ID Video YouTube tidak valid
      </div>
    );
  }


  return (
    <div className="youtube-viewer">
      <div className="youtube-viewer-container">
        <div id={containerIdRef.current} className="youtube-iframe"></div>
      </div>
    </div>
  );
});

export default YouTubeViewer;
