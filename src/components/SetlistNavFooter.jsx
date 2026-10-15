import React, { useEffect, useState } from 'react';

/**
 * SetlistNavFooter
 * Footer sticky di atas bottom nav (mobile) saat lagu dibuka dari setlist:
 * tombol prev/next lagu + posisi lagu dalam setlist. Muncul di semua tab,
 * jadi pemain bisa pindah lagu tanpa kembali ke daftar setlist.
 *
 * Dipakai juga sebagai footer sticky di fullscreen lirik
 * (SongChordsLyricsDisplay) — class .setlist-nav-fullscreen mengoverride
 * media query desktop agar footer tetap tampil di layar penuh.
 *
 * Desktop (>768px): disembunyikan di luar fullscreen — navigasi antar lagu
 * tetap tersedia di toolbar panel lirik.
 */
export default function SetlistNavFooter({ setlistNav }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Tutup sheet saat pindah lagu/halaman.
  useEffect(() => {
    setSheetOpen(false);
  }, [setlistNav?.songNumber]);

  useEffect(() => {
    if (!sheetOpen) return undefined;

    // Back button menutup sheet dulu, bukan meninggalkan halaman.
    const handlePopState = () => setSheetOpen(false);
    window.history.pushState({ setlistNavSheet: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.setlistNavSheet) {
        window.history.back();
      }
    };
  }, [sheetOpen]);

  if (!setlistNav) return null;

  const handlePick = (event) => {
    const songId = event.target?.closest?.('button')?.getAttribute?.('data-song-id');
    if (!songId) return;
    setSheetOpen(false);
    setlistNav.goToSong?.(songId);
  };

  return (
    <>
      {sheetOpen && setlistNav.songs && (
        <div
          className="setlist-nav-sheet-overlay"
          onClick={() => setSheetOpen(false)}
          role="presentation"
        >
          <div
            className="setlist-nav-sheet"
            role="menu"
            aria-label="Pilih lagu dalam setlist"
            onClick={handlePick}
          >
            <div className="setlist-nav-sheet-handle" aria-hidden="true" />
            <div className="setlist-nav-sheet-title">
              {setlistNav.setlistName || 'Setlist'} — {setlistNav.totalSongs} lagu
            </div>
            <div className="setlist-nav-sheet-list" role="menu">
              {setlistNav.songs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={item.isCurrent}
                  data-song-id={item.id}
                  className={`setlist-nav-sheet-item${item.isCurrent ? ' active' : ''}`}
                >
                  <span className="setlist-nav-sheet-item-number" aria-hidden="true">{item.number}</span>
                  <span className="setlist-nav-sheet-item-title">{item.title || 'Tanpa judul'}</span>
                  {item.key && <span className="setlist-nav-sheet-item-key">{item.key}</span>}
                  {item.isCurrent && <span className="setlist-nav-sheet-item-playing" aria-hidden="true">▶</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="setlist-nav-footer setlist-nav-fullscreen" role="navigation" aria-label="Navigasi lagu setlist">
        <button
          type="button"
          className="btn btn-secondary setlist-nav-footer-btn"
          onClick={setlistNav.onPrev}
          disabled={!setlistNav.hasPrev}
          aria-label="Lagu sebelumnya"
          title={setlistNav.prevTitle || 'Lagu sebelumnya'}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          className="setlist-nav-footer-info setlist-nav-footer-info-btn"
          onClick={() => setSheetOpen((v) => !v)}
          aria-expanded={sheetOpen}
          aria-label={`Lagu ${setlistNav.songNumber} dari ${setlistNav.totalSongs}. Buka daftar lagu.`}
          title="Lihat daftar lagu"
        >
          Lagu {setlistNav.songNumber}/{setlistNav.totalSongs}
          <span className="setlist-nav-footer-info-icon" aria-hidden="true">☰</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary setlist-nav-footer-btn"
          onClick={setlistNav.onNext}
          disabled={!setlistNav.hasNext}
          aria-label="Lagu berikutnya"
          title={setlistNav.nextTitle || 'Lagu berikutnya'}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </>
  );
}