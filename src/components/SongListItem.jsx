import React, { useState } from 'react';
import SetlistPicker from './SetlistPicker';

export default function SongListItem({
  song,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  currentSetList,
  overrideKey,
  onSetListKeyChange,
  viewMode,
  isCompleted,
  onToggleCompleted,
  isFavorite,
  onToggleFavorite
}) {
  const [tempKey, setTempKey] = useState(overrideKey || '');
  const [showSetlistPicker, setShowSetlistPicker] = useState(false);
  const [refresh, setRefresh] = useState(0); // force re-render

  React.useEffect(() => {
    setTempKey(overrideKey || '');
  }, [overrideKey]);

  return (
    <div
      className={`song-item${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
      style={{ position: 'relative' }}
    >
      <div className="song-info" onClick={onSelect}>
        <button
          onClick={e => {
            e.stopPropagation();
            onToggleFavorite && onToggleFavorite();
          }}
          className="btn-icon-sm"
          title={isFavorite ? 'Hapus dari Favorit' : 'Jadikan Favorit'}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            background: 'none',
            border: 'none',
            fontSize: 18,
            color: isFavorite ? '#fbbf24' : '#aaa',
            cursor: 'pointer',
            zIndex: 2
          }}
        >
          {isFavorite ? '★' : '☆'}
        </button>

        {currentSetList && onToggleCompleted && (
          <div
            style={{
              position: 'absolute',
              left: '0.5rem',
              top: '0.5rem',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={!!isCompleted}
              onChange={e => {
                e.stopPropagation();
                onToggleCompleted();
              }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#10b981'
              }}
              title={isCompleted ? 'Tandai belum selesai dilatih' : 'Tandai sudah selesai dilatih'}
            />
          </div>
        )}

        <div
          className="song-title"
          style={{ paddingLeft: currentSetList && onToggleCompleted ? '1.75rem' : 0 }}
        >
          {song.title}
        </div>
        {song.id === song.title && !song.lyrics && (
          <span
            style={{
              background: '#ff922b',
              color: '#fff',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.8em',
              marginLeft: 8,
              fontWeight: 600
            }}
          >
            ⏳ Pending
          </span>
        )}
        <div className="song-artist">{song.artist}</div>
        <div
          className="song-meta"
          style={{ fontSize: '0.85em', color: '#a5b4fc', marginTop: 2 }}
        >
          {song.key && (
            <span style={{ marginRight: 8 }}>
              🎵 <b>{song.key}</b>
            </span>
          )}
          {currentSetList && (
            <span
              style={{ marginRight: 8 }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              🔀
              <select
                value={tempKey}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onChange={e => {
                  e.stopPropagation();
                  setTempKey(e.target.value);
                }}
                onBlur={() => onSetListKeyChange && onSetListKeyChange(tempKey)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    onSetListKeyChange && onSetListKeyChange(tempKey);
                  }
                }}
                style={{ marginLeft: 6, padding: '2px 4px', fontSize: '0.85em' }}
                title="Set key untuk lagu ini di setlist"
              >
                <option value="">(default)</option>
                {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B','Db','Eb','Gb','Ab','Bb'].map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </span>
          )}
          {song.tempo && (
            <span style={{ marginRight: 8 }}>
              ⏱️ <b>{song.tempo}</b>
            </span>
          )}
          {song.style && (
            <span>🎸 <b>{song.style}</b></span>
          )}
        </div>

        {/* Detailed View Mode */}
        {viewMode === 'detailed' && (
          <div
            className="song-details"
            style={{
              fontSize: '0.8em',
              color: '#94a3b8',
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(148, 163, 184, 0.1)'
            }}
          >
            {song.youtubeId && (
              <div style={{ marginBottom: 4 }}>
                <span>📺 YouTube: </span>
                <a
                  href={`https://youtube.com/watch?v=${song.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: '#60a5fa', textDecoration: 'none' }}
                >
                  {song.youtubeId}
                </a>
              </div>
            )}
            {song.timestamps && (
              <div style={{ marginBottom: 4 }}>
                <span>
                  ⏰ Timestamps: {
                    typeof song.timestamps === 'string'
                      ? song.timestamps
                      : Array.isArray(song.timestamps)
                        ? `${song.timestamps.length} timestamps`
                        : typeof song.timestamps === 'object'
                          ? JSON.stringify(song.timestamps)
                          : song.timestamps
                  }
                </span>
              </div>
            )}
            {song.lyrics && (
              <div style={{ marginBottom: 4 }}>
                <span>📝 {song.lyrics.split('\n').length} baris lirik</span>
              </div>
            )}
            {song.createdAt && (
              <div style={{ marginBottom: 4 }}>
                <span>
                  📅 Dibuat: {new Date(song.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
            {song.updatedAt && (
              <div>
                <span>
                  🔄 Diubah: {new Date(song.updatedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="song-actions">
        {/* Setlist Picker Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            setShowSetlistPicker(true);
          }}
          className="btn-icon-sm btn-success"
          title="Tambah/Hapus dari Setlist"
        >
          ➕
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit();
          }}
          className="btn-icon-sm"
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="btn-icon-sm btn-danger"
          title="Hapus"
        >
          🗑️
        </button>
              {/* SetlistPicker Popup */}
              {showSetlistPicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    right: 0,
                    zIndex: 100,
                    background: 'var(--card, #fff)',
                    border: '1px solid var(--border, #ddd)',
                    borderRadius: 8,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                    padding: 16,
                    minWidth: 220
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <SetlistPicker
                    songId={song.id}
                    onChange={() => {
                      setShowSetlistPicker(false);
                      setRefresh(r => r + 1); // force re-render
                    }}                                
                  />
                  <div style={{ textAlign: 'right', marginTop: 8 }}>
                    <button className="btn btn-sm" onClick={() => setShowSetlistPicker(false)}>
                      Tutup
                    </button>
                  </div>
                </div>
              )}
      </div>
    </div>
  );
}
