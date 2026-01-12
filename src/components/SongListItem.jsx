import React, { useState } from 'react';

export default function SongListItem({ song, isActive, onSelect, onEdit, onDelete, setLists, onAddToSetLists, onRemoveFromSetList, currentSetList, overrideKey, onSetListKeyChange, viewMode, isCompleted, onToggleCompleted }) {
  const [showSetListPopup, setShowSetListPopup] = useState(false);
  const [selectedSetLists, setSelectedSetLists] = useState([]);
  const [tempKey, setTempKey] = useState(overrideKey || '');

  React.useEffect(() => {
    setTempKey(overrideKey || '');
  }, [overrideKey]);

  const handleAddClick = (e) => {
    e.stopPropagation();
    // Centang otomatis setlist yang sudah berisi lagu
    const alreadyInSetlists = setLists.filter(sl => sl.songs.includes(song.id)).map(sl => sl.id);
    setSelectedSetLists(alreadyInSetlists);
    setShowSetListPopup(true);
  };

  const handleSetListToggle = (id) => {
    const isChecked = !selectedSetLists.includes(id);
    setSelectedSetLists(prev =>
      isChecked ? [...prev, id] : prev.filter(slId => slId !== id)
    );
    if (isChecked) {
      onAddToSetLists([id]);
    } else {
      onRemoveFromSetList(id, song.id);
    }
  };

  const handleConfirmAdd = (e) => {
    e.stopPropagation();
    if (selectedSetLists.length > 0) {
      onAddToSetLists(selectedSetLists);
      setShowSetListPopup(false);
      setSelectedSetLists([]);
    }
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setShowSetListPopup(false);
    setSelectedSetLists([]);
  };

  return (
    <div className={`song-item${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`} style={{ position: 'relative' }}>
      <div className="song-info" onClick={onSelect}>
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
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={!!isCompleted}
              onChange={(e) => {
                e.stopPropagation();
                onToggleCompleted();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                width: '18px', 
                height: '18px', 
                cursor: 'pointer',
                accentColor: '#10b981'
              }}
              title={isCompleted ? "Tandai belum selesai dilatih" : "Tandai sudah selesai dilatih"}
            />
          </div>
        )}
        <div className="song-title" style={{ paddingLeft: currentSetList && onToggleCompleted ? '1.75rem' : 0 }}>{song.title}</div>
        <div className="song-artist">{song.artist}</div>
        <div className="song-meta" style={{ fontSize: '0.85em', color: '#a5b4fc', marginTop: 2 }}>
          {song.key && <span style={{ marginRight: 8 }}>🎵 <b>{song.key}</b></span>}
          {currentSetList && (
            <span
              style={{ marginRight: 8 }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              🔀
              <select
                value={tempKey}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => { e.stopPropagation(); setTempKey(e.target.value); }}
                onBlur={() => onSetListKeyChange && onSetListKeyChange(tempKey)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onSetListKeyChange && onSetListKeyChange(tempKey); } }}
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
          {song.tempo && <span style={{ marginRight: 8 }}>⏱️ <b>{song.tempo}</b></span>}
          {song.style && <span>🎸 <b>{song.style}</b></span>}
        </div>
        
        {/* Detailed View Mode */}
        {viewMode === 'detailed' && (
          <div className="song-details" style={{ fontSize: '0.8em', color: '#94a3b8', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
            {song.youtubeId && (
              <div style={{ marginBottom: 4 }}>
                <span>📺 YouTube: </span>
                <a 
                  href={`https://youtube.com/watch?v=${song.youtubeId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: '#60a5fa', textDecoration: 'none' }}
                >
                  {song.youtubeId}
                </a>
              </div>
            )}
            {song.timestamps && (
              <div style={{ marginBottom: 4 }}>
                <span>⏰ Timestamps: {
                  typeof song.timestamps === 'string' 
                    ? song.timestamps 
                    : Array.isArray(song.timestamps)
                      ? `${song.timestamps.length} timestamps`
                      : typeof song.timestamps === 'object'
                        ? JSON.stringify(song.timestamps)
                        : song.timestamps
                }</span>
              </div>
            )}
            {song.lyrics && (
              <div style={{ marginBottom: 4 }}>
                <span>📝 {song.lyrics.split('\n').length} baris lirik</span>
              </div>
            )}
            {song.createdAt && (
              <div style={{ marginBottom: 4 }}>
                <span>📅 Dibuat: {new Date(song.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            {song.updatedAt && (
              <div>
                <span>🔄 Diubah: {new Date(song.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="song-actions">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
          className="btn-icon-sm"
          title="Edit"
        >✏️</button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          className="btn-icon-sm btn-danger"
          title="Hapus"
        >🗑️</button>
        <button
          onClick={handleAddClick}
          className="btn-icon-sm btn-success"
          title="Tambah ke Setlist"
          style={{ visibility: 'hidden' }}
        >➕</button>
      </div>
      {/* Show add button only on hover */}
      <style>{`
        .song-item:hover .btn-icon-sm.btn-success {
          visibility: visible !important;
        }
      `}</style>
      {showSetListPopup && (
        <div className="setlist-popup-overlay" style={{ zIndex: 9999 }} onClick={handleCancel}>
          <div className="setlist-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="setlist-popup-header">
              <h3>Pilih Setlist</h3>
              <button className="btn-close" onClick={handleCancel}>✕</button>
            </div>
            <div className="setlist-popup-body">
              {setLists.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', fontSize: '0.95rem' }}>Belum ada setlist.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {setLists.map(sl => (
                    <li key={sl.id} style={{ marginBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedSetLists.includes(sl.id)}
                          onChange={() => handleSetListToggle(sl.id)}
                        />
                        <span>{sl.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
              <button className="btn" onClick={handleCancel} title="Tutup">✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
