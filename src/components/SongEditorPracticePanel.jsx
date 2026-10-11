import React, { useEffect, useRef, useState } from "react";
import YouTubeViewer from "./YouTubeViewer.jsx";

const VIDEO_HEIGHT_STORAGE_KEY = 'ruangperformer_practice_video_height_v1';
const DETACHED_STORAGE_KEY = 'ruangperformer_practice_video_detached_v1';

/** Height presets, in px. The video keeps a 16:9 box, so height drives width. */
export const VIDEO_SIZE_PRESETS = [
  { key: 'small', label: 'Kecil', height: 150 },
  { key: 'medium', label: 'Sedang', height: 210 },
  { key: 'large', label: 'Besar', height: 290 },
];;

const MIN_VIDEO_HEIGHT = 110;
const MAX_VIDEO_HEIGHT = 480;

const clampHeight = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return VIDEO_SIZE_PRESETS[1].height;
  return Math.min(MAX_VIDEO_HEIGHT, Math.max(MIN_VIDEO_HEIGHT, Math.round(numeric)));
};

const readStoredHeight = () => {
  if (typeof window === 'undefined') return VIDEO_SIZE_PRESETS[1].height;
  try {
    return clampHeight(window.localStorage.getItem(VIDEO_HEIGHT_STORAGE_KEY));
  } catch {
    return VIDEO_SIZE_PRESETS[1].height;
  }
};

const readStoredDetached = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DETACHED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * SongEditorPracticePanel
 *
 * A sticky "practice" panel for the song editor sidebar: the reference video
 * plus its time markers, so you can listen and scrub while the lyrics editor
 * stays in view. Previously both lived in collapsed sections far below the
 * editor, which meant scrolling away from the lyrics to reach them.
 *
 * The panel shares the parent's `youtubeRef`, so it drives the same player as
 * the rest of the editor instead of creating a second one.
 *
 * The video can be resized two ways, because neither alone covers how people
 * actually work here:
 *   - a drag handle at the bottom edge, for fine control;
 *   - size presets, because the sidebar is only 300px wide and a drag that
 *     precise is fiddly on a trackpad.
 * The chosen height is remembered between sessions.
 */
export default function SongEditorPracticePanel({
  youtubeId,
  youtubeRef,
  timeMarkers = [],
  onSeek,
  secondsToLabel,
  /** Playback state is owned by the parent so the lyrics preview can share it. */
  isPlaying = false,
  onTogglePlay,
  currentTime = 0,
  /** Rendered instead of the inline video when the user detaches the player. */
  detachedPlayer = null,
}) {
  const [liveTime, setLiveTime] = useState(currentTime);
  const [videoHeight, setVideoHeight] = useState(readStoredHeight);
  const [isDetached, setIsDetached] = useState(readStoredDetached);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef({ active: false, startY: 0, startHeight: 0 });
  const videoBoxRef = useRef(null);

  // Poll the player so the progress label and marker highlighting stay live
  // without needing an extra callback from the YouTube API.
  useEffect(() => {
    if (!youtubeId || !youtubeRef?.current) return undefined;

    const interval = setInterval(() => {
      const player = youtubeRef.current;
      if (!player) return;
      if (typeof player.currentTime === 'number') {
        setLiveTime(player.currentTime);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [youtubeId, youtubeRef]);

  useEffect(() => {
    if (typeof currentTime === 'number' && currentTime > 0) {
      setLiveTime(currentTime);
    }
  }, [currentTime]);

  // Remember the chosen size and detach state between sessions.
  useEffect(() => {
    try {
      window.localStorage.setItem(VIDEO_HEIGHT_STORAGE_KEY, String(videoHeight));
    } catch {
      // Storage can fail in private mode; the size still applies this session.
    }
  }, [videoHeight]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DETACHED_STORAGE_KEY, String(isDetached));
    } catch {
      // Ignore.
    }
  }, [isDetached]);

  // Drag-to-resize. Listeners live on window so the pointer can leave the small
  // 6px handle without the drag dying mid-gesture.
  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMove = (clientY) => {
      const state = resizeStateRef.current;
      if (!state.active) return;
      setVideoHeight(clampHeight(state.startHeight + (clientY - state.startY)));
    };

    const onMouseMove = (event) => handleMove(event.clientY);
    const onTouchMove = (event) => {
      const touch = event.touches?.[0];
      if (touch) handleMove(touch.clientY);
    };
    const stop = () => {
      resizeStateRef.current.active = false;
      setIsResizing(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', stop);
    window.addEventListener('touchcancel', stop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stop);
      window.removeEventListener('touchcancel', stop);
    };
  }, [isResizing]);

  const startResize = (clientY) => {
    resizeStateRef.current = {
      active: true,
      startY: clientY,
      startHeight: videoBoxRef.current?.offsetHeight || videoHeight,
    };
    setIsResizing(true);
  };

  if (!youtubeId) return null;

  const format = typeof secondsToLabel === 'function' ? secondsToLabel : (v) => String(v);

  return (
    <div className="song-editor-sidebar-card song-practice-panel">
      <div className="song-completeness-head">
        <span className="song-completeness-title">🎧 Latihan</span>
        <span className={`song-practice-state${isPlaying ? ' is-playing' : ''}`}>
          {isPlaying ? '▶ Berjalan' : '⏸ Berhenti'}
        </span>
      </div>

      <div className="song-practice-video">
        {/* The single video player for the editor. The lyrics preview and the
            timestamp buttons all drive this one instance through youtubeRef. */}
        <YouTubeViewer
          videoId={youtubeId}
          ref={youtubeRef}
          onTimeUpdate={(t) => {
            if (typeof t === 'number') setLiveTime(t);
          }}
        />
      </div>

      <div className="song-practice-controls">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onTogglePlay?.()}
          title={isPlaying ? 'Jeda video' : 'Putar video'}
          aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => youtubeRef.current?.handleSeek?.(0)}
          title="Putar dari awal"
          aria-label="Putar dari awal"
        >
          ⏮
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => youtubeRef.current?.handleSeek?.(Math.max(0, liveTime - 5))}
          title="Mundur 5 detik"
          aria-label="Mundur 5 detik"
        >
          «5s
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => youtubeRef.current?.handleSeek?.(liveTime + 5)}
          title="Maju 5 detik"
          aria-label="Maju 5 detik"
        >
          5s»
        </button>
        <span className="song-practice-time" title="Posisi video saat ini">
          {format(Math.floor(liveTime))}
        </span>
      </div>

      {timeMarkers.length > 0 && (
        <div className="song-practice-markers">
          <span className="song-practice-markers-title">
            Penanda ({timeMarkers.length})
          </span>
          <ul className="song-practice-marker-list">
            {timeMarkers.map((marker, index) => {
              const isNear = Math.abs((Number(marker.time) || 0) - liveTime) < 2;
              return (
                <li key={marker.time ?? index}>
                  <button
                    type="button"
                    className={`song-practice-marker${isNear ? ' is-current' : ''}`}
                    onClick={() => onSeek ? onSeek(marker.time) : youtubeRef.current?.handleSeek?.(marker.time)}
                    title={`Lompat ke ${format(marker.time)}`}
                  >
                    <code>{format(marker.time)}</code>
                    <span>{marker.label || 'Tanpa label'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}


    </div>
  );
}
