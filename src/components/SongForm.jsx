import React, { useState, useEffect } from 'react';
import YouTubeViewer from './YouTubeViewer';

const SongFormBaru = ({ song, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    youtubeId: '',
    lyrics: ''
  });
  const [errors, setErrors] = useState({});
  const [tapTimes, setTapTimes] = useState([]);
  const [bpm, setBpm] = useState(null);
  // ...existing code...

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        youtubeId: song.youtubeId || '',
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

   return (
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
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
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
            <div className="form-row" style={{ gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  const q = encodeURIComponent(`${formData.title} ${formData.artist} lirik`);
                  window.open(`https://www.google.com/search?q=${q}`, '_blank');
                }}
                disabled={!formData.title && !formData.artist}
              >
                🔍 Cari Lirik di Google
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  const q = encodeURIComponent(`${formData.title} ${formData.artist}`);
                  window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
                }}
                disabled={!formData.title && !formData.artist}
              >
                🎵 Cari Lagu di YouTube
              </button>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>🎵 Tap Tempo (Ketuk Irama)</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleTapTempo}
                    style={{ minWidth: '120px', fontSize: '1.1rem' }}
                  >
                    👆 TAP
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {bpm && (
                      <>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                          {bpm} BPM
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={resetTapTempo}
                        >
                          🔄 Reset
                        </button>
                      </>
                    )}
                    {!bpm && tapTimes.length > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Ketuk {2 - tapTimes.length} kali lagi...
                      </span>
                    )}
                    {!bpm && tapTimes.length === 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Ketuk tombol TAP mengikuti irama lagu
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="youtubeId">YouTube Video ID (Opsional)</label>
                <input
                  type="text"
                  id="youtubeId"
                  name="youtubeId"
                  value={formData.youtubeId}
                  onChange={handleChange}
                  placeholder="Contoh: dQw4w9WgXcQ"
                />
                <small>ID adalah kode setelah "v=" di URL YouTube</small>
                <div className="form-youtube-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 0 }}>
                  {formData.youtubeId && (
                    <div className="youtube-viewer-section" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <YouTubeViewer videoId={formData.youtubeId} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group">
              <div className="textarea-header">
                <label htmlFor="lyrics" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  Lirik & Chord *
                  <span className="help-popover-container">
                    <span className="help-icon" tabIndex="0">❓</span>
                    <span className="help-popover">
                      <strong>Format Pengisian Lirik, Chord, dan Notasi:</strong>
                      <ul>
                        <li><b>ChordPro:</b> <code>[C]Lirik baris pertama</code> (chord di dalam tanda [ ] sebelum kata)</li>
                        <li><b>Standar:</b> <code>C   G   Am   F</code> (chord di atas lirik, baris bawah liriknya)</li>
                        <li><b>Bar/ketukan:</b> Gunakan <code>|</code> untuk pemisah bar, contoh: <code>[C]Lirik | [G]bar berikut</code></li>
                        <li><b>Lirik multi-baris:</b> Pisahkan tiap baris dengan enter.</li>
                        <li><b>Notasi Angka:</b> <code>1 2 3 4 | 5 5 6 5</code> (spasi antar not, | untuk bar, . untuk rendah, ' untuk tinggi, - untuk panjang, m untuk minor)</li>
                        <li><b>Notasi Balok:</b> <code>C4 D4 E4 F4 | G4 G4 A4 G4</code> (format standar not balok, angka setelah huruf menunjukkan oktaf)</li>
                        <li><b>Contoh ChordPro:</b> <br /><code>[C]Ku ingin [G]selalu [Am]bersamamu [F]selamanya</code></li>
                        <li><b>Contoh Standar:</b><br /><code>C   G   Am   F<br />Ku ingin selalu bersamamu selamanya</code></li>
                        <li><b>Contoh Notasi Angka:</b><br /><code>1 2 3 4 | 5 5 6 5 | 4 3 2 1</code></li>
                        <li><b>Contoh Notasi Balok:</b><br /><code>C4 D4 E4 F4 | G4 G4 A4 G4</code></li>
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
                </div>
              </div>
              <textarea
                id="lyrics"
                name="lyrics"
                value={formData.lyrics}
                onChange={handleChange}
                className={errors.lyrics ? 'error' : ''}
                placeholder="Copy-paste dari situs lain (chord di atas lirik) atau gunakan format ChordPro [C]lirik..."
                rows={12}
              />
              {errors.lyrics && <span className="error-message">{errors.lyrics}</span>}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                💾 {song ? 'Update Lagu' : 'Simpan Lagu'}
              </button>
              <button type="button" onClick={onCancel} className="btn">
                Batal
              </button>
            </div>
          </form>
        
      </div>
    </div>
  );
};

export default SongFormBaru;