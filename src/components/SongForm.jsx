import React, { useState, useEffect } from 'react';
import YouTubeViewer from './YouTubeViewer';

const SongForm = ({ song, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    youtubeId: '',
    lyrics: '',
    melody: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        youtubeId: song.youtubeId || '',
        lyrics: song.lyrics || '',
        melody: song.melody || ''
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
      melody: formData.melody.trim(),
      createdAt: song?.createdAt || new Date().toISOString()
    };

    onSave(songData);
  };

  const insertTemplate = () => {
    const template = `{title: ${formData.title || 'Judul Lagu'}}
{artist: ${formData.artist || 'Nama Artis'}}
{key: C}
{time: 4/4}
{tempo: 120}
{capo: 0}

{start_of_verse}
[C]Lirik baris | [G]pertama dengan | [Am]chord dan | [F]bar |
[C]Lirik baris | [G]kedua dengan | [Am]chord dan | [F]bar |
{end_of_verse}

{start_of_chorus}
[C]Ini bagian | [G]chorus |
[Am]Dengan lirik | [F]yang catchy |
{end_of_chorus}`;

    setFormData(prev => ({ ...prev, lyrics: template }));
  };

  const insertStandardTemplate = () => {
    const template = `Title: ${formData.title || 'Judul Lagu'}
Artist: ${formData.artist || 'Nama Artis'}
Key: C
Time: 4/4
Tempo: 120
Capo: 0

C              G              Am             F
Lirik baris | pertama dengan | chord dan | bar |

C              G              Am             F
Lirik baris | kedua dengan | chord dan | bar |`;

    setFormData(prev => ({ ...prev, lyrics: template }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content song-form-modal">
        <div className="modal-header">
          <h2>{song ? '✏️ Edit Lagu' : '✨ Tambah Lagu Baru'}</h2>
          <button onClick={onCancel} className="btn-close">✕</button>
        </div>

        {/* YouTube Viewer Section */}
        {formData.youtubeId && (
          <div className="youtube-viewer-section">
            <YouTubeViewer videoId={formData.youtubeId} />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Judul Lagu *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? 'error' : ''}
              placeholder="Masukkan judul lagu"
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
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

          <div className="form-group">
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
          </div>

          <div className="form-group">
            <div className="textarea-header">
              <label htmlFor="lyrics">Lirik & Chord *</label>
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

          <div className="form-group">
            <label htmlFor="melody">Melodi Not Angka (Opsional)</label>
            <textarea
              id="melody"
              name="melody"
              value={formData.melody}
              onChange={handleChange}
              placeholder="Masukkan melodi dalam not angka, contoh: 1 2 3 4 | 5 5 6 5 | 4 3 2 1 |\nGunakan | untuk pemisah bar, spasi untuk pemisah not\nTambahkan . setelah angka untuk not rendah (1.), apostrof untuk not tinggi (1')\nTambahkan - untuk not panjang (1--), m untuk minor (1m)"
              rows={6}
            />
            <small>Format: 1 2 3 4 | 5 5 6 5 (gunakan spasi antar not, | untuk bar, . untuk rendah, ' untuk tinggi)</small>
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

export default SongForm;
