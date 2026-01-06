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

        <div className="form-youtube-row">
          <form onSubmit={handleSubmit} style={{ flex: 1 }}>
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
                </li>
                <li>Gunakan <code>|</code> untuk bar/ketukan, misal: <code>[C]Lirik | [G]bar berikut</code></li>
              </ul>
            </div>
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
          {formData.youtubeId && (
            <div className="youtube-viewer-section" style={{ marginLeft: '2rem', minWidth: 320, maxWidth: 480 }}>
              <YouTubeViewer videoId={formData.youtubeId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongForm;
