import React from 'react';
import { usePermission } from '../hooks/usePermission.js';
import DeleteIcon from './DeleteIcon.jsx';

export default function BandListItem({ band, userBandInfo, onDelete, navigate }) {
  const { can } = usePermission(band.id, userBandInfo);
  return (
    <div
      className="setlist-item"
      onClick={() => navigate(`/bands/${band.id}`)}
    >
      {/* Band Info */}
      <div className="setlist-info">
        <h3 className="setlist-title">{band.name}</h3>
        <div className="setlist-meta">
          {band.genre && <span>🎵 {band.genre}</span>}
          {band.description && <span>{band.description}</span>}
        </div>
      </div>
      {/* Actions */}
      <div
        className="setlist-actions"
        onClick={e => e.stopPropagation()}
      >
        {can('edit_band') && (
          <button
            onClick={() => onDelete(band.id)}
            className="btn-base"
            style={{
              padding: '6px 12px',
              fontSize: '0.85em',
              background: '#dc2626',
              borderColor: '#b91c1c',
              color: '#fff'
            }}
            title="Hapus"
          >
            <DeleteIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
