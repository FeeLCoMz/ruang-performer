import React, { useState, useEffect } from 'react';
import { StudioMediaColumn, StudioMediaLayout } from './SongStudioLayout.jsx';
import { extractSectionOverview } from '../utils/songFormUtils.js';

/**
 * SongChordsMediaPanel
 *
 * Konten tab Media di halaman song view. Sengaja memakai komponen yang sama
 * dengan halaman song add/edit (StudioMediaColumn) — video dan kontrol play —
 * supaya tampilan dan perilakunya identik di kedua halaman.
 *
 * Layout layar lebar: video + kontrol di kiri, daftar time marker di kanan
 * (StudioMediaLayout). Termasuk tombol "Marker Otomatis" yang membuat satu
 * time marker per seksi lagu ([Intro], [Chorus], dst) — waktu diambil dari
 * timestamp yang sudah tertulis di baris seksi lirik bila ada.
 */
export default function SongChordsMediaPanel({
  youtubeId,
  youtubeRef,
  timeMarkers,
  canEdit,
  handleTimeMarkerUpdate,
  song = null,
}) {
  const hasYouTube = Boolean(youtubeId);
  // Posisi & durasi video dilacak di sini agar time marker & label waktu akurat.
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mirror state play/pause dari player live (poll via handle ekspos) supaya
  // tombol pause selalu mencerminkan kondisi nyata — bukan toggle lokal yang
  // bisa drift saat video dijeda dari kontrol YouTube sendiri.
  useEffect(() => {
    if (!hasYouTube) return undefined;
    const intervalId = setInterval(() => {
      const state = youtubeRef.current?.getPlayerState?.();
      if (typeof state === 'number') setIsPlaying(state === 1);
    }, 500);
    return () => clearInterval(intervalId);
  }, [hasYouTube, youtubeRef]);

  // Seksi lagu untuk tombol marker otomatis.
  const sections = React.useMemo(
    () => extractSectionOverview(song?.lyrics || ''),
    [song?.lyrics]
  );

  /**
   * Buat marker otomatis dari seksi lagu. Waktu tiap seksi diambil dari
   * timestamp [mm:ss] yang menempel pada baris seksi di lirik (jika ada);
   * seksi tanpa timestamp dilewati agar marker tetap akurat.
   */
  const handleAddAutoMarkers = () => {
    if (!canEdit || typeof handleTimeMarkerUpdate !== 'function') return;

    const lyricLines = String(song?.lyrics || '').split(/\r?\n/);
    const nextMarkers = [...timeMarkers];

    sections.forEach((section, index) => {
      const lineText = lyricLines[section.lineIndex] || '';
      const tsMatch = lineText.match(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
      if (!tsMatch) return;
      const time = tsMatch[3]
        ? Number(tsMatch[1]) * 3600 + Number(tsMatch[2]) * 60 + Number(tsMatch[3])
        : Number(tsMatch[1]) * 60 + Number(tsMatch[2]);

      // Jangan duplikat: lewati bila sudah ada marker pada detik yang sama.
      if (nextMarkers.some((m) => Number(m.time) === time)) return;

      nextMarkers.push({ time, label: section.label || `Section ${index + 1}` });
    });

    nextMarkers.sort((a, b) => a.time - b.time);
    handleTimeMarkerUpdate(nextMarkers);
  };

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
      <StudioMediaLayout
        timeMarkers={timeMarkers}
        onSeek={(time) => youtubeRef.current?.handleSeek?.(time)}
        currentTime={ytCurrentTime}
        duration={ytDuration}
        onUpdateMarkers={canEdit ? handleTimeMarkerUpdate : undefined}
        getCurrentYouTubeTime={() =>
          typeof youtubeRef.current?.currentTime === 'number' ? youtubeRef.current.currentTime : 0
        }
        sections={sections}
        onAddAutoMarkers={handleAddAutoMarkers}
        autoMarkersDisabled={!canEdit || sections.length === 0}
      >
        <StudioMediaColumn
          youtubeId={youtubeId}
          youtubeRef={youtubeRef}
          isPlaying={isPlaying}
          onTogglePlay={() => {
            youtubeRef.current?.handleTogglePlayPause?.();
            // State tidak di-toggle di sini: poll interval (atas) akan menyelaraskan
            // isPlaying dengan kondisi player asli dalam ≤500ms.
          }}
          onSeek={(time) => youtubeRef.current?.handleSeek?.(time)}
          currentTime={ytCurrentTime}
          duration={ytDuration}
          getCurrentYouTubeTime={() =>
            typeof youtubeRef.current?.currentTime === 'number' ? youtubeRef.current.currentTime : 0
          }
          onTimeUpdate={(t, d) => {
            // Pelacak posisi pemutaran agar tombol «5s / 5s» dan label waktu
            // menghitung dari posisi yang benar, bukan selalu dari 0.
            if (typeof t === 'number' && Number.isFinite(t)) setYtCurrentTime(t);
            if (typeof d === 'number' && Number.isFinite(d)) setYtDuration(d);
          }}
        />
      </StudioMediaLayout>
    </div>
  );
}
