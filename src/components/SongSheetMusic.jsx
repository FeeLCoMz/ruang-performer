import React, { useEffect, useRef, useState } from 'react';

/**
 * Komponen SongSheetMusic
 * Menampilkan partitur lagu dari field sheet_music_xml (MusicXML)
 *
 * OpenSheetMusicDisplay (OSMD) dimuat secara lazy (dynamic import) karena
 * library ini cukup berat dan tidak selalu dibutuhkan di perangkat mobile.
 *
 * Props:
 *   - sheetMusicXml: string (isi MusicXML)
 *   - width: number (opsional)
 */
export default function SongSheetMusic({ sheetMusicXml, width = 700 }) {
  const containerRef = useRef(null);
  const osmdRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!sheetMusicXml || !containerRef.current) return;

    let cancelled = false;

    const renderSheet = async () => {
      try {
        if (!osmdRef.current) {
          // Lazy-load OSMD hanya saat partitur benar-benar ditampilkan
          const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
          if (cancelled || !containerRef.current) return;
          osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
            autoResize: true,
            drawingParameters: 'default',
            backend: 'svg',
          });
        }
        if (cancelled) return;
        await osmdRef.current.load(sheetMusicXml);
        if (cancelled) return;
        osmdRef.current.render();
        setLoadError(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Gagal memuat partitur (OSMD):', err);
        setLoadError(true);
      }
    };

    renderSheet();

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (osmdRef.current) {
        osmdRef.current.clear();
      }
    };
  }, [sheetMusicXml]);

  return (
    <div className="sheet-music-container card" style={{ maxWidth: width, margin: '0 auto' }}>
      {loadError && (
        <p className="sheet-music-error" role="alert">
          Gagal memuat partitur. Coba muat ulang halaman.
        </p>
      )}
      <div ref={containerRef} />
    </div>
  );
}
