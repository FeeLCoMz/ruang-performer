import React from 'react';
import PropTypes from 'prop-types';

/**
 * BandListItem
 * Komponen untuk menampilkan 1 item band pada daftar band.
 * Tidak ada tombol hapus di sini (hanya di BandDetailPage).
 *
 * Props:
 *   - band: object band (id, name, genre, description, ...)
 *   - navigate: function untuk navigasi ke detail band
 */
export default function BandListItem({ band, navigate, userBandInfo }) {
  const role = userBandInfo?.role || band?.role || (band?.isOwner ? 'owner' : band?.userRole || 'member');
  const roleLabel = role === 'owner' ? 'Pemilik' : role === 'admin' ? 'Admin' : 'Anggota';
  const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const createdAtLabel = formatDate(band?.createdAt);
  const joinedAtLabel = formatDate(userBandInfo?.joinedAt || band?.joinedAt);
  const metadataItems = [];

  if (band?.genre) {
    metadataItems.push({ icon: '🎵', label: band.genre });
  }
  if (typeof band?.memberCount === 'number') {
    metadataItems.push({ icon: '👥', label: `${band.memberCount} anggota` });
  }
  if (createdAtLabel) {
    metadataItems.push({ icon: '🗓️', label: `Dibuat ${createdAtLabel}` });
  }
  if (joinedAtLabel) {
    metadataItems.push({ icon: '➕', label: `Bergabung ${joinedAtLabel}` });
  }

  const initial = (band?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div
      className="setlist-item band-list-item"
      onClick={() => navigate(`/bands/${band.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/bands/${band.id}`);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Lihat detail band ${band.name}`}
    >
      {/* Monogram band: pengganti ikon yang tidak ada, memberi jangkar visual. */}
      <span className="band-list-item-avatar" aria-hidden="true">{initial}</span>
      <div className="setlist-info band-list-item-info">
        <div className="band-list-item-title-row">
          <h3 className="setlist-title band-list-item-title">{band.name}</h3>
          <span className={`band-list-role-badge ${role}`}>{roleLabel}</span>
        </div>
          {metadataItems.length > 0 && (
            <div className="band-list-item-meta">
              {metadataItems.map((item) => (
                <span key={item.label} className="band-list-item-meta-chip">
                  <span className="band-list-item-meta-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          )}
          {band.description && <p className="band-list-item-description">{band.description}</p>}
      </div>
      <div className="band-list-item-side">
        <span className="band-list-item-cta" aria-hidden="true">→</span>
      </div>
    </div>
  );
}

BandListItem.propTypes = {
  band: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    description: PropTypes.string,
    genre: PropTypes.string,
    role: PropTypes.string,
    userRole: PropTypes.string,
    isOwner: PropTypes.bool,
    memberCount: PropTypes.number,
    createdAt: PropTypes.string,
    joinedAt: PropTypes.string,
  }).isRequired,
  navigate: PropTypes.func.isRequired,
  userBandInfo: PropTypes.shape({
    role: PropTypes.string,
    bandId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    joinedAt: PropTypes.string,
  }),
};
