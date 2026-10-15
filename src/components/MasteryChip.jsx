import React, { useEffect, useRef, useState } from 'react';

/**
 * MasteryChip
 *
 * Chip status penguasaan lagu yang bisa diklik untuk mengubah status.
 * Klik chip membuka dropdown pilihan level:
 *   - 🔴 Belum Diulik (none)
 *   - 🟡 Perlu Latihan (learning)
 *   - 🟢 Dikuasai (mastered)
 *
 * Pemakaian: dipasang di kartu lagu (SongListPage, SetlistSongsPage) dan
 * panel info lagu (SongChordsInfo). Perubahan status dikirim lewat
 * `onStatusChange(status)` — halaman pemakai yang memanggil API.
 *
 * Props:
 *  - status            : 'none' | 'learning' | 'mastered'
 *  - onStatusChange    : (nextStatus) => void
 *  - updating          : true saat request simpan berjalan (chip disable)
 *  - disabled          : chip tidak bisa diklik (mis. belum login/tak berhak)
 *  - disabledTitle     : tooltip saat disabled
 *  - compact           : tampil tanpa label teks (hanya ikon) — untuk chip kecil
 */
export const MASTERY_LEVELS = [
  { value: 'none', label: 'Belum Diulik', icon: '🔴' },
  { value: 'learning', label: 'Perlu Latihan', icon: '🟡' },
  { value: 'mastered', label: 'Dikuasai', icon: '🟢' },
];

export function getMasteryMeta(status) {
  return MASTERY_LEVELS.find((l) => l.value === status) || MASTERY_LEVELS[0];
}

export default function MasteryChip({
  status = 'none',
  onStatusChange,
  updating = false,
  disabled = false,
  disabledTitle = 'Anda belum bisa menandai lagu ini',
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const meta = getMasteryMeta(status);

  // Tutup dropdown saat klik di luar.
  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const pick = (nextStatus) => {
    setOpen(false);
    if (!onStatusChange || nextStatus === status) return;
    onStatusChange(nextStatus);
  };

  return (
    <span className="mastery-chip-root" ref={rootRef}>
      <button
        type="button"
        className={`song-mastery-chip mastery-${status}${open ? ' open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled || updating) return;
          setOpen((v) => !v);
        }}
        disabled={disabled || updating}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status penguasaan: ${meta.label}. Klik untuk mengubah.`}
        title={disabled ? disabledTitle : `${meta.title || `Status: ${meta.label}`} — klik untuk mengubah`}
      >
        <span aria-hidden="true">{updating ? '⏳' : meta.icon}</span>
        {!compact && meta.label}
        {!compact && !disabled && !updating && <span className="mastery-chip-caret" aria-hidden="true">▾</span>}
      </button>

      {open && (
        <span
          className="mastery-chip-menu"
          role="menu"
          aria-label="Ubah status penguasaan"
          onClick={(e) => e.stopPropagation()}
        >
          {MASTERY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              role="menuitemradio"
              aria-checked={level.value === status}
              className={`mastery-chip-item mastery-${level.value}${level.value === status ? ' selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                pick(level.value);
              }}
            >
              <span aria-hidden="true">{level.icon}</span>
              {level.label}
              {level.value === status && <span className="mastery-chip-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
