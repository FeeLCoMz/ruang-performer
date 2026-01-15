import React, { useState, useMemo } from 'react';

const BatchProcessingModal = ({ songs, currentSetList, onClose, onApplySuggestions }) => {
  const [selectedSongIds, setSelectedSongIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Get current setlist songs (including pending songs)
  const setlistSongs = useMemo(() => {
    if (!currentSetList?.songs || !Array.isArray(currentSetList.songs)) return [];
    return currentSetList.songs
      .map(item => {
        if (typeof item === 'string') {
          // Check if it's an actual song ID (exists in songs)
          const song = songs.find(s => s.id === item);
          if (song && song.title) {
            return song;
          }
          // If not found, it's a pending song (just a song name/title)
          return {
            id: item,
            title: item,
            artist: '',
            isPending: true
          };
        }
        return null;
      })
      .filter(song => song && song.title); // Filter out undefined/deleted songs (check title property)
  }, [currentSetList, songs]);

  // Initialize selected songs with all songs from setlist
  const initializeSelection = () => {
    const ids = new Set(setlistSongs.map(s => s.id));
    setSelectedSongIds(ids);
  };

  React.useEffect(() => {
    initializeSelection();
  }, [setlistSongs]);

  const toggleSongSelection = (songId) => {
    const newSelected = new Set(selectedSongIds);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongIds(newSelected);
  };

  const selectAllSongs = () => {
    setSelectedSongIds(new Set(setlistSongs.map(s => s.id)));
  };

  const clearAllSongs = () => {
    setSelectedSongIds(new Set());
  };

  const handleBatchProcess = async () => {
    if (selectedSongIds.size === 0) {
      setError('Silakan pilih minimal 1 lagu untuk diproses');
      return;
    }

    const selectedSongs = Array.from(selectedSongIds)
      .map(id => setlistSongs.find(s => s.id === id))
      .filter(Boolean);

    setProcessing(true);
    setError('');
    setProgress({ current: 0, total: selectedSongs.length });
    setResults(null);

    try {
      // Prepare request data
      const requestData = selectedSongs.map(song => ({
        songId: song.id,
        title: song.title || '',
        artist: song.artist || '',
        isPending: song.isPending || false
      }));

      // Call batch-search API
      const response = await fetch('/api/ai/batch-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: requestData })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Batch processing failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setProgress({ current: data.totalProcessed, total: selectedSongs.length });
        
        // Map results with original song info
        const resultsWithUI = data.results.map(result => ({
          ...result,
          originalSong: selectedSongs.find(s => s.id === result.songId),
          selected: true
        }));

        setResults(resultsWithUI);
      } else {
        setError(data.error || 'Batch processing gagal');
      }
    } catch (err) {
      console.error('Batch processing error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyResults = () => {
    if (!results) return;

    const applicableSuggestions = results
      .filter(r => r.selected && !r.error)
      .map(r => ({
        songId: r.songId,
        title: r.title,
        artist: r.artist,
        key: r.key,
        tempo: r.tempo,
        style: r.style,
        youtubeId: r.youtubeId,
        chordLinks: r.chordLinks
      }));

    if (applicableSuggestions.length > 0) {
      onApplySuggestions(applicableSuggestions);
      onClose();
    }
  };

  const toggleResultSelection = (index) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index].selected = !newResults[index].selected;
      return newResults;
    });
  };

  return (
    <div style={styles.modal}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🔄 Batch Processing - Update Metadata</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            disabled={processing}
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div style={styles.body}>
          {!results ? (
            // Song Selection Phase
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Pilih Lagu untuk Diproses ({selectedSongIds.size}/{setlistSongs.length})
              </h3>
              
              {setlistSongs.length === 0 ? (
                <p style={styles.emptyMessage}>Setlist kosong. Tambahkan lagu terlebih dahulu.</p>
              ) : (
                <>
                  <div style={styles.songList}>
                    {setlistSongs.map((song, idx) => (
                      <div
                        key={song.id}
                        style={{
                          ...styles.songItem,
                          backgroundColor: selectedSongIds.has(song.id) ? '#1e3a2f' : 'transparent',
                          borderLeft: song.isPending ? '3px solid #ff922b' : '3px solid #666'
                        }}
                        onClick={() => toggleSongSelection(song.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSongIds.has(song.id)}
                          onChange={() => {}}
                          style={styles.checkbox}
                        />
                        <div style={styles.songInfo}>
                          <div style={styles.songName}>
                            {song.isPending && '⏳ '}
                            {song.title}
                          </div>
                          <div style={styles.songMeta}>
                            {song.artist ? `${song.artist}` : song.isPending ? 'Lagu Pending' : 'Unknown Artist'}
                            {song.key ? ` • Key: ${song.key}` : ''}
                            {song.tempo ? ` • ${song.tempo} BPM` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={styles.quickActions}>
                    <button
                      onClick={selectAllSongs}
                      style={styles.actionButton}
                      disabled={processing}
                    >
                      ✓ Pilih Semua
                    </button>
                    <button
                      onClick={clearAllSongs}
                      style={styles.actionButton}
                      disabled={processing}
                    >
                      ✗ Batal Semua
                    </button>
                  </div>

                  {error && <p style={styles.error}>{error}</p>}
                </>
              )}
            </div>
          ) : (
            // Results Phase
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                Hasil Batch Processing ({results.filter(r => r.selected && !r.error).length}/{results.length})
              </h3>

              <div style={styles.resultsList}>
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.resultItem,
                      backgroundColor: result.error ? '#3a1e1e' : result.selected ? '#1e3a2f' : '#2a2a2a',
                      borderLeft: result.error ? '4px solid #ff6b6b' : result.isPending ? '4px solid #ff922b' : result.selected ? '4px solid #51cf66' : '4px solid #666'
                    }}
                    onClick={() => !result.error && toggleResultSelection(idx)}
                  >
                    {!result.error && (
                      <input
                        type="checkbox"
                        checked={result.selected}
                        onChange={() => {}}
                        style={styles.checkbox}
                      />
                    )}

                    <div style={styles.resultInfo}>
                      <div style={styles.resultTitle}>
                        {result.isPending && '⏳ '}
                        {result.title}
                      </div>
                      <div style={styles.resultMeta}>
                        {result.artist ? <span>{result.artist}</span> : result.isPending ? <span style={{color: '#ff922b'}}>Lagu Pending</span> : <span>Unknown Artist</span>}
                        {result.key && <span>Key: {result.key}</span>}
                        {result.tempo && <span>{result.tempo} BPM</span>}
                        {result.style && <span>{result.style}</span>}
                      </div>

                      {result.error && (
                        <div style={styles.resultError}>⚠️ {result.error}</div>
                      )}

                      {result.youtubeId && !result.error && (
                        <div style={styles.resultLinks}>
                          <a href={`https://youtube.com/watch?v=${result.youtubeId}`} target="_blank" rel="noopener noreferrer" style={styles.link}>
                            🎥 YouTube
                          </a>
                        </div>
                      )}

                      {result.chordLinks && Array.isArray(result.chordLinks) && result.chordLinks.length > 0 && !result.error && (
                        <div style={styles.resultLinks}>
                          {result.chordLinks.slice(0, 2).map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={styles.link}>
                              🎸 Chord
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {error && <p style={styles.error}>{error}</p>}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {processing && (
          <div style={styles.progressSection}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                }}
              />
            </div>
            <p style={styles.progressText}>
              Memproses... {progress.current}/{progress.total} lagu
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          {!results ? (
            <>
              <button
                onClick={handleBatchProcess}
                style={styles.primaryButton}
                disabled={processing || selectedSongIds.size === 0}
              >
                {processing ? '⏳ Memproses...' : '🔍 Cari Metadata'}
              </button>
              <button
                onClick={onClose}
                style={styles.secondaryButton}
                disabled={processing}
              >
                Batal
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleApplyResults}
                style={styles.primaryButton}
                disabled={results.filter(r => r.selected && !r.error).length === 0}
              >
                ✓ Terapkan {results.filter(r => r.selected && !r.error).length} Hasil
              </button>
              <button
                onClick={() => {
                  setResults(null);
                  setProgress({ current: 0, total: 0 });
                }}
                style={styles.secondaryButton}
              >
                ← Kembali
              </button>
              <button
                onClick={onClose}
                style={styles.secondaryButton}
              >
                Tutup
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#e0e0e0'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #333'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px'
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginTop: 0,
    marginBottom: '12px',
    color: '#51cf66'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#888',
    padding: '20px',
    fontSize: '14px'
  },
  songList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  songItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '1px solid #333',
    transition: 'all 0.2s'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    flexShrink: 0
  },
  songInfo: {
    flex: 1,
    minWidth: 0
  },
  songName: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  songMeta: {
    fontSize: '12px',
    color: '#999',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  actionButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '6px',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  resultItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  resultInfo: {
    flex: 1,
    minWidth: 0
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '4px'
  },
  resultMeta: {
    fontSize: '12px',
    color: '#bbb',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '6px'
  },
  resultError: {
    fontSize: '12px',
    color: '#ff6b6b',
    marginBottom: '6px'
  },
  resultLinks: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  link: {
    fontSize: '12px',
    color: '#51cf66',
    textDecoration: 'none',
    padding: '4px 8px',
    backgroundColor: '#2a3a2a',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  progressSection: {
    padding: '12px 20px',
    borderTop: '1px solid #333',
    backgroundColor: '#0f0f0f'
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#51cf66',
    transition: 'width 0.3s'
  },
  progressText: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
    textAlign: 'center'
  },
  footer: {
    display: 'flex',
    gap: '8px',
    padding: '16px 20px',
    borderTop: '1px solid #333',
    backgroundColor: '#0f0f0f'
  },
  primaryButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#51cf66',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  secondaryButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#333',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  error: {
    color: '#ff6b6b',
    fontSize: '13px',
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#3a1e1e',
    borderRadius: '4px',
    borderLeft: '3px solid #ff6b6b'
  }
};

export default BatchProcessingModal;
