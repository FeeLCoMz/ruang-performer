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
 * aturan CSS yang sama (kelas `smp-*` di src/styles/media-panel-smp.css).
 *
 * `onUpdateMarkers` tidak diberikan → seksi marker disembunyikan, kecuali
 * dipaksa via `showMarkers`.
 */

/* ======== YouTubeViewer — embed player YouTube ======== */

const extractVideoId = (input) => {
  if (!input) return '';
  const urlMatch = String(input).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:.*v=|v\/|embed\/|shorts\/|live\/|user\/.*#p\/u\/\d\/))([\w-]{11})/);
  return urlMatch?.[1] || (/^[\w-]{11}$/.test(input) ? input : '');
};

export const YouTubeViewer = React.forwardRef(({ videoId, onTimeUpdate, onStateChange, autoPlay = false }, ref) => {
  const [player, setPlayer] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const containerIdRef = useRef(`youtube-player-${Math.random().toString(36).slice(2, 9)}`);
  const mountedRef = useRef(false);
  // Player disimpan juga di ref agar aksi seek/pause dari imperative handle
  // tidak pernah memakai closure yang telat (state `player` bisa stale).
  const playerRef = useRef(null);

  const getLiveTime = () => {
    try {
      const t = Number(playerRef.current?.getCurrentTime());
      return Number.isFinite(t) && t > 0 ? t : null;
    } catch {
      return null;
    }
  };

  const doSeek = (time) => {
    try {
      playerRef.current?.seekTo(Math.max(0, time), true);
      playerRef.current?.playVideo();
    } catch { /* ignore */ }
  };

  React.useImperativeHandle(ref, () => ({
    currentTime,
    handlePlay: () => playerRef.current?.playVideo?.(),
    handlePause: () => playerRef.current?.pauseVideo?.(),
    handleTogglePlayPause: () => {
      const p = playerRef.current;
      if (typeof p?.getPlayerState !== 'function') return;
      // state: 1 = PLAYING, 2 = PAUSED, 0/5 = ended/not started
      try { p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo(); } catch { /* ignore */ }
    },
    getPlayerState: () => {
      const state = playerRef.current?.getPlayerState?.();
      return typeof state === 'number' ? state : -1;
    },
    handleSeek: doSeek,
    /** Seek relatif dari posisi live player: ±delta detik. Anti-stale. */
    handleSeekOffset: (deltaSeconds) => {
      const base = getLiveTime() != null ? getLiveTime() : Number(currentTime) || 0;
      doSeek(base + Number(deltaSeconds));
    },
  }), [currentTime]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Inisialisasi player: pastikan iframe API termuat lalu buat player di div
  // container. Player lama dihancurkan saat videoId berubah / unmount.
  useEffect(() => {
    const id = extractVideoId(videoId);
    if (!id) return undefined;

    let canceled = false;
    let prevOnReady = null;

    const initPlayer = () => {
      if (!window.YT?.Player || !mountedRef.current) return;
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      new window.YT.Player(containerIdRef.current, {
        videoId: id,
        playerVars: { autoplay: autoPlay ? 1 : 0, controls: 1, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: (event) => {
            setPlayer(event.target);
            playerRef.current = event.target;
            if (autoPlay) event.target.playVideo?.();
          },
          onStateChange: (event) => onStateChange?.(event),
        },
      });
    };

    const ensureApiAndInit = () => {
      if (window.YT?.Player) {
        initPlayer();
        return;
      }
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
      prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevOnReady?.();
        if (!canceled) initPlayer();
      };
    };

    ensureApiAndInit();

    return () => {
      canceled = true;
      if (window.onYouTubeIframeAPIReady && prevOnReady) {
        window.onYouTubeIframeAPIReady = prevOnReady;
      }
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      if (mountedRef.current) setPlayer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Poll posisi pemutaran tiap 200ms saat player siap.
  useEffect(() => {
    if (!player) return undefined;
    const interval = setInterval(() => {
      try {
        const t = Number(playerRef.current?.getCurrentTime()) || 0;
        setCurrentTime(Number.isFinite(t) ? t : 0);
        onTimeUpdate?.(Number.isFinite(t) ? t : 0, Number(playerRef.current?.getDuration()) || 0);
      } catch { /* ignore */ }
    }, 200);
    return () => clearInterval(interval);
  }, [player]);

  if (!extractVideoId(videoId)) {
    return <div className="youtube-viewer-empty">ID Video YouTube tidak valid</div>;
  }

  return (
    <div className="youtube-viewer">
      <div className="youtube-viewer-container">
        <div id={containerIdRef.current} className="youtube-iframe"></div>
      </div>
    </div>
  );
});

/* ======== TimeMarkers — daftar time marker ======== */

const formatTime = (seconds) => {
  const sec = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

const parseTime = (timeStr) => {
  const parts = String(timeStr || '').split(':').map((p) => parseInt(p) || 0);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parseInt(timeStr) || 0;
};

export function TimeMarkers({
  timeMarkers = [],
  onSeek,
  currentTime = 0,
  duration = 0,
  readonly = false,
  onUpdate,
  getCurrentYouTubeTime,
  compactUI = false,
}) {
  // Form aktif: null = tertutup, 'new' = tambah, atau id marker yang diedit.
  // Satu state untuk semuanya — tidak perlu editingId + showAddForm terpisah.
  const [activeForm, setActiveForm] = useState(compactUI && !readonly ? null : 'new');
  const [formTime, setFormTime] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [playingMarker, setPlayingMarker] = useState(null);

  const markerId = (marker) => marker.id || marker.time;

  /** Ambil posisi YouTube saat ini dalam format mm:ss (atau ''). */
  const liveTime = () => {
    const t = getCurrentYouTubeTime?.();
    return typeof t === 'number' && !isNaN(t) ? formatTime(t) : '';
  };

  /** Buka form ('new' atau edit marker) dengan waktu awal dari posisi YouTube. */
  const openForm = (id) => {
    const marker = timeMarkers.find((m) => markerId(m) === id);
    setFormTime(marker ? formatTime(marker.time) : liveTime());
    setFormLabel(marker?.label || '');
    setActiveForm(id || 'new');
  };

  const closeForm = () => setActiveForm(null);

  const handleSubmit = () => {
    if (!onUpdate || readonly || !formTime) return;
    const entry = { time: parseTime(formTime), label: formLabel || `Marker ${formatTime(parseTime(formTime))}` };
    if (activeForm === 'new') {
      onUpdate([...timeMarkers, entry].sort((a, b) => a.time - b.time));
    } else {
      onUpdate(timeMarkers.map((m) => (markerId(m) === activeForm ? { ...m, ...entry } : m)));
    }
    setActiveForm(null);
  };

  const handleDelete = (marker) => {
    if (!onUpdate || readonly) return;
    onUpdate(timeMarkers.filter((m) => markerId(m) !== markerId(marker)).sort((a, b) => a.time - b.time));
  };

  const sortedMarkers = [...timeMarkers].sort((a, b) => a.time - b.time);

  /** Form waktu + label bersama untuk add & edit (bedanya cuma nilai awal). */
  const markerForm = () => (
    <>
      <div className="time-marker-add-row">
        <input type="text" value={formTime} onChange={(e) => setFormTime(e.target.value)} placeholder="mm:ss" className="time-marker-input" />
        <button type="button" title="Ambil waktu dari YouTube" onClick={() => setFormTime(liveTime())} className="btn btn-secondary">⏱️</button>
      </div>
      <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="Label" className="time-marker-input" />
    </>
  );

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
            {activeForm === null ? (
              <button type="button" className="btn btn-secondary" onClick={() => openForm('new')} title="Tambah time marker">
                + Marker
              </button>
            ) : (
              <>
                {markerForm()}
                <div className="time-marker-add-row">
                  <button type="button" onClick={handleSubmit} disabled={!formTime} className="btn">Tambah Timestamp</button>
                  {compactUI && (
                    <button type="button" onClick={closeForm} className="btn btn-secondary">Batal</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {sortedMarkers.length > 0 ? (
          <div className="time-markers-list">
            {sortedMarkers.map((marker, idx) => {
              const id = markerId(marker);

              if (activeForm === id) {
                return (
                  <div key={id} className="time-marker-item time-marker-item-editing">
                    {markerForm()}
                    <div className="time-marker-edit-actions">
                      <button type="button" onClick={handleSubmit} className="btn">✓ Simpan</button>
                      <button type="button" onClick={closeForm} className="btn">✕ Batal</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={id} className="time-marker-item">
                  <button
                    type="button"
                    onClick={() => { setPlayingMarker(marker.time); onSeek?.(marker.time); }}
                    onDoubleClick={() => { setPlayingMarker(null); onSeek?.(null, { pause: true }); }}
                    className="btn btn-secondary time-marker-play-btn"
                    aria-label={`Seek marker ${formatTime(marker.time)}. Double-click to pause.`}
                    title="Seek | Double-click pause"
                  >
                    {playingMarker === marker.time ? '⏸️' : '▶️'}
                  </button>
                  <div className="time-marker-time">{formatTime(marker.time)}</div>
                  {(!readonly || marker.label) && (
                    <div className="time-marker-label">{marker.label || `Marker ${idx + 1}`}</div>
                  )}
                  {!readonly && (
                    <div className="time-marker-actions">
                      <button type="button" onClick={() => openForm(id)} className="btn btn-secondary">✏️</button>
                      <button type="button" onClick={() => handleDelete(marker)} className="btn btn-red">🗑️</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="time-marker-empty">Belum ada timestamp</div>
        )}
      </div>
    </div>
  );
}

/* ======== SongMediaPanel — panel shared yang merangkai keduanya ======== */

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
  showMarkers,
  readonlyMarkers = false,
  showHeader = true,
  title = '🎬 Video & Time Marker',
  variant = 'card',
  aspectRatio = '16/9',
  markerExtra = null,
  extraControls = null,
  hideEmptyState = false,
  onStateChange,
  autoPlay = false,
}) {
  const format = typeof secondsToLabel === 'function' ? secondsToLabel : (v) => String(v);
  const showMarkerSection =
    showMarkers !== undefined ? showMarkers : typeof onUpdateMarkers === 'function';

  // Kontrol playback: play/pause, dari awal, ±5 detik (seek relatif dari posisi
  // live player agar tidak stale).
  const controls = [
    { key: 'play', icon: isPlaying ? '⏸' : '▶', label: isPlaying ? 'Jeda video' : 'Putar video', onClick: onTogglePlay },
    { key: 'restart', icon: '⏮', label: 'Putar dari awal', onClick: () => youtubeRef.current?.handleSeek?.(0) },
    { key: 'back', icon: '«5s', label: 'Mundur 5 detik', onClick: () => youtubeRef.current?.handleSeekOffset?.(-5) },
    { key: 'fwd', icon: '5s»', label: 'Maju 5 detik', onClick: () => youtubeRef.current?.handleSeekOffset?.(5) },
  ];

  return (
    // Layout container-query: CSS memutuskan 1 kolom (kontainer sempit) atau
    // 2 kolom — video+kontrol kiri, Time Marker kanan (kontainer >= 768px).
    // .smp-layout-wrap adalah CONTAINER (container-type); @container di CSS
    // menanyakan elemen ini. .smp-layout (grid) di dalamnya yang di-query —
    // container query tidak bisa menanyakan kontainernya sendiri, makanya
    // keduanya harus elemen terpisah.
    <div className="smp-layout-wrap">
      <div className="smp-layout">
        <div className={`smp smp--${variant}`}>
          {showHeader && (
            <div className="smp-header">
              <span className="smp-title">{title}</span>
              {extraControls && <div className="smp-extra-controls">{extraControls}</div>}
            </div>
          )}

          {youtubeId ? (
            <>
              <div className="smp-video" style={aspectRatio === '9/16' ? { aspectRatio: '9 / 16', maxWidth: '100%', margin: '0 auto' } : undefined}>
                <YouTubeViewer
                  videoId={youtubeId}
                  ref={youtubeRef}
                  onTimeUpdate={onTimeUpdate}
                  onStateChange={onStateChange}
                  autoPlay={autoPlay}
                />
              </div>

              <div className="smp-controls" role="group" aria-label="Kontrol playback video">
                {controls.map(({ key, icon, label, onClick }) => (
                  <button key={key} type="button" className="btn btn-secondary smp-btn" onClick={onClick} title={label} aria-label={label}>
                    {icon}
                  </button>
                ))}
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
        </div>

      {showMarkerSection && (
        <div className="smp-side smp-markers">
          <span className="smp-markers-subtitle">Time Marker</span>
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
    </div>
  );
}
