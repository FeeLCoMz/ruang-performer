import React, { useEffect, useState } from 'react';


/**
 * Halaman untuk menampilkan daftar lagu dalam setlist yang dipilih.
 * Props:
 *   - setList: objek setlist yang dipilih (berisi id, name, songs, songKeys, dst)
 *   - songs: array semua lagu (untuk lookup detail lagu)
 *   - onRemoveSongFromSetList: function(setListId, songId) untuk hapus lagu dari setlist
 */
export default function SetListSongsPage({ setList, songs, onBack, onSongClick, onRemoveSongFromSetList, onSetListSongKey, onMoveSong, onSetListSongCompleted }) {
          // Handler for completed checkbox
          const handleCompletedChange = (songId, checked) => {
            if (typeof onSetListSongCompleted === 'function') {
              onSetListSongCompleted(setList.id, songId, checked);
            }
          };
      // Drag & drop reorder
      const [draggedIdx, setDraggedIdx] = useState(null);
      const handleDragStart = idx => setDraggedIdx(idx);
      const handleDragOver = e => e.preventDefault();
      const handleDrop = idx => {
        if (draggedIdx !== null && draggedIdx !== idx && typeof onMoveSong === 'function') {
          onMoveSong(setList.id, draggedIdx, idx);
        }
        setDraggedIdx(null);
      };
    // Handler untuk perubahan key tampil
    const handleKeyTampilChange = (songId, value) => {
      if (typeof onSetListSongKey === 'function') {
        onSetListSongKey(setList.id, songId, value);
      }
    };
  // Sorting state
  const [sortBy, setSortBy] = useState('no');
  const [sortOrder, setSortOrder] = useState('asc');
  // Detect dark mode from body class
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.body.classList.contains('dark-mode'));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  if (!setList) {
    return (
      <div className="setlist-songs-container" style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#e11d48', marginBottom: 24 }}>Setlist tidak ditemukan</h2>
        <button onClick={onBack} className="aksi-btn" style={{ background: '#6366f1', color: '#fff', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 16 }}>← Kembali</button>
      </div>
    );
  }

  // Ambil detail lagu dari setList.songs (bisa id atau string pending)
  const getSongDetail = (songIdOrName) => {
    if (!songIdOrName) return null;
    if (typeof songIdOrName === 'string') {
      const found = songs.find(s => s.id === songIdOrName);
      if (found) return found;
      // Jika tidak ditemukan, anggap pending
      return { id: songIdOrName, title: songIdOrName, artist: '', isPending: true };
    }
    return null;
  };

  const songListRaw = Array.isArray(setList.songs) ? setList.songs.map(getSongDetail) : [];

  // Sorting logic
  const sortFn = (a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'no':
        valA = a._idx;
        valB = b._idx;
        break;
      case 'title':
        valA = (a.title || '').toLowerCase();
        valB = (b.title || '').toLowerCase();
        break;
      case 'artist':
        valA = (a.artist || '').toLowerCase();
        valB = (b.artist || '').toLowerCase();
        break;
      case 'key':
        valA = (a.key || '').toLowerCase();
        valB = (b.key || '').toLowerCase();
        break;
      case 'tempo':
        valA = parseInt(a.tempo, 10) || 0;
        valB = parseInt(b.tempo, 10) || 0;
        break;
      case 'style':
        valA = (a.style || '').toLowerCase();
        valB = (b.style || '').toLowerCase();
        break;
      case 'status':
        valA = a.isPending ? 1 : 0;
        valB = b.isPending ? 1 : 0;
        break;
      default:
        valA = a._idx;
        valB = b._idx;
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  };
  // Tambahkan index untuk sort by nomor
  const songList = songListRaw.map((s, i) => ({ ...s, _idx: i }));
  songList.sort(sortFn);

  // Style theme (now handled by CSS variables or classes)

  // Helper untuk render icon sort
  const renderSortIcon = (col) => {
    if (sortBy !== col) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="setlist-songs-container">
      <div className="setlist-songs-header">
        <div className="left">
          <button onClick={onBack} className="aksi-btn" style={{ background: '#6366f1', color: '#fff', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 16 }}>← Kembali</button>
          <h2 style={{ margin: 0, fontSize: 28 }}>{setList.name}</h2>
        </div>
        <div>
          {(() => {
            const completedCount = songList.filter(song => setList.completedSongs && song.id && setList.completedSongs[song.id]).length;
            return (
              <>
                Total: <span style={{ fontWeight: 700 }}>{songList.length}</span> lagu
                {typeof completedCount === 'number' && (
                  <>
                    {' • '}
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ {completedCount}</span> selesai
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>
      <div className="setlist-songs-table-container">
        <table className="setlist-songs-table">
          <thead>
            <tr>
              <th onClick={() => {
                if (sortBy === 'no') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('no');
              }}>No{renderSortIcon('no')}</th>
              <th onClick={() => {
                if (sortBy === 'title') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('title');
              }}>Judul{renderSortIcon('title')}</th>
              <th onClick={() => {
                if (sortBy === 'artist') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('artist');
              }}>Artis{renderSortIcon('artist')}</th>
              <th onClick={() => {
                if (sortBy === 'key') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('key');
              }}>Key{renderSortIcon('key')}</th>
              <th>Key Tampil</th>
              <th onClick={() => {
                if (sortBy === 'tempo') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('tempo');
              }}>Tempo{renderSortIcon('tempo')}</th>
              <th onClick={() => {
                if (sortBy === 'style') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('style');
              }}>Style{renderSortIcon('style')}</th>
              {/* Status column removed */}
              <th>Completed</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {songList.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 32 }}>Belum ada lagu di setlist ini.</td></tr>
            ) : songList.map((song, idx) => {
                const isCompleted = setList.completedSongs && song.id && setList.completedSongs[song.id];
                return (
                  <tr
                    key={song.id || idx}
                    className={[
                      song.isPending ? 'pending' : idx % 2 === 0 ? 'even' : 'odd',
                      draggedIdx === idx ? 'dragged' : '',
                    ].join(' ')}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                  >
                    <td>
                      <span style={{ fontWeight: 700 }}>{song._idx + 1}</span>
                      <span className="drag-handle">☰</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {song.isPending ? (
                        <span style={{ color: '#f59e0b' }}>{song.title}</span>
                      ) : (
                        <button
                          onClick={() => onSongClick && onSongClick(song.id)}
                          className="song-title-btn"
                        >
                          {song.title}
                        </button>
                      )}
                    </td>
                    <td>{song.artist}</td>
                    <td style={{ fontWeight: 600 }}>{song.key}</td>
                    {/* Key Tampil column, editable */}
                    <td>
                      {song.id ? (
                        <input
                          type="text"
                          value={setList.songKeys && setList.songKeys[song.id] ? setList.songKeys[song.id] : ''}
                          onChange={e => handleKeyTampilChange(song.id, e.target.value)}
                          className="key-tampil-input"
                          maxLength={8}
                          placeholder="Key"
                        />
                      ) : '-'}
                    </td>
                    <td style={{ color: '#0ea5e9' }}>{song.tempo}</td>
                    <td>{song.style}</td>
                    <td>
                      {song.id ? (
                        <input
                          type="checkbox"
                          checked={!!isCompleted}
                          onChange={e => handleCompletedChange(song.id, e.target.checked)}
                          title="Tandai lagu sudah tampil"
                        />
                      ) : ''}
                    </td>
                    <td>
                      {!song.isPending && (
                        <>
                          <button
                            title="Edit Lagu"
                            className="aksi-btn"
                            onClick={() => onSongClick && onSongClick(song.id)}
                          >
                            ✏️
                          </button>
                          <button
                            title="Hapus dari Setlist"
                            className="aksi-btn delete"
                            onClick={() => {
                              if (window.confirm('Hapus lagu ini dari setlist?')) {
                                if (typeof onRemoveSongFromSetList === 'function') {
                                  onRemoveSongFromSetList(setList.id, song.id);
                                }
                              }
                            }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
