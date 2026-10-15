import React, { useState, useEffect, useRef } from 'react';

/**
 * SongMediaPanel
 *
 * Satu file yang mengintegrasikan tiga komponen yang sebelumnya terpisah:
 * 1. `YouTubeViewer` — embed player YouTube (iframe API) dengan imperative
 *    handle (play/pause/seek/seekOffset/getPlayerState/currentTime).
 * 2. `TimeMarkers` — daftar time marker (tambah/edit/hapus/seek), readonly
 *    untuk halaman performa.
 * 3. `SongMediaPanel` (default export) — panel shared yang merangkai keduanya:
 *    video + kontrol playback + kontrol time marker.
 *
 * Dipakai di semua halaman yang menampilkan video + time marker, dengan satu
 * aturan CSS yang sama (kelas `smp-*` di App.css):
 *
 * - SongListPage (inline player di daftar lagu)
 * - SongAddEditPage (kolom media di studio editor)
 * - SongChordsMediaPanel (tab Media & kolom samping tab Lirik di song view)
 * - SetlistSongsPage (inline player "Now Playing" di setlist)
 * - FloatingYouTubePlayer (mini player mengambang)
 *
 * `onUpdateMarkers` tidak diberikan → seksi marker disembunyikan (mis. inline
 * player daftar lagu yang tidak butuh marker), kecuali dipaksa via `showMarkers`.
 */

/* =========================================================================
   1. YouTubeViewer — embed player YouTube
   ========================================================================= */

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
export const YouTubeViewer = React.forwardRef(({
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

/* =========================================================================
   2. TimeMarkers — daftar time marker
   ========================================================================= */

export function TimeMarkers({
  timeMarkers = [],
  onSeek,
  currentTime = 0,
  duration = 0,
  readonly = false,
  onUpdate,
  getCurrentYouTubeTime, // function: returns current time in seconds from YouTube player
  compactUI = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTime, setEditTime] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(!compactUI);

  const formatTime = (seconds) => {
    const sec = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr) => {
    const parts = timeStr.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr) || 0;
  };

  // Auto-fill newTime with YouTube time when add form is shown
  useEffect(() => {
    if (!readonly && typeof getCurrentYouTubeTime === 'function') {
      const ytTime = getCurrentYouTubeTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        setNewTime(formatTime(ytTime));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readonly]);

  const [playingMarker, setPlayingMarker] = useState(null);
  const handleSeekMarker = (timestamp) => {
    setPlayingMarker(timestamp);
    if (onSeek && typeof onSeek === 'function') {
      onSeek(timestamp);
    }
  };

  const handlePauseMarker = () => {
    setPlayingMarker(null);
    if (onSeek && typeof onSeek === 'function') {
      onSeek(null, { pause: true });
    }
  };

  const handleEdit = (marker) => {
    setEditingId(marker.id || marker.time);
    setEditTime(formatTime(marker.time));
    setEditLabel(marker.label || '');
  };

  // Fill time input with current YouTube time (for add)
  const handleFillNewTimeFromYouTube = () => {
    if (typeof getCurrentYouTubeTime === 'function') {
      const ytTime = getCurrentYouTubeTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        setNewTime(formatTime(ytTime));
      }
    }
  };

  // Fill time input with current YouTube time (for edit)
  const handleFillEditTimeFromYouTube = () => {
    if (typeof getCurrentYouTubeTime === 'function') {
      const ytTime = getCurrentYouTubeTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        setEditTime(formatTime(ytTime));
      }
    }
  };

  const handleSaveEdit = () => {
    if (!onUpdate || readonly) return;
    const updatedMarkers = timeMarkers.map(m => {
      const markerId = m.id || m.time;
      if (markerId === editingId) {
        return {
          ...m,
          time: parseTime(editTime),
          label: editLabel
        };
      }
      return m;
    });
    onUpdate(updatedMarkers);
    setEditingId(null);
    setEditTime('');
    setEditLabel('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTime('');
    setEditLabel('');
  };

  const handleDelete = (marker) => {
    if (!onUpdate || readonly) return;
    const markerId = marker.id || marker.time;
    const updatedMarkers = timeMarkers.filter(m => (m.id || m.time) !== markerId);
    onUpdate(updatedMarkers);
  };

  const handleAddNew = () => {
    if (!onUpdate || readonly || !newTime) return;
    const newMarker = {
      time: parseTime(newTime),
      label: newLabel || `Marker ${formatTime(parseTime(newTime))}`
    };
    const updatedMarkers = [...timeMarkers, newMarker].sort((a, b) => a.time - b.time);
    onUpdate(updatedMarkers);
    setNewTime('');
    if (compactUI) {
      setShowAddForm(false);
    }
  };

  const sortedMarkers = [...timeMarkers].sort((a, b) => a.time - b.time);
  const isCompactReadonly = readonly;

  return (
    <div className={`time-markers ${compactUI ? 'time-markers-compact-ui' : ''}`}>
      <div className="time-markers-content">
        {duration > 0 && (
          <div className="time-markers-progress">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}

        {sortedMarkers.length > 0 && !compactUI && (
          <div className="time-markers-hint" aria-live="polite">
            <span className="time-markers-hint-desktop">Klik marker untuk seek. Double-click untuk pause.</span>
            <span className="time-markers-hint-mobile">Tap: seek | 2x tap: pause</span>
          </div>
        )}

        {!readonly && (
          <div className="time-marker-add">
            {compactUI && !showAddForm && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(true)}
                title="Tambah time marker"
              >
                + Marker
              </button>
            )}

            {(!compactUI || showAddForm) && (
              <>
                <div className="time-marker-add-row">
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="mm:ss"
                    className="time-marker-input"
                  />
                  <button
                    type="button"
                    title="Ambil waktu dari YouTube"
                    onClick={handleFillNewTimeFromYouTube}
                    className="btn btn-secondary"
                  >
                    ⏱️
                  </button>
                </div>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label"
                  className="time-marker-input"
                />
                <div className="time-marker-add-row">
                  <button
                    type="button"
                    onClick={handleAddNew}
                    disabled={!newTime}
                    className="btn"
                  >
                    Tambah Timestamp
                  </button>
                  {compactUI && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="btn btn-secondary"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {sortedMarkers.length > 0 ? (
          <div className={`time-markers-list ${isCompactReadonly ? 'time-markers-list-compact' : ''}`}>
            {sortedMarkers.map((marker, idx) => {
              const markerId = marker.id || marker.time;
              const isEditing = editingId === markerId;
              const defaultLabel = `Marker ${idx + 1}`;
              const markerLabel = marker.label || defaultLabel;
              const showLabel = !isCompactReadonly || markerLabel !== defaultLabel;

              if (isEditing) {
                return (
                  <div
                    key={markerId}
                    className="time-marker-item time-marker-item-editing"
                  >
                    <div className="time-marker-add-row">
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="mm:ss"
                        className="time-marker-input"
                      />
                      <button
                        type="button"
                        title="Ambil waktu dari YouTube"
                        onClick={handleFillEditTimeFromYouTube}
                        className="btn btn-secondary"
                      >
                        ⏱️
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label"
                      className="time-marker-input"
                    />
                    <div className="time-marker-edit-actions">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="btn"
                      >
                        ✓ Simpan
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="btn"
                      >
                        ✕ Batal
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={markerId}
                  className={`time-marker-item ${isCompactReadonly ? 'time-marker-item-readonly' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSeekMarker(marker.time)}
                    onDoubleClick={handlePauseMarker}
                    className="btn btn-secondary time-marker-play-btn"
                    aria-label={`Seek marker ${formatTime(marker.time)}. Double-click to pause.`}
                    title="Seek | Double-click pause"
                  >
                    {playingMarker === marker.time ? '⏸️' : '▶️'}
                  </button>
                  <div className="time-marker-time">
                    {formatTime(marker.time)}
                  </div>
                  {showLabel && (
                    <div className="time-marker-label">
                      {markerLabel}
                    </div>
                  )}
                  {!readonly && (
                    <div className="time-marker-actions">
                      <button
                        type="button"
                        onClick={() => handleEdit(marker)}
                        className="btn btn-secondary"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(marker)}
                        className="btn btn-red"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="time-marker-empty">
            Belum ada timestamp
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   3. SongMediaPanel — panel shared yang merangkai keduanya
   ========================================================================= */

export default function SongMediaPanel({
  youtubeId,
  youtubeRef,
  timeMarkers = [],
  secondsToLabel,
  isPlaying,
  onTogglePlay,
  onSeek,
  onUpdateMarkers,
  currentTime,
  duration,
  getCurrentYouTubeTime,
  onTimeUpdate,
  /** Tampilkan seksi "Kontrol Time Marker" (default: hanya bila onUpdateMarkers diberikan). */
  showMarkers,
  /** Marker read-only (halaman performa seperti setlist) — TimeMarkers readonly. */
  readonlyMarkers = false,
  /** Sembunyikan judul panel (mis. mini player yang sudah punya header sendiri). */
  showHeader = true,
  /** Label panel; default "Video & Time Marker". */
  title = '🎬 Video & Time Marker',
  /** Varian tata letak: 'card' (default), 'inline' (dalam kartu lain), 'floating' (mini player). */
  variant = 'card',
  /** Rasio video: '16/9' (default) atau '9/16' (video potret). */
  aspectRatio = '16/9',
  /** Elemen tambahan di atas daftar marker (mis. tombol "Marker Otomatis"). */
  markerExtra = null,
  /** Elemen tambahan di header (mis. tombol prev/next lagu di setlist). */
  extraControls = null,
  /** Lewati empty state internal (mis. pemakai sudah menampilkan pesannya sendiri). */
  hideEmptyState = false,
  /** Passthrough ke YouTubeViewer (mis. mode sequential video di setlist). */
  onStateChange,
  autoPlay = false,
}) {
  const format = typeof secondsToLabel === 'function' ? secondsToLabel : (v) => String(v);
  const showMarkerSection =
    showMarkers !== undefined ? showMarkers : typeof onUpdateMarkers === 'function';

  const aspectStyle =
    aspectRatio === '9/16'
      ? { aspectRatio: '9 / 16', maxWidth: '100%', margin: '0 auto' }
      : undefined;

  return (
    <div className={`smp smp--${variant}`}>
      {showHeader && (
        <div className="smp-header">
          <span className="smp-title">{title}</span>
          {extraControls && <div className="smp-extra-controls">{extraControls}</div>}
        </div>
      )}

      {youtubeId ? (
        <>
          <div className="smp-video" style={aspectStyle}>
            <YouTubeViewer
              videoId={youtubeId}
              ref={youtubeRef}
              onTimeUpdate={onTimeUpdate}
              onStateChange={onStateChange}
              autoPlay={autoPlay}
            />
          </div>

          <div className="smp-controls" role="group" aria-label="Kontrol playback video">
            <button
              type="button"
              className="btn btn-secondary smp-btn"
              onClick={() => onTogglePlay?.()}
              title={isPlaying ? 'Jeda video' : 'Putar video'}
              aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              className="btn btn-secondary smp-btn"
              onClick={() => youtubeRef.current?.handleSeek?.(0)}
              title="Putar dari awal"
              aria-label="Putar dari awal"
            >
              ⏮
            </button>
            <button
              type="button"
              className="btn btn-secondary smp-btn"
              onClick={() => {
                // Seek relatif: hitung dari posisi live player (bukan state
                // currentTime yang bisa stale → lompat ke 0 / 5 detik awal).
                youtubeRef.current?.handleSeekOffset?.(-5);
              }}
              title="Mundur 5 detik"
              aria-label="Mundur 5 detik"
            >
              «5s
            </button>
            <button
              type="button"
              className="btn btn-secondary smp-btn"
              onClick={() => {
                youtubeRef.current?.handleSeekOffset?.(5);
              }}
              title="Maju 5 detik"
              aria-label="Maju 5 detik"
            >
              5s»
            </button>
            <span className="smp-time" title="Posisi video saat ini">
              {format(Math.floor(currentTime || 0))}
              {duration > 0 ? ` / ${format(Math.floor(duration))}` : ''}
            </span>
          </div>
        </>
      ) : (
        !hideEmptyState && (
          <div className="smp-empty">
            Belum ada video referensi. Isi <b>YouTube URL atau ID</b> di bagian Informasi untuk
            memuat player dan penanda waktu di sini.
          </div>
        )
      )}

      {showMarkerSection && (
        <div className="smp-markers">
          <span className="smp-markers-subtitle">Kontrol Time Marker</span>
          {markerExtra}
          <TimeMarkers
            timeMarkers={timeMarkers}
            onSeek={onSeek}
            currentTime={currentTime}
            duration={duration}
            onUpdate={readonlyMarkers ? undefined : onUpdateMarkers}
            readonly={readonlyMarkers}
            getCurrentYouTubeTime={getCurrentYouTubeTime}
            compactUI
          />
        </div>
      )}
    </div>
  );
}
