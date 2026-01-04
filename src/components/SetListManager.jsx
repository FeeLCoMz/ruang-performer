import React, { useState } from 'react';

const SetListManager = ({ 
  setLists, 
  songs, 
  onCreateSetList, 
  onDeleteSetList, 
  onAddSongToSetList, 
  onRemoveSongFromSetList,
  onSelectSetList 
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSetListName, setNewSetListName] = useState('');
  const [selectedSetListId, setSelectedSetListId] = useState(null);
  const [showSongSelector, setShowSongSelector] = useState(false);
  
  const handleCreateSetList = () => {
    if (newSetListName.trim()) {
      onCreateSetList(newSetListName.trim());
      setNewSetListName('');
      setShowCreateForm(false);
    }
  };
  
  const selectedSetList = setLists.find(sl => sl.id === selectedSetListId);
  const getSongById = (id) => songs.find(song => song.id === id);
  
  return (
    <div className="modal-overlay">
      <div className="modal-content setlist-modal">
        <div className="modal-header">
          <h2>📋 Set List Manager</h2>
          <button onClick={() => onSelectSetList(null)} className="btn-close">✕</button>
        </div>
        
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary btn-block"
        >
          + Buat Set List Baru
        </button>
        
        {showCreateForm && (
          <div className="create-form">
            <input
              type="text"
              placeholder="Nama Set List"
              value={newSetListName}
              onChange={(e) => setNewSetListName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSetList()}
            />
            <button onClick={handleCreateSetList} className="btn btn-success">
              Simpan
            </button>
            <button onClick={() => setShowCreateForm(false)} className="btn">
              Batal
            </button>
          </div>
        )}
        
        <div className="setlist-grid">
          <div className="setlist-list">
            <h4>Set Lists ({setLists.length})</h4>
            {setLists.length === 0 ? (
              <p className="empty-state">Belum ada set list</p>
            ) : (
              <ul>
                {setLists.map(setList => (
                  <li 
                    key={setList.id}
                    className={selectedSetListId === setList.id ? 'active' : ''}
                  >
                    <div 
                      className="setlist-item"
                      onClick={() => {
                        setSelectedSetListId(setList.id);
                        // Propagate selection to parent and close modal
                        if (onSelectSetList) onSelectSetList(setList.id);
                      }}
                    >
                      <span className="setlist-name">{setList.name}</span>
                      <span className="song-count">({setList.songs.length})</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus set list "${setList.name}"?`)) {
                          onDeleteSetList(setList.id);
                          if (selectedSetListId === setList.id) {
                            setSelectedSetListId(null);
                          }
                        }
                      }}
                      className="btn-delete"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {selectedSetList && (
            <div className="setlist-detail">
              <h4>{selectedSetList.name}</h4>
              
              <button 
                onClick={() => setShowSongSelector(!showSongSelector)}
                className="btn btn-secondary btn-block"
              >
                + Tambah Lagu
              </button>
              
              {showSongSelector && (
                <div className="song-selector">
                  <h5>Pilih Lagu</h5>
                  <ul>
                    {songs
                      .filter(song => !selectedSetList.songs.includes(song.id))
                      .map(song => (
                        <li key={song.id}>
                          <span>{song.title} - {song.artist}</span>
                          <button
                            onClick={() => {
                              onAddSongToSetList(selectedSetList.id, song.id);
                              setShowSongSelector(false);
                            }}
                            className="btn btn-sm"
                          >
                            +
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              
              <div className="setlist-songs">
                <h5>Lagu ({selectedSetList.songs.length})</h5>
                {selectedSetList.songs.length === 0 ? (
                  <p className="empty-state">Belum ada lagu</p>
                ) : (
                  <ul>
                    {selectedSetList.songs.map((songId, index) => {
                      const song = getSongById(songId);
                      return song ? (
                        <li key={songId}>
                          <span className="song-number">{index + 1}.</span>
                          <span>{song.title} - {song.artist}</span>
                          <button
                            onClick={() => onRemoveSongFromSetList(selectedSetList.id, songId)}
                            className="btn-delete"
                          >
                            ✕
                          </button>
                        </li>
                      ) : null;
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetListManager;
