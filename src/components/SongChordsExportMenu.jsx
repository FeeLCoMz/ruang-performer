import React, { useEffect, useRef } from "react";

/**
 * SongChordsExportMenu
 * Dropdown export menu untuk lirik/chord (text, PDF).
 * - Posisi: muncul di bawah tombol export (absolute, wrapper .song-info-export-wrap)
 * - Menutup otomatis saat klik di luar menu atau tekan Escape
 * - Item memakai role="menuitem" agar aksesibel
 */
export default function SongChordsExportMenu({
  showExportMenu,
  setShowExportMenu,
  handleExportText,
  handleExportPDF
}) {
  const menuRef = useRef(null);

  // Tutup menu saat klik di luar atau Escape.
  useEffect(() => {
    if (!showExportMenu) return undefined;

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowExportMenu?.(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowExportMenu?.(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showExportMenu, setShowExportMenu]);

  if (!showExportMenu) return null;

  const runAndClose = (handler) => (event) => {
    event.stopPropagation();
    handler?.();
    setShowExportMenu?.(false);
  };

  return (
    <div
      ref={menuRef}
      className="song-lyrics-export-menu"
      role="menu"
      aria-label="Menu export lagu"
    >
      <button
        type="button"
        className="song-lyrics-export-item"
        role="menuitem"
        onClick={runAndClose(handleExportText)}
      >
        📄 Export ke Text
      </button>
      <button
        type="button"
        className="song-lyrics-export-item"
        role="menuitem"
        onClick={runAndClose(handleExportPDF)}
      >
        📑 Print / PDF
      </button>
    </div>
  );
}
