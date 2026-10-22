/**
 * StageShell.jsx
 *
 * Komponen presentasional untuk Stage Mode (tanpa state aplikasi):
 *   - StageIcon        : ikon SVG stroke (bukan emoji) supaya tajam & seragam
 *   - StageSongList    : daftar lagu untuk sheet "lagu" & "cari"
 *   - StageSetlistList : daftar setlist untuk sheet pemilih setlist
 *   - StageSheetHeader : judul + tombol tutup sheet (dipakai ketiga sheet)
 *   - StageSongRow/... memakai kelas .stage-sheet-* & .stage-chip yang
 *     definisinya ada di stage-mode-page.css.
 *
 * Tujuan: StageModePage tinggal mengurus state/efek; blok markup yang
 * berulang dikumpulkan di sini sehingga mudah di-restyle.
 */
import React from 'react';

/* ======== Ikon ======== */

// Setiap entri WAJIB menghasilkan elemen di dalam <svg>: string `d` saja
// merender <path> kosong (React memperlakukan string sebagai children teks),
// sehingga ikon terlihat hilang. Karena itu semua ikon berupa elemen <path>.
const ICON_PATHS = {
  close: <path d="M5 5l14 14M19 5L5 19" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  list: <path d="M4 7h16M4 12h16M4 17h10" />,
  headphone: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <path d="M4 15h3v5H5a1 1 0 0 1-1-1v-4ZM20 15h-3v5h2a1 1 0 0 0 1-1v-4Z" />
    </>
  ),
  prev: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  sliders: <path d="M4 8h10M18 8h2M4 16h4M12 16h8M15 5.5v5M9 13.5v5" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6-6 6" />,
};

export function StageIcon({ name, size = 20, className = '' }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      className={`stage-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}

/* ======== Daftar lagu ======== */

/**
 * Satu baris lagu: nomor urut (opsional), judul + artis, key, dan badge
 * "Now" untuk lagu aktif. Dipakai sheet "Daftar lagu" dan hasil pencarian.
 */
export function StageSongRow({ song, index, active, onSelect }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={Boolean(active)}
      onClick={onSelect}
      className={`stage-sheet-item${active ? ' is-active' : ''}`}
    >
      {Number.isInteger(index) && <span className="stage-sheet-number">{index + 1}</span>}
      <span className="stage-sheet-name">
        <span className="stage-sheet-item-title">{song.title || 'Tanpa judul'}</span>
        {song.artist && <span className="stage-sheet-item-artist">{song.artist}</span>}
      </span>
      {active && <span className="stage-chip stage-chip--now">Now</span>}
      {song.key && <span className="stage-chip">{song.key}</span>}
    </button>
  );
}

export function StageSongList({ songs, activeIndex, onSelect, empty, loading }) {
  if (loading) return <div className="stage-sheet-empty">Memuat lagu setlist…</div>;
  if (songs.length === 0) {
    return empty ? <div className="stage-sheet-empty">{empty}</div> : null;
  }
  return (
    <div className="stage-sheet-list" role="menu">
      {songs.map((song, index) => (
        <StageSongRow
          key={song.id}
          song={song}
          index={index}
          active={index === activeIndex}
          onSelect={() => onSelect(song.id)}
        />
      ))}
    </div>
  );
}

/* ======== Daftar setlist ======== */

export function StageSetlistList({ setlists, activeId, onSelect, query = '' }) {
  const needle = String(query || '').trim().toLowerCase();
  const visible = setlists.filter((sl) => !needle || String(sl.name || '').toLowerCase().includes(needle));

  if (visible.length === 0) return <div className="stage-sheet-empty">Tidak ada setlist.</div>;

  return (
    <div className="stage-sheet-list" role="menu">
      {visible.map((sl) => {
        const active = String(sl.id) === String(activeId || '');
        const count = Array.isArray(sl.songs) ? sl.songs.length : null;
        return (
          <button
            key={sl.id}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            onClick={() => onSelect(String(sl.id))}
            className={`stage-sheet-item${active ? ' is-active' : ''}`}
          >
            <span className="stage-sheet-name">
              <span className="stage-sheet-item-title">{sl.name || 'Tanpa nama'}</span>
            </span>
            {active && <span className="stage-chip stage-chip--now">Aktif</span>}
            {count !== null && <span className="stage-chip">{count} lagu</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ======== Header sheet ======== */

/**
 * Header bottom sheet: eyebrow, judul (+ badge jumlah opsional), tombol tutup.
 * Dipakai sheet setlist, daftar lagu, dan pencarian agar strukturnya seragam.
 */
export function StageSheetHeader({ eyebrow, title, count, onClose }) {
  return (
    <header className="stage-sheet-head">
      {eyebrow && <span className="stage-sheet-eyebrow">{eyebrow}</span>}
      <h2 className="stage-sheet-title">
        {title}
        {Number.isFinite(count) && <span className="stage-sheet-count">{count}</span>}
      </h2>
      <button
        type="button"
        className="stage-dark-btn stage-sheet-close"
        onClick={onClose}
        aria-label="Tutup"
        title="Tutup (Esc)"
      >
        <StageIcon name="close" size={16} />
      </button>
    </header>
  );
}
