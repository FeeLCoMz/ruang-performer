import React from 'react';

/**
 * SongCard
 *
 * Satu sumber tampilan kartu lagu, dipakai halaman "Lagu" dan halaman
 * lagu di dalam setlist. Strukturnya sengaja dibuat sama (judul + status di
 * sudut kanan atas, metadata dua baris, baris aksi berlabel) supaya kedua
 * halaman terasa seperti satu aplikasi.
 *
 * Bentuk chip di baris aksi (label penuh vs ikon saja) diatur CSS, bukan
 * props: `.song-actions > .mastery-chip-root` di halaman setlist menyusut
 * menjadi ikon di layar sempit. Elemen yang dioper sebagai children sudah
 * final, jadi menambahkan prop lewat cloneElement tidak bisa diandalkan.
 *
 * Perbedaan antar-halaman dikirim lewat props, bukan lewat duplikasi markup:
 *  - `leadingSlot`   : kolom samping opsional (mis. nomor urut di setlist).
 *  - `leadingLayout` : 'side' (kolom kiri, default — judul & aksi di kanan
 *                      sejajar) atau 'above' (pita penuh di atas judul, sehingga
 *                      judul & aksi memakai lebar kartu penuh). Halaman memilih
 *                      'above' saat isi slot butuh ruang horizontal.
 *  - `headingStatus` : flag status di baris judul (mis. Live/Selesai).
 *  - `metaPrimary`   : baris utama metadata (artis/key/tempo/band/genre).
 *  - `metaDetail`    : baris pendukung metadata (mood/setlist).
 *  - `actions`       : tombol aksi halaman tersebut.
 *  - `actionStatus`  : chip/status yang menempel di awal baris aksi (mis. chip
 *                      mastery). Dipisah dari `actions` karena bukan tombol:
 *                      tidak ikut aturan geometri `.song-action-btn`, tapi tetap
 *                      berada di kolom kanan kartu dan tidak memicu klik kartu.
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
  leadingLayout = 'side',
  headingStatus = null,
  metaPrimary = null,
  metaDetail = null,
  actions = null,
  actionStatus = null,
  className = '',
  style,
  onClick,
  dragProps = null,
  rowRef = null,
}) {
  const useAboveLayout = Boolean(leadingSlot) && leadingLayout === 'above';

  const cardClassName = [
    'song-item',
    isPlaying ? 'song-item-playing' : '',
    useAboveLayout ? 'song-item-with-lead-above' : '',
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

  const info = (
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
  );

  const renderActions = (status) => (
    <div
      className="song-actions"
      onClick={(e) => e.stopPropagation()}
    >
      {status}
      {actions}
    </div>
  );

  const cardProps = {
    ref: rowRef,
    className: cardClassName,
    onClick,
    style,
    ...interactiveProps,
    ...(dragProps || {}),
  };

  // Slot di atas: header selebar kartu berisi nomor/status (kiri) dan aksi
  // (kanan), lalu baris info (judul + metadata). Slot samping (default): kolom
  // kiri (rail), info, lalu aksi di kolom kanan.
  if (useAboveLayout) {
    return (
      <div {...cardProps}>
        {/* Satu blok header: nomor urut + status di kiri dan aksi di kanan.
            Dulu pita nomor dan baris aksi terpisah sehingga muncul dua garis
            pemisah bertumpuk dan sisa ruang kosong di kanan pita. */}
        <div className="song-head-row">
          <div className="song-lead-above">{leadingSlot}</div>
          {(actionStatus || actions) && renderActions(actionStatus)}
        </div>
        <div className="song-body">{info}</div>
      </div>
    );
  }

  return (
    <div {...cardProps}>
      {leadingSlot}
      {info}
      {(actionStatus || actions) && renderActions(actionStatus)}
    </div>
  );
}
