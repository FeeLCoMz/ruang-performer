import React from 'react';

/**
 * SongCard
 *
 * Satu sumber tampilan kartu lagu, dipakai halaman "Lagu" dan halaman
 * lagu di dalam setlist. Strukturnya sengaja dibuat sama (judul + status di
 * sudut kanan atas, metadata dua baris, baris aksi berlabel) supaya kedua
 * halaman terasa seperti satu aplikasi.
 *
 * Perbedaan antar-halaman dikirim lewat props, bukan lewat duplikasi markup:
 *  - `leadingSlot`   : kolom kiri opsional (mis. nomor urut di setlist).
 *  - `headingStatus` : flag status di baris judul (mis. Live/Selesai).
 *  - `metaPrimary`   : baris utama metadata (artis/key/tempo/band/genre).
 *  - `metaDetail`    : baris pendukung metadata (mood/setlist).
 *  - `actions`       : tombol aksi halaman tersebut.
 *
 * Empat informasi yang harus langsung terbaca tanpa hover/scroll — judul,
 * artis, key, tempo — ditandai dengan class `song-fact-*` dan menempati
 * baris utama kartu (judul di header, artis/key/tempo di `metaPrimary`),
 * bukan baris detail. CSS memakai tanda itu untuk menjaga keempatnya selalu
 * tampil & berkontras tinggi, apa pun lebar layar. Metadata lain cukup jadi
 * informasi pendukung.
 */
export default function SongCard({
  title,
  isPlaying = false,
  playingBadge = 'LIVE',
  leadingSlot = null,
  headingStatus = null,
  metaPrimary = null,
  metaDetail = null,
  actions = null,
  className = '',
  style,
  onClick,
  dragProps = null,
  rowRef = null,
}) {
  const cardClassName = [
    'song-item',
    isPlaying ? 'song-item-playing' : '',
    className,
  ].filter(Boolean).join(' ');

  // Kartu yang bisa diklik juga harus bisa dibuka dengan keyboard (Enter/Space).
  // Tanpa ini baris lagu hanya bisa diakses lewat pointer.
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick(event);
          }
        },
      }
    : {};

  return (
    <div
      ref={rowRef}
      className={cardClassName}
      onClick={onClick}
      style={style}
      {...interactiveProps}
      {...(dragProps || {})}
    >
      {leadingSlot}

      <div className="song-info">
        <div className="song-heading">
          <h3 className="song-title song-fact-title">
            {title}
            {isPlaying && <span className="song-playing-badge" title="Sedang berjalan">▶</span>}
          </h3>
          {headingStatus}
        </div>

        {(metaPrimary || metaDetail) && (
          <div className="song-meta">
            {metaPrimary}
            {metaDetail}
          </div>
        )}
      </div>

      {actions && (
        <div
          className="song-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
