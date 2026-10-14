import React, { useState } from 'react';
import { StudioMediaColumn } from './SongStudioLayout.jsx';

/**
 * SongChordsMediaPanel
 *
 * Konten tab Media di halaman song view. Sengaja memakai komponen yang sama
 * dengan halaman song add/edit (StudioMediaColumn) — video, kontrol play,
 * dan time markers — supaya tampilan dan perilakunya identik di kedua halaman.
 */
export default function SongChordsMediaPanel({
  youtubeId,
  youtubeRef,
  timeMarkers,
  canEdit,
  handleTimeMarkerUpdate,
}) {
  const hasYouTube = Boolean(youtubeId);
  // Posisi & durasi video dilacak di sini agar time marker & label waktu akurat.
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!hasYouTube) {
    return (
      <div className="song-panel media-panel">
        <div className="media-empty-state">
          <span className="media-empty-icon">📹</span>
          <p className="media-empty-text">Tidak ada video YouTube</p>
          <p className="media-empty-hint">Tambahkan YouTube URL di edit song</p>
        </div>
      </div>
    );
  }

  return (
    <div className="song-panel media-panel">
      <StudioMediaColumn
        youtubeId={youtubeId}
        youtubeRef={youtubeRef}
        timeMarkers={timeMarkers}
        isPlaying={isPlaying}
        onTogglePlay={() => {
          if (youtubeRef.current && typeof youtubeRef.current.handleTogglePlayPause === 'function') {
            youtubeRef.current.handleTogglePlayPause();
          }
          setIsPlaying((prev) => !prev);
        }}
        onSeek={(time) => youtubeRef.current?.handleSeek?.(time)}
        onUpdateMarkers={canEdit ? handleTimeMarkerUpdate : undefined}
        currentTime={ytCurrentTime}
        duration={ytDuration}
        getCurrentYouTubeTime={() =>
          typeof youtubeRef.current?.currentTime === 'number' ? youtubeRef.current.currentTime : 0
        }
      />
    </div>
  );
}
