import React, { useState } from 'react';

export default function SongListItem({ song, isActive, onSelect, onEdit, onDelete, setLists, onAddToSetLists, onRemoveFromSetList }) {
  const [showSetListPopup, setShowSetListPopup] = useState(false);
  const [selectedSetLists, setSelectedSetLists] = useState([]);

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
    <div className={`song-item${isActive ? ' active' : ''}`} style={{ position: 'relative' }}>
      <div className="song-info" onClick={onSelect}>
        <div className="song-title">{song.title}</div>
        <div className="song-artist">{song.artist}</div>
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
              <button className="btn" onClick={handleCancel}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
