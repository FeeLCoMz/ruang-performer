import React, { useEffect, useRef, useState } from 'react';
import YouTubeViewer from './YouTubeViewer.jsx';
import TimeMarkers from './TimeMarkers.jsx';

export default function FloatingYouTubePlayer({
  isOpen,
  videoId,
  youtubeRef,
  title = 'Mini Video',
  onTimeUpdate,
  timeMarkers = [],
  readonlyTimeMarkers = true,
  onUpdateTimeMarkers,
  onClose,
}) {
  const panelRef = useRef(null);
  const dragStateRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const [markersExpanded, setMarkersExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const width = 360;
    const height = 246;
    const x = Math.max(12, window.innerWidth - width - 16);
    const y = Math.max(80, window.innerHeight - height - 24);
    setPosition({ x, y });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMarkersExpanded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!panelRef.current || !isOpen) return;
    panelRef.current.style.left = `${position.x}px`;
    panelRef.current.style.top = `${position.y}px`;
  }, [position, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMove = (clientX, clientY) => {
      if (!dragStateRef.current.active) return;
      const panelWidth = panelRef.current?.offsetWidth || 360;
      const panelHeight = panelRef.current?.offsetHeight || 246;
      const nextX = Math.min(
        Math.max(8, clientX - dragStateRef.current.offsetX),
        Math.max(8, window.innerWidth - panelWidth - 8)
      );
      const nextY = Math.min(
        Math.max(8, clientY - dragStateRef.current.offsetY),
        Math.max(8, window.innerHeight - panelHeight - 8)
      );
      setPosition({ x: nextX, y: nextY });
    };

    const onMouseMove = (event) => {
      handleMove(event.clientX, event.clientY);
    };
    const onMouseUp = () => {
      dragStateRef.current.active = false;
    };
    const onTouchMove = (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      handleMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => {
      dragStateRef.current.active = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isOpen]);

  if (!isOpen || !videoId) return null;

  const hasMarkers = Array.isArray(timeMarkers) && timeMarkers.length > 0;

  return (
    <div className="floating-youtube-player" ref={panelRef}>
      <div
        className="floating-youtube-player-header"
        onMouseDown={(event) => {
          dragStateRef.current.active = true;
          const rect = panelRef.current?.getBoundingClientRect();
          dragStateRef.current.offsetX = event.clientX - (rect?.left || 0);
          dragStateRef.current.offsetY = event.clientY - (rect?.top || 0);
        }}
        onTouchStart={(event) => {
          const touch = event.touches?.[0];
          if (!touch) return;
          dragStateRef.current.active = true;
          const rect = panelRef.current?.getBoundingClientRect();
          dragStateRef.current.offsetX = touch.clientX - (rect?.left || 0);
          dragStateRef.current.offsetY = touch.clientY - (rect?.top || 0);
        }}
      >
        <span className="floating-youtube-player-title">{title}</span>
        <button
          type="button"
          className="btn btn-secondary floating-youtube-player-close"
          aria-label="Tutup mini player"
          title="Tutup mini player"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="floating-youtube-player-body">
        <YouTubeViewer
          ref={youtubeRef}
          videoId={videoId}
          onTimeUpdate={(time, duration) => {
            setYtCurrentTime(time || 0);
            if (typeof duration === 'number') {
              setYtDuration(duration);
            }
            if (typeof onTimeUpdate === 'function') {
              onTimeUpdate(time, duration);
            }
          }}
        />

        <div className="floating-youtube-player-markers">
          <button
            type="button"
            className="btn btn-secondary floating-youtube-player-markers-toggle"
            onClick={() => setMarkersExpanded((prev) => !prev)}
            aria-expanded={markersExpanded}
            title={markersExpanded ? 'Sembunyikan time markers' : 'Tampilkan time markers'}
          >
            <span aria-hidden="true">{markersExpanded ? '▼' : '▶'}</span>
            <span>
              Time Markers {hasMarkers ? `(${timeMarkers.length})` : '(0)'}
            </span>
          </button>

          {markersExpanded && (
            <div className="floating-youtube-player-markers-content">
              <TimeMarkers
                timeMarkers={timeMarkers}
                readonly={readonlyTimeMarkers}
                currentTime={ytCurrentTime}
                duration={ytDuration}
                onUpdate={onUpdateTimeMarkers}
                onSeek={(time, opts) => {
                  if (opts?.pause) {
                    if (youtubeRef?.current && typeof youtubeRef.current.handlePause === 'function') {
                      youtubeRef.current.handlePause();
                    }
                    return;
                  }

                  if (typeof time === 'number' && youtubeRef?.current && typeof youtubeRef.current.handleSeek === 'function') {
                    youtubeRef.current.handleSeek(time);
                  }

                  if (youtubeRef?.current && typeof youtubeRef.current.handlePlay === 'function') {
                    youtubeRef.current.handlePlay();
                  }
                }}
                getCurrentYouTubeTime={() => {
                  if (youtubeRef?.current && typeof youtubeRef.current.currentTime === 'number') {
                    return youtubeRef.current.currentTime;
                  }
                  return 0;
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
