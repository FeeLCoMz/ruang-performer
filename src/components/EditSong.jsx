import React, { useState, useEffect } from 'react';

export default function EditSong({ songId, onBack, onSongUpdated, mode = 'edit' }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('C');
  const [tempo, setTempo] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');

  useEffect(() => {
    if (mode === 'edit' && songId) {
      setLoadingData(true);
      fetch(`/api/songs/${songId}`)
        .then(res => {
          if (!res.ok) throw new Error('Gagal mengambil data lagu');
          return res.json();
        })
        .then(data => {
          setTitle(data.title || '');
          setArtist(data.artist || '');
          setKey(data.key || 'C');
          setTempo(data.tempo || '');
          setStyle(data.style || '');
          setLyrics(data.lyrics || '');
          setYoutubeId(data.youtubeId || '');
          setLoadingData(false);
        })
        .catch(e => {
          setError(e.message || 'Gagal mengambil data lagu');
          setLoadingData(false);
        });
    } else if (mode === 'add') {
      setTitle('');
      setArtist('');
      setKey('C');
      setTempo('');
      setStyle('');
      setLyrics('');
      setYoutubeId('');
      setLoadingData(false);
    }
  }, [songId, mode]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      setError('Judul dan artist wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let res;
      if (mode === 'edit') {
        res = await fetch(`/api/songs/${songId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist, key, tempo, style, lyrics, youtubeId })
        });
        if (!res.ok) throw new Error('Gagal mengupdate lagu');
      } else {
        res = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist, key, tempo, style, lyrics, youtubeId })
        });
        if (!res.ok) throw new Error('Gagal menambah lagu');
      }
      if (onSongUpdated) onSongUpdated();
    } catch (e) {
      setError(e.message || (mode === 'edit' ? 'Gagal mengupdate lagu' : 'Gagal menambah lagu'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="main-content">Memuat data lagu...</div>;

  return (
    <div className="main-content">
      <button className="back-btn" onClick={onBack}>&larr; Kembali</button>
      <div className="section-title">{mode === 'edit' ? 'Edit Lagu' : 'Tambah Lagu Baru'}</div>
      <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
        <label>Judul Lagu
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="search-input" required />
        </label>
        <label>Artist
          <input type="text" value={artist} onChange={e => setArtist(e.target.value)} className="search-input" required />
        </label>
        <label>YouTube ID
          <input type="text" value={youtubeId} onChange={e => setYoutubeId(e.target.value)} className="search-input" placeholder="Contoh: dQw4w9WgXcQ" />
        </label>
        <label>Key
          <input type="text" value={key} onChange={e => setKey(e.target.value)} className="search-input" />
        </label>
        <label>Tempo
          <input type="number" value={tempo} onChange={e => setTempo(e.target.value)} className="search-input" />
        </label>
        <label>Style
          <input type="text" value={style} onChange={e => setStyle(e.target.value)} className="search-input" />
        </label>
        <label>Lirik/Chord
          <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} className="search-input" rows={8} style={{ fontFamily: 'monospace', resize: 'vertical' }} placeholder="[C] Contoh lirik dan chord..." />
        </label>
        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        <button type="submit" className="tab-btn" style={{ marginTop: 18 }} disabled={loading}>
          {loading ? 'Menyimpan...' : (mode === 'edit' ? 'Simpan Perubahan' : 'Simpan Lagu')}
        </button>
      </form>
    </div>
  );
}
