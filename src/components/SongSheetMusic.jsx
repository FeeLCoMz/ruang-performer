import React, { useEffect, useRef } from 'react';
// OpenSheetMusicDisplay is a popular library for rendering MusicXML
// Install via: npm install opensheetmusicdisplay
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

/**
 * Komponen SongSheetMusic
 * Menampilkan partitur lagu dari field sheet_music_xml (MusicXML)
 * Props:
 *   - sheetMusicXml: string (isi MusicXML)
 *   - width: number (opsional)
 */
export default function SongSheetMusic({ sheetMusicXml, width = 700 }) {
  const containerRef = useRef(null);
  const osmdRef = useRef(null);

  useEffect(() => {
    if (!sheetMusicXml || !containerRef.current) return;
    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawingParameters: 'default',
        backend: 'svg',
      });
    }
    osmdRef.current.load(sheetMusicXml).then(() => {
      osmdRef.current.render();
    });
    // Cleanup on unmount
    return () => {
      if (osmdRef.current) {
        osmdRef.current.clear();
      }
    };
  }, [sheetMusicXml]);

  return (
    <div className="sheet-music-container card" style={{ maxWidth: width, margin: '0 auto' }}>
      <div ref={containerRef} />
    </div>
  );
}
