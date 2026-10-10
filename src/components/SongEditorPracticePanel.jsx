import React, { useEffect, useState } from "react";
import YouTubeViewer from "./YouTubeViewer.jsx";

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
}) {
  const [liveTime, setLiveTime] = useState(currentTime);

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
