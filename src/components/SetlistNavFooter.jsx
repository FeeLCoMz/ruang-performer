import React, { useEffect, useState } from 'react';

/**
 * SetlistNavFooter
 * Footer sticky di atas bottom nav (mobile) saat lagu dibuka dari setlist:
 * tombol buka setlist aktif + prev/next lagu + posisi lagu dalam setlist.
 * Muncul di semua tab, jadi pemain bisa pindah lagu tanpa kembali ke daftar
 * setlist.
 *
 * Dipakai juga sebagai bar bawah saat MODE PENUH panel lirik (dari
 * SongLyricsMainSection) — footer mobile disembunyikan di lebar besar.
 *
 * Desktop (>768px): disembunyikan di luar mode penuh — navigasi antar lagu
 * tetap tersedia di toolbar panel lirik.
 */
export default function SetlistNavFooter({ setlistNav, allSongs = [], onOpenSetlist, variant = 'sticky' }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = React.useRef(null);

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

  // Reset pencarian + fokuskan input saat sheet dibuka.
  useEffect(() => {
    if (sheetOpen) {
      setQuery('');
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [sheetOpen]);

  if (!setlistNav) return null;

  const handlePick = (event) => {
    const btn = event.target?.closest?.('button');
    const songId = btn?.getAttribute?.('data-song-id');
    if (!songId) return;
    setSheetOpen(false);
    if (btn.getAttribute('data-outside') === 'true') {
      setlistNav.openSongOutside?.(songId);
    } else {
      setlistNav.goToSong?.(songId);
    }
  };

  // Pencarian cepat: lagu dalam setlist + lagu di luar setlist (repertoire).
  const q = query.trim().toLowerCase();
  const inSetlistSongs = (setlistNav.songs || []).filter((item) =>
    !q || (item.title || '').toLowerCase().includes(q) || (item.key || '').toLowerCase().includes(q));
  const setlistIds = new Set((setlistNav.songs || []).map((s) => String(s.id)));
  const outsideSongs = (Array.isArray(allSongs) ? allSongs : [])
    .filter((s) => !setlistIds.has(String(s.id)))
    .filter((s) => !q
      || (s.title || '').toLowerCase().includes(q)
      || (s.artist || '').toLowerCase().includes(q));
  const hasResults = inSetlistSongs.length > 0 || outsideSongs.length > 0;

  const renderSheetItem = (item, { outside = false } = {}) => (
    <button
      key={outside ? `out-${item.id}` : item.id}
      type="button"
      role="menuitemradio"
      aria-checked={item.isCurrent}
      data-song-id={item.id}
      data-outside={outside ? 'true' : undefined}
      className={`setlist-nav-sheet-item${item.isCurrent ? ' active' : ''}${outside ? ' outside' : ''}`}
    >
      <span className="setlist-nav-sheet-item-number" aria-hidden="true">
        {outside ? '＋' : item.number}
      </span>
      <span className="setlist-nav-sheet-item-title">
        {item.title || 'Tanpa judul'}
        {outside && item.artist && <span className="setlist-nav-sheet-item-artist"> — {item.artist}</span>}
      </span>
      {item.key && <span className="setlist-nav-sheet-item-key">{item.key}</span>}
      {item.isCurrent && <span className="setlist-nav-sheet-item-playing" aria-hidden="true">▶</span>}
    </button>
  );

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
            <div className="setlist-nav-sheet-search">
              <input
                ref={searchRef}
                type="search"
                className="setlist-nav-sheet-search-input"
                placeholder="Cari lagu… (termasuk di luar setlist)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Cari lagu"
              />
            </div>
            <div className="setlist-nav-sheet-list" role="menu">
              {inSetlistSongs.length > 0 && (
                <div className="setlist-nav-sheet-group-label">Dalam setlist</div>
              )}
              {inSetlistSongs.map((item) => renderSheetItem(item))}
              {outsideSongs.length > 0 && (
                <div className="setlist-nav-sheet-group-label">Di luar setlist</div>
              )}
              {outsideSongs.map((s) => renderSheetItem(
                { id: String(s.id), title: s?.title, artist: s?.artist, key: s?.key || s?.performanceKey || '' },
                { outside: true },
              ))}
              {!hasResults && (
                <div className="setlist-nav-sheet-empty">Tidak ada lagu yang cocok dengan “{query}”</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className={`setlist-nav-footer setlist-nav-fullscreen${variant === 'inline' ? ' setlist-nav-footer--inline' : ''}`}
        role="navigation"
        aria-label="Navigasi lagu setlist"
      >
        {typeof onOpenSetlist === 'function' && (
          <button
            type="button"
            className="btn btn-secondary setlist-nav-footer-btn"
            onClick={onOpenSetlist}
            aria-label="Buka setlist aktif"
            title="Kembali ke daftar lagu setlist aktif"
          >
            <span aria-hidden="true">📋</span>
          </button>
        )}
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
          title={`Lagu ${setlistNav.songNumber}/${setlistNav.totalSongs} — lihat daftar lagu`}
        >
          <span className="setlist-nav-footer-info-icon" aria-hidden="true">☰</span>
          <span className="setlist-nav-footer-info-number">{setlistNav.songNumber}/{setlistNav.totalSongs}</span>
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