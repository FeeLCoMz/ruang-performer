import React, { useState, useMemo } from 'react';

const BulkAddSongsModal = ({ songs, currentSetList, onAddSongs, onAddNewSong, onCancel }) => {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Parse input and search for songs
  const handleSearch = async () => {
    const lines = inputText
      .split(/[\n,;|]/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }

    // Fetch lagu terbaru dari backend
    let latestSongs = songs;
    try {
      const res = await fetch('/api/songs');
      if (res.ok) {
        latestSongs = await res.json();
      }
    } catch (e) {
      // fallback pakai props songs
    }

    // Helper untuk normalisasi string
    const normalize = str => (str || '').toLowerCase().replace(/\s+/g, ' ').trim();

    const searchResults = lines.map(rawInput => {
      // Cari hanya berdasarkan judul lagu
      const searchTitle = rawInput.includes(' - ')
        ? rawInput.split(' - ')[0].trim() // Ambil bagian sebelum strip sebagai judul
        : rawInput.trim();
      const searchNorm = normalize(searchTitle);
      let found = latestSongs.find(song => {
        if (!song || !song.title) return false;
        const titleNorm = normalize(song.title);
        // Match jika judul persis, atau salah satu mengandung yang lain
        return (
          titleNorm === searchNorm ||
          titleNorm.includes(searchNorm) ||
          searchNorm.includes(titleNorm)
        );
      });

      // Cek apakah sudah ada di setlist
      let isInSetList = false;
      if (found && currentSetList?.songs) {
        isInSetList = currentSetList.songs.includes(found.id);
      }

      return {
        searchName: rawInput,
        displayName: rawInput.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        found: found || null,
        isInSetList
      };
    });

    setResults(searchResults);
    setSearched(true);
    setSelectedIds(new Set());
  };

  // Toggle selection untuk lagu yang ditemukan
  const toggleSongSelection = (songId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  // Select all found songs
  const selectAllFound = () => {
    const foundIds = results
      .filter(r => r.found && !r.isInSetList)
      .map(r => r.found.id);
    setSelectedIds(new Set(foundIds));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedIds(new Set());
  };

  // Get songs to add (found and not in setlist)
  const songsToAdd = results
    .filter(r => r.found && !r.isInSetList)
    .map(r => r.found.id)
    .filter(id => id); // Extra safety check

  // Get songs not found
  const songsNotFound = results.filter(r => !r.found);

  // Get songs already in setlist
  const songsAlreadyInSetList = results.filter(r => r.found && r.isInSetList);

  const handleAddSelected = () => {
    const selectedSongIds = Array.from(selectedIds);
    
    const pendingSongNames = results
      .filter(r => !r.found)
      .map(r => r.searchName);

    if (selectedSongIds.length === 0 && pendingSongNames.length === 0) {
      alert('Pilih lagu untuk ditambahkan atau buat pending song');
      return;
    }

    // Kirim keduanya ke parent
    onAddSongs({ ids: selectedSongIds, pendingNames: pendingSongNames });
    setInputText('');
    setResults([]);
    setSearched(false);
    setSelectedIds(new Set());
  };

  const handleAddNewSongClick = (songName) => {
    onAddNewSong(songName);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button
          onClick={onCancel}
          className="btn-close"
          style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
          aria-label="Tutup"
        >
          ✕
        </button>
        
        <div className="modal-header">
          <h2 style={{ marginBottom: 0 }}>📝 Tambah Lagu ke Setlist</h2>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Input Section */}
          <div className="form-group">
            <label htmlFor="songList">
              Daftar Lagu (satu per baris atau pisahkan dengan koma)
            </label>
            <textarea
              id="songList"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Contoh:\nLagu Pertama\nLagu Kedua\nLagu Ketiga\n\nAtau: Lagu Satu, Lagu Dua, Lagu Tiga`}
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '0.75rem',
                border: 'var(--border)',
                borderRadius: '0.375rem',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                resize: 'vertical',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={handleSearch}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.5rem' }}
            title="Cari lagu"
          >
            🔍 Cari Lagu
          </button>

          {/* Results Section */}
          {searched && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>
                Hasil Pencarian ({results.length})
              </h3>

              {results.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Tidak ada lagu ditemukan
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {results.map((result, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        border: `2px solid ${result.found ? result.isInSetList ? '#f59e0b' : selectedIds.has(result.found.id) ? '#10b981' : '#6b7280' : '#ef4444'}`,
                        borderRadius: '0.375rem',
                        backgroundColor: selectedIds.has(result.found?.id) ? 'rgba(16, 185, 129, 0.1)' : 'var(--card-hover)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {result.found && !result.isInSetList && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(result.found.id)}
                              onChange={() => toggleSongSelection(result.found.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              title="Pilih lagu untuk ditambahkan"
                            />
                          )}
                          {result.found ? (
                            <>
                              <span style={{ marginRight: '0.5rem' }}>
                                {result.isInSetList ? '⚠️' : '✓'}
                              </span>
                              {result.found.name}
                            </>
                          ) : (
                            <>
                              <span style={{ marginRight: '0.5rem' }}>⏳</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{result.displayName}</span>
                            </>
                          )}
                        </div>
                        {result.found && result.isInSetList && (
                          <div style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                            Sudah ada di setlist
                          </div>
                        )}
                        {!result.found && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Akan disimpan sebagai pending - dapat dibuat nanti
                          </div>
                        )}
                      </div>
                      {!result.found && (
                        <button
                          onClick={() => handleAddNewSongClick(result.displayName)}
                          className="btn"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                          title="Tambah lagu baru"
                        >
                          ➕ Tambah Baru
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {results.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '0.375rem',
                  fontSize: '0.9rem',
                  borderLeft: `4px solid var(--primary)`
                }}>
                  <div>✓ Ditemukan & bisa ditambah: <strong>{songsToAdd.length}</strong> (Dipilih: <strong>{selectedIds.size}</strong>)</div>
                  <div>⚠️ Sudah ada di setlist: <strong>{songsAlreadyInSetList.length}</strong></div>
                  <div>⏳ Menunggu ditambah (pending): <strong>{songsNotFound.length}</strong></div>
                  
                  {/* Quick action buttons */}
                  {songsToAdd.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={selectAllFound}
                        className="btn"
                        style={{
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.85rem',
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Pilih semua lagu yang ditemukan"
                      >
                        Pilih Semua ({songsToAdd.length})
                      </button>
                      <button
                        onClick={clearAllSelections}
                        className="btn"
                        style={{
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                        title="Batal pilihan"
                      >
                        Batal Pilihan
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            {searched && (selectedIds.size > 0 || songsNotFound.length > 0) && (
              <button
                onClick={handleAddSelected}
                className="btn btn-primary"
                style={{ flex: 1 }}
                title={`Tambah ${selectedIds.size + songsNotFound.length} lagu (${selectedIds.size} ditemukan + ${songsNotFound.length} pending)`}
              >
                ✓ Tambah {selectedIds.size + songsNotFound.length} Lagu
              </button>
            )}
            <button
              onClick={onCancel}
              className="btn"
              style={{ flex: 1 }}
              title="Batal"
            >
              ✕ Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddSongsModal;
