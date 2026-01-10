import React, { useState, useEffect } from 'react';
import YouTubeViewer from './YouTubeViewer';

const SongFormBaru = ({ song, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    youtubeId: '',
    key: '',
    tempo: '',
    style: '',
    lyrics: ''
  });
  const [errors, setErrors] = useState({});
  const [tapTimes, setTapTimes] = useState([]);
  const [bpm, setBpm] = useState(null);
  const [minimizeYouTube, setMinimizeYouTube] = useState(false);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  // ...existing code...

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        youtubeId: song.youtubeId || '',
        key: song.key || '',
        tempo: song.tempo || '',
        style: song.style || '',
        lyrics: song.lyrics || ''
      });
    }
  }, [song]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Judul lagu harus diisi';
    if (!formData.artist.trim()) newErrors.artist = 'Nama artis harus diisi';
    if (!formData.lyrics.trim()) newErrors.lyrics = 'Lirik lagu harus diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const songData = {
      title: formData.title.trim(),
      artist: formData.artist.trim(),
      youtubeId: formData.youtubeId.trim(),
      key: formData.key.trim(),
      tempo: formData.tempo.trim(),
      style: formData.style.trim(),
      lyrics: formData.lyrics.trim(),
      createdAt: song?.createdAt || new Date().toISOString()
    };
    onSave(songData);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const newTaps = [...tapTimes, now].slice(-8);
    setTapTimes(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(calculatedBpm);
      setFormData(prev => ({ ...prev, tempo: String(calculatedBpm) }));
    }

    setTimeout(() => {
      setTapTimes(prev => {
        if (prev.length > 0 && Date.now() - prev[prev.length - 1] > 3000) {
          return [];
        }
        return prev;
      });
    }, 3000);
  };

  const resetTapTempo = () => {
    setTapTimes([]);
    setBpm(null);
    setFormData(prev => ({ ...prev, tempo: '' }));
  };

  const extractFromChordtela = async () => {
    if (!importUrl.trim()) {
      setImportError('URL tidak boleh kosong');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      // Use backend API to fetch and bypass CORS
      const response = await fetch('/api/extract-chord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Gagal mengambil data dari URL`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.html) {
        throw new Error('Tidak ada konten HTML ditemukan dalam respons');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(data.html, 'text/html');
      parseChordtelaContent(doc);
    } catch (error) {
      setImportError(`Error: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const parseChordtelaContent = (doc) => {
    try {
      // Extract title and artist from meta tags or page content
      const titleElem = doc.querySelector('h1') || doc.querySelector('title');
      const title = titleElem?.textContent?.trim() || '';

      // Try to find artist info
      const artistElem = doc.querySelector('[class*="artist"], [data-artist]');
      const artist = artistElem?.textContent?.trim() || '';

      // Extract chord and lyrics from pre tag or div.chord-content
      const chordContent = 
        doc.querySelector('pre.chord') ||
        doc.querySelector('div.chord-content') ||
        doc.querySelector('div.content') ||
        doc.querySelector('article');

      if (!chordContent) {
        setImportError('Tidak dapat menemukan chord atau lirik di halaman ini');
        return;
      }

      const lyrics = chordContent.textContent?.trim() || '';

      if (!lyrics) {
        setImportError('Lirik tidak ditemukan di halaman');
        return;
      }

      // Update form data
      setFormData(prev => ({
        ...prev,
        title: title || prev.title,
        artist: artist || prev.artist,
        lyrics: lyrics
      }));

      setShowImportUrl(false);
      setImportUrl('');
      setImportError('');
    } catch (error) {
      setImportError(`Gagal memproses konten: ${error.message}`);
    }
  };

  // ...existing code...

  const insertTemplate = () => {
    const template = `{title: ${formData.title || 'Judul Lagu'}}\n{artist: ${formData.artist || 'Nama Artis'}}\n{key: C}\n{time: 4/4}\n{tempo: 120}\n{capo: 0}\n\n{start_of_intro}\n[C]Intro baris | [G]dengan chord |\n{end_of_intro}\n\n{start_of_verse}\n[C]Lirik baris | [G]pertama dengan | [Am]chord dan | [F]bar |\n[C]Lirik baris | [G]kedua dengan | [Am]chord dan | [F]bar |\n{end_of_verse}\n\n{start_of_pre-chorus}\n[Dm]Pre-chorus | [G]dengan lirik |\n{end_of_pre-chorus}\n\n{start_of_chorus}\n[C]Ini bagian | [G]chorus |\n[Am]Dengan lirik | [F]yang catchy |\n{end_of_chorus}\n\n{start_of_bridge}\n[Em]Bridge | [F]bagian |\n{end_of_bridge}\n\n{start_of_outro}\n[C]Outro | [G]bagian |\n{end_of_outro}`;
    setFormData(prev => ({ ...prev, lyrics: template }));
  };

  const insertStandardTemplate = () => {
    const template = `Title: ${formData.title || 'Judul Lagu'}\nArtist: ${formData.artist || 'Nama Artis'}\nKey: C\nTime: 4/4\nTempo: 120\nCapo: 0\n\nIntro:\nC              G\nIntro baris dengan chord\n\nVerse:\nC              G              Am             F\nLirik baris | pertama dengan | chord dan | bar |\nC              G              Am             F\nLirik baris | kedua dengan | chord dan | bar |\n\nPre-Chorus:\nDm             G\nPre-chorus dengan lirik\n\nChorus:\nC              G              Am             F\nIni bagian | chorus |\nAm             F\nDengan lirik | yang catchy |\n\nBridge:\nEm             F\nBridge bagian\n\nOutro:\nC              G\nOutro bagian`;
    setFormData(prev => ({ ...prev, lyrics: template }));
  };

  const convertStandardToChordPro = () => {
    const text = formData.lyrics;
    if (!text.trim()) return;

    const lines = text.split('\n');
    const result = [];
    let i = 0;

    // Regex untuk mendeteksi chord (dengan atau tanpa dash/modifier)
    const chordRegex = /-?[A-G][#b]?[mM]?[0-9]?[sus]?[dim]?[aug]?[add]?[0-9]*/g;
    
    // Function to check if a line is primarily chords
    const isChordLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      
      // Skip section labels
      if (/^(Intro|Verse|Chorus|Reff|Bridge|Outro|Int\.|Musik)\s*:/i.test(trimmed)) {
        return false;
      }
      
      // Remove all valid chords and check what's left
      const withoutChords = trimmed.replace(chordRegex, '').replace(/[\s\.\-]+/g, '');
      
      // If almost nothing left, it's a chord line
      return withoutChords.length < 3;
    };

    while (i < lines.length) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];

      // Check for section labels
      if (/^(Intro|Verse|Chorus|Reff|Bridge|Outro|Int\.|Musik)\s*:/i.test(currentLine.trim())) {
        result.push(currentLine);
        i++;
        continue;
      }

      // Check if current line is a chord line
      if (isChordLine(currentLine)) {
        // Check if next line exists and is lyrics (not chords, not empty)
        if (nextLine && nextLine.trim() && !isChordLine(nextLine)) {
          // This is chord + lyrics pattern
          const chordLine = currentLine;
          const lyricLine = nextLine;

          // Find all chords with their positions
          const chords = [];
          let match;
          const chordPattern = /-?[A-G][#b]?[mM]?[0-9]?[sus]?[dim]?[aug]?[add]?[0-9]*/g;
          
          while ((match = chordPattern.exec(chordLine)) !== null) {
            if (match[0].trim()) {
              chords.push({ 
                chord: match[0].trim(), 
                pos: match.index 
              });
            }
          }

          // Build converted line by inserting chords at their positions
          let convertedLine = '';
          let lyricPos = 0;
          
          for (const { chord, pos } of chords) {
            // Calculate corresponding position in lyrics (accounting for leading spaces)
            const targetPos = pos - (chordLine.length - chordLine.trimStart().length);
            
            if (targetPos > lyricPos) {
              // Add lyrics up to this position
              convertedLine += lyricLine.substring(lyricPos, Math.min(targetPos, lyricLine.length));
              lyricPos = targetPos;
            }
            
            // Add chord
            convertedLine += `[${chord}]`;
          }
          
          // Add remaining lyrics
          if (lyricPos < lyricLine.length) {
            convertedLine += lyricLine.substring(lyricPos);
          }

          result.push(convertedLine.trim());
          i += 2; // Skip both chord and lyric lines
        } else {
          // Chord line without lyrics (instrumental section)
          const chords = [];
          let match;
          const chordPattern = /-?[A-G][#b]?[mM]?[0-9]?[sus]?[dim]?[aug]?[add]?[0-9]*/g;
          
          while ((match = chordPattern.exec(currentLine)) !== null) {
            if (match[0].trim()) {
              chords.push(match[0].trim());
            }
          }
          
          if (chords.length > 0) {
            result.push(chords.map(c => `[${c}]`).join(' '));
          } else {
            result.push(currentLine);
          }
          i++;
        }
      } else {
        // Regular line (lyrics without chords above, or other content)
        result.push(currentLine);
        i++;
      }
    }

    setFormData(prev => ({ ...prev, lyrics: result.join('\n') }));
  };

   return (
    <>
      <div className="modal-overlay">
        <div className="modal-content song-form-modal" style={{ position: 'relative' }}>
          <button
            onClick={onCancel}
            className="btn-close"
            style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
            aria-label="Tutup"
          >✕</button>
          <div className="modal-header">
            <h2 style={{ marginBottom: 0 }}>{song ? '✏️ Edit Lagu' : '✨ Tambah Lagu Baru'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="song-form-grid">
            {/* Section 1: Basic Information */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label htmlFor="title">Judul Lagu *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={errors.title ? 'error' : ''}
                  placeholder="Masukkan judul lagu"
                  autoFocus
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flex: 1 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    const q = encodeURIComponent(`${formData.title} ${formData.artist} chord`);
                    window.open(`https://www.google.com/search?q=${q}`, '_blank');
                  }}
                  disabled={!formData.title && !formData.artist}
                  title="Cari chord dari Google"
                >
                  🔍 Chord
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    const q = encodeURIComponent(`${formData.title} ${formData.artist}`);
                    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
                  }}
                  disabled={!formData.title && !formData.artist}
                  title="Cari video dari YouTube"
                >
                  🎵 Video
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="artist">Nama Artis *</label>
                <input
                  type="text"
                  id="artist"
                  name="artist"
                  value={formData.artist}
                  onChange={handleChange}
                  className={errors.artist ? 'error' : ''}
                  placeholder="Masukkan nama artis"
                />
                {errors.artist && <span className="error-message">{errors.artist}</span>}
              </div>
            </div>

            {/* Section 2: Metadata (Key, Tempo, Style) */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="key">🎼 Key (Kunci)</label>
                <input
                  type="text"
                  id="key"
                  name="key"
                  value={formData.key}
                  onChange={handleChange}
                  placeholder="Contoh: C, D, Em, G#m"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="tempo">⏱️ Tempo (BPM)</label>
                <input
                  type="text"
                  id="tempo"
                  name="tempo"
                  value={formData.tempo}
                  onChange={handleChange}
                  placeholder="Contoh: 120"
                />
                <div className="tap-tempo-controls">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleTapTempo}
                  >
                    👆 TAP
                  </button>
                  {bpm && (
                    <>
                      <span className="bpm-display">{bpm} BPM</span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={resetTapTempo}
                      >
                        🔄
                      </button>
                    </>
                  )}
                  {!bpm && tapTimes.length > 0 && (
                    <span className="tap-hint">Ketuk {2 - tapTimes.length}x lagi</span>
                  )}
                  {!bpm && tapTimes.length === 0 && (
                    <span className="tap-hint">Ketuk irama lagu</span>
                  )}
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="style">🎵 Style</label>
                <input
                  type="text"
                  id="style"
                  name="style"
                  value={formData.style}
                  onChange={handleChange}
                  placeholder="Contoh: Pop, Rock, Jazz"
                />
              </div>
            </div>


            {/* Section 4: YouTube Video */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <label htmlFor="youtubeId">🎬 YouTube Video ID</label>
                  {formData.youtubeId && (
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => setMinimizeYouTube(!minimizeYouTube)}
                      title={minimizeYouTube ? 'Tampilkan video' : 'Sembunyikan video'}
                    >
                      {minimizeYouTube ? '🔍' : '➤'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  id="youtubeId"
                  name="youtubeId"
                  value={formData.youtubeId}
                  onChange={handleChange}
                  placeholder="Contoh: dQw4w9WgXcQ"
                />
                <small style={{ display: 'block', marginTop: '0.35rem' }}>ID adalah kode setelah "v=" di URL YouTube</small>
                {formData.youtubeId && !minimizeYouTube && (
                  <div className="youtube-viewer-section">
                    <YouTubeViewer videoId={formData.youtubeId} />
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Lyrics & Chord */}
            <div className="form-group">
              <div className="textarea-header">
                <label htmlFor="lyrics" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  Lirik & Chord *
                  <span className="help-popover-container">
                    <span className="help-icon" tabIndex="0">❓</span>
                    <span className="help-popover">
                      <strong>Format Pengisian:</strong>
                      <ul>
                        <li><b>ChordPro:</b> <code>[C]Lirik baris pertama</code></li>
                        <li><b>Standar:</b> Chord di atas, lirik di bawah</li>
                        <li><b>Bar:</b> <code>|</code> untuk pemisah bar</li>
                        <li><b>Notasi Angka:</b> <code>1 2 3 4 | 5 5 6 5</code></li>
                        <li><b>Notasi Balok:</b> <code>C4 D4 E4 F4</code></li>
                      </ul>
                    </span>
                  </span>
                </label>
                <div className="template-buttons">
                  <button type="button" onClick={insertTemplate} className="btn btn-sm">
                    📋 ChordPro
                  </button>
                  <button type="button" onClick={insertStandardTemplate} className="btn btn-sm">
                    📋 Standard
                  </button>
                  <button type="button" onClick={convertStandardToChordPro} className="btn btn-sm btn-primary">
                    🔄 Convert ke ChordPro
                  </button>
                  <button type="button" onClick={() => setShowImportUrl(true)} className="btn btn-sm btn-secondary">
                    🔗 Impor dari URL
                  </button>
                </div>
              </div>
              <textarea
                id="lyrics"
                name="lyrics"
                value={formData.lyrics}
                onChange={handleChange}
                className={errors.lyrics ? 'error' : ''}
                placeholder="Copy-paste dari situs lain atau gunakan format ChordPro [C]lirik..."
                rows={14}
              />
              {errors.lyrics && <span className="error-message">{errors.lyrics}</span>}
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                💾 {song ? 'Update Lagu' : 'Simpan Lagu'}
              </button>
              <button type="button" onClick={onCancel} className="btn" style={{ flex: 1 }}>
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Import from URL Modal */}
      {showImportUrl && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <button
              onClick={() => {
                setShowImportUrl(false);
                setImportUrl('');
                setImportError('');
              }}
              className="btn-close"
              style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
              aria-label="Tutup"
            >
              ✕
            </button>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>🔗 Impor dari URL</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="importUrl">URL Chordtela atau Situs Chord Lainnya</label>
                <input
                  type="url"
                  id="importUrl"
                  value={importUrl}
                  onChange={(e) => {
                    setImportUrl(e.target.value);
                    setImportError('');
                  }}
                  placeholder="https://chordtela.com/..."
                  autoFocus
                />
                <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                  Masukkan URL lengkap dari halaman chord lagu yang ingin diimpor
                </small>
              </div>
              {importError && (
                <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                  {importError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={extractFromChordtela}
                  disabled={isImporting}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {isImporting ? '⏳ Mengambil...' : '🔍 Impor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportUrl(false);
                    setImportUrl('');
                    setImportError('');
                  }}
                  className="btn"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SongFormBaru;