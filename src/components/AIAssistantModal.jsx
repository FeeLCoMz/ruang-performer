import React, { useState } from 'react';

const AIAssistantModal = ({ formData, onClose, onApplySuggestions }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState({});

  const searchSongInfo = async () => {
    if (!formData.title.trim() || !formData.artist.trim()) {
      setError('Masukkan judul lagu dan nama artis terlebih dahulu');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestions(null);

    try {
      // Call backend API to search song info
      const response = await fetch('/api/ai/song-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          artist: formData.artist
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Log debug info if available
      if (data.debug) {
        console.log('Song search debug info:', data.debug);
        if (data.debug.youtubeKeyMissing) {
          setError('⚠️ YouTube API key belum diatur. Baca ENV_SETUP.md untuk setup.');
          setLoading(false);
          return;
        }
        if (data.debug.youtubeError) {
          console.warn('YouTube search error:', data.debug.youtubeError);
        }
      }
      

      setSuggestions(data);

      // Initialize selected suggestions (don't auto-select if no results)
      const selected = {};
      if (data.key && formData.key !== data.key) selected.key = data.key;
      if (data.tempo && formData.tempo !== data.tempo) selected.tempo = data.tempo;
      if (data.style && formData.style !== data.style) selected.style = data.style;
      if (data.instrument && formData.instrument !== data.instrument) selected.instrument = data.instrument;
      if (data.youtubeId && formData.youtubeId !== data.youtubeId) selected.youtubeId = data.youtubeId;
      setSelectedSuggestions(selected);
      
      // Check if we got any results
      if (!data.key && !data.tempo && !data.style && !data.youtubeId) {
        setError('Tidak ada hasil ditemukan untuk lagu ini. Coba dengan judul/artis yang berbeda.');
      }
    } catch (err) {
      setError(err.message || 'Gagal mencari informasi lagu. Pastikan judul dan artis benar.');
      console.error('AI search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuggestion = (field) => {
    setSelectedSuggestions(prev => {
      const newSelected = { ...prev };
      if (newSelected[field]) {
        delete newSelected[field];
      } else if (suggestions && suggestions[field]) {
        newSelected[field] = suggestions[field];
      }
      return newSelected;
    });
  };

  const handleApply = () => {
    onApplySuggestions(selectedSuggestions);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <button
          onClick={onClose}
          className="btn-close"
          style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
          aria-label="Tutup"
        >
          ✕
        </button>

        <div className="modal-header">
          <h2 style={{ marginBottom: 0 }}>🤖 AI Assistant - Cari Info Lagu</h2>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Song Info Display */}
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--card-hover)',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <strong>Mencari untuk:</strong>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              fontSize: '0.95rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Judul: </span>
                <strong>{formData.title || '-'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Artis: </span>
                <strong>{formData.artist || '-'}</strong>
              </div>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={searchSongInfo}
            disabled={loading || !formData.title.trim() || !formData.artist.trim()}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.5rem' }}
          >
            {loading ? '⏳ Mencari...' : '🔍 Cari Informasi Lagu'}
          </button>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderLeft: '4px solid #ef4444',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              color: '#ef4444',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {/* Results */}
          {suggestions && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>
                ✓ Hasil Pencarian
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Key Suggestion */}
                {suggestions.key && (
                  <div
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: selectedSuggestions.key ? 'rgba(16, 185, 129, 0.1)' : 'var(--card)'
                    }}
                  >
                    <input
                      type="checkbox"
                      id="key-suggestion"
                      checked={!!selectedSuggestions.key}
                      onChange={() => handleToggleSuggestion('key')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="key-suggestion" style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                      <strong>🎼 Key (Kunci):</strong> <span style={{ fontSize: '1.1em', fontFamily: 'monospace' }}>{suggestions.key}</span>
                    </label>
                  </div>
                )}

                {/* Tempo Suggestion */}
                {suggestions.tempo && (
                  <div
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: selectedSuggestions.tempo ? 'rgba(16, 185, 129, 0.1)' : 'var(--card)'
                    }}
                  >
                    <input
                      type="checkbox"
                      id="tempo-suggestion"
                      checked={!!selectedSuggestions.tempo}
                      onChange={() => handleToggleSuggestion('tempo')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="tempo-suggestion" style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                      <strong>⏱️ Tempo (BPM):</strong> <span style={{ fontSize: '1.1em', fontFamily: 'monospace' }}>{suggestions.tempo}</span>
                    </label>
                  </div>
                )}

                {/* Style Suggestion */}
                {suggestions.style && (
                  <div
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: selectedSuggestions.style ? 'rgba(16, 185, 129, 0.1)' : 'var(--card)'
                    }}
                  >
                    <input
                      type="checkbox"
                      id="style-suggestion"
                      checked={!!selectedSuggestions.style}
                      onChange={() => handleToggleSuggestion('style')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="style-suggestion" style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                      <strong>🎵 Style:</strong> <span style={{ fontSize: '1.1em', fontFamily: 'monospace' }}>{suggestions.style}</span>
                    </label>
                  </div>
                )}

                {/* Instrument Suggestion */}
                {suggestions.instrument && (
                  <div
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: selectedSuggestions.instrument ? 'rgba(16, 185, 129, 0.1)' : 'var(--card)'
                    }}
                  >
                    <input
                      type="checkbox"
                      id="instrument-suggestion"
                      checked={!!selectedSuggestions.instrument}
                      onChange={() => handleToggleSuggestion('instrument')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="instrument-suggestion" style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                      <strong>🎹 Instrumen:</strong> <span style={{ fontSize: '1.1em', fontFamily: 'monospace' }}>{suggestions.instrument}</span>
                    </label>
                  </div>
                )}

                {/* YouTube Suggestion */}
                {suggestions.youtubeId && (
                  <div
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: selectedSuggestions.youtubeId ? 'rgba(16, 185, 129, 0.1)' : 'var(--card)'
                    }}
                  >
                    <input
                      type="checkbox"
                      id="youtube-suggestion"
                      checked={!!selectedSuggestions.youtubeId}
                      onChange={() => handleToggleSuggestion('youtubeId')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="youtube-suggestion" style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                      <strong>🎬 YouTube Video ID:</strong> <span style={{ fontSize: '0.9em', fontFamily: 'monospace', color: 'var(--primary)' }}>{suggestions.youtubeId}</span>
                    </label>
                  </div>
                )}

                {/* Chord Resources */}
                {suggestions.chordLinks && suggestions.chordLinks.length > 0 && (
                  <div style={{
                    padding: '1rem',
                    border: '2px dashed var(--primary)',
                    borderRadius: '0.375rem',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '0.75rem' }}>🎸 Sumber Chord:</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {suggestions.chordLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: 'var(--card-hover)',
                            borderRadius: '0.375rem',
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'var(--card)';
                            e.target.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'var(--card-hover)';
                            e.target.style.textDecoration = 'none';
                          }}
                        >
                          <span>🔗</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {link.title} ({link.site})
                          </span>
                          <span>→</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results Message */}
                {!suggestions.key && !suggestions.tempo && !suggestions.style && !suggestions.youtubeId && !suggestions.chordLinks && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--card-hover)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                  }}>
                    Tidak menemukan saran untuk lagu ini. Silakan isi secara manual atau cek sumber lagu.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '0.375rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '1rem',
            lineHeight: '1.5'
          }}>
            <strong>💡 Tips:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>
              <li>Centang saran yang ingin diterapkan ke form</li>
              <li>Gunakan sumber chord untuk melengkapi lirik</li>
              <li>Video ID otomatis ditampilkan jika tersedia</li>
              <li>Anda tetap bisa mengubah nilai setelah diterapkan</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {suggestions && (
              <button
                onClick={handleApply}
                className="btn btn-primary"
                style={{ flex: 1 }}
                title="Terapkan saran yang dipilih ke form"
              >
                ✓ Terapkan Saran
              </button>
            )}
            <button
              onClick={onClose}
              className="btn"
              style={{ flex: 1 }}
              title="Tutup"
            >
              ✕ Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;
