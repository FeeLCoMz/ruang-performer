
import React, { useState, useEffect } from 'react';
import YouTubeViewer from '../components/YouTubeViewer.jsx';

export default function EditSongPage({ songId, mode = 'edit', onBack, onSongUpdated }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('C');
  const [tempo, setTempo] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [instruments, setInstruments] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(mode === 'edit');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showAiConfirm, setShowAiConfirm] = useState(false);
  const [aiConfirmFields, setAiConfirmFields] = useState({});

  const handleAIAutofill = async () => {
    if (!title.trim()) {
      setError('Isi judul lagu terlebih dahulu.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/song-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), artist: artist.trim() })
      });
      if (!res.ok) throw new Error('Gagal mendapatkan info AI');
      const data = await res.json();
      setAiResult(data);
      setAiConfirmFields({
        key: !!data.key,
        tempo: !!data.tempo,
        style: !!data.style,
        youtubeId: !!data.youtubeId,
        lyrics: !!data.lyrics,
        instruments: Array.isArray(data.instruments) && data.instruments.length > 0,
      });
      setShowAiConfirm(true);
    } catch (e) {
      setError(e.message || 'Gagal autofill AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiFields = () => {
    if (!aiResult) return;
    if (aiConfirmFields.key && aiResult.key) setKey(aiResult.key);
    if (aiConfirmFields.tempo && aiResult.tempo) setTempo(aiResult.tempo);
    if (aiConfirmFields.style && aiResult.style) setStyle(aiResult.style);
    if (aiConfirmFields.youtubeId && aiResult.youtubeId) setYoutubeId(aiResult.youtubeId);
    if (aiConfirmFields.lyrics && aiResult.lyrics) setLyrics(aiResult.lyrics);
    if (aiConfirmFields.instruments && Array.isArray(aiResult.instruments)) setInstruments(aiResult.instruments);
    setShowAiConfirm(false);
    setAiResult(null);
  };

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
          setInstruments(Array.isArray(data.instruments) ? data.instruments : []);
          setTimestamps(Array.isArray(data.timestamps) ? data.timestamps : []);
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
      setTimestamps([]);
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
          body: JSON.stringify({ title, artist, key, tempo, style, lyrics, youtubeId, timestamps })
        });
        if (!res.ok) throw new Error('Gagal mengupdate lagu');
      } else {
        res = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist, key, tempo, style, lyrics, youtubeId, timestamps })
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
        <button type="button" className="tab-btn" style={{ marginBottom: 16, float: 'right' }} onClick={handleAIAutofill} disabled={aiLoading || !title.trim()}>
          {aiLoading ? 'Mengisi Otomatis...' : 'Isi Otomatis (AI)'}
        </button>
        <label>Judul Lagu
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="search-input" required />
        </label>
        <label>Artist
          <input type="text" value={artist} onChange={e => setArtist(e.target.value)} className="search-input" required />
        </label>
        <label>YouTube ID
          <input
            type="text"
            value={youtubeId}
            onChange={e => {
              const val = e.target.value;
              // Regex to extract YouTube video ID from various URL formats
              const ytMatch = val.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)?)([\w-]{11})/i);
              if (ytMatch) {
                setYoutubeId(ytMatch[1]);
              } else {
                setYoutubeId(val);
              }
            }}
            className="search-input"
            placeholder="Contoh: dQw4w9WgXcQ atau URL YouTube"
          />
        </label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <label style={{ flex: 1 }}>Key
            <input type="text" value={key} onChange={e => setKey(e.target.value)} className="search-input" style={{ marginBottom: 0 }} />
          </label>
          <label style={{ flex: 1 }}>Tempo
            <input type="number" value={tempo} onChange={e => setTempo(e.target.value)} className="search-input" style={{ marginBottom: 0 }} />
          </label>
        </div>
        <label>Style
          <input type="text" value={style} onChange={e => setStyle(e.target.value)} className="search-input" />
        </label>
        <label>Instrumen (pisahkan dengan koma)
          <input
            type="text"
            value={instruments.join(', ')}
            onChange={e => setInstruments(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="search-input"
            placeholder="Contoh: gitar, piano, drum"
          />
        </label>
        {/* YouTube Viewer di atas field lirik */}
        {youtubeId && (
          <div style={{ margin: '16px 0' }}>
            <YouTubeViewer
              videoId={youtubeId}
              minimalControls={false}
              ref={ytRef => {
                window._ytRef = ytRef;
              }}
              onTimeUpdate={(t, d) => {
                window._ytCurrentTime = t;
              }}
              songId={songId}
              showTimeMarkers={true}
              timeMarkersProps={{
                markers: timestamps,
                setMarkers: setTimestamps,
                manualMode: mode === 'add',
              }}
            />
          </div>
        )}
        <label>Lirik/Chord
          <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} className="search-input" rows={8} style={{ fontFamily: 'monospace', resize: 'vertical' }} placeholder="[C] Contoh lirik dan chord..." />
        </label>
        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        <button type="submit" className="tab-btn" style={{ marginTop: 18 }} disabled={loading}>
          {loading ? 'Menyimpan...' : (mode === 'edit' ? 'Simpan Perubahan' : 'Simpan Lagu')}
        </button>
      </form>

      {/* AI Confirm Modal */}
      {showAiConfirm && aiResult && (
        <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="modal-content" style={{ background:'#222', color:'#fff', borderRadius:10, padding:28, minWidth:320, maxWidth:400, boxShadow:'0 4px 32px #0008', position:'relative' }}>
            <h3 style={{marginTop:0, marginBottom:16}}>Konfirmasi Isi Otomatis</h3>
            <div style={{marginBottom:16, fontSize:'0.98em'}}>Pilih field yang ingin diisi otomatis:</div>
            {/* Chord Links */}
            {Array.isArray(aiResult.chordLinks) && aiResult.chordLinks.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontWeight:600, marginBottom:4}}>Sumber Chord:</div>
                <ul style={{paddingLeft:18, margin:0}}>
                  {aiResult.chordLinks.map((cl, idx) => (
                    <li key={idx} style={{marginBottom:2}}>
                      <a href={cl.url} target="_blank" rel="noopener noreferrer" style={{color:'#4f8cff', textDecoration:'underline'}}>{cl.title || cl.site}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); handleApplyAiFields(); }}>
              {aiResult.key && (
                <div style={{marginBottom:8}}>
                  <label><input type="checkbox" checked={aiConfirmFields.key} onChange={e => setAiConfirmFields(f => ({...f, key: e.target.checked}))} /> Key: <span style={{fontWeight:600}}>{aiResult.key}</span></label>
                </div>
              )}
              {aiResult.tempo && (
                <div style={{marginBottom:8}}>
                  <label><input type="checkbox" checked={aiConfirmFields.tempo} onChange={e => setAiConfirmFields(f => ({...f, tempo: e.target.checked}))} /> Tempo: <span style={{fontWeight:600}}>{aiResult.tempo}</span></label>
                </div>
              )}
              {aiResult.style && (
                <div style={{marginBottom:8}}>
                  <label><input type="checkbox" checked={aiConfirmFields.style} onChange={e => setAiConfirmFields(f => ({...f, style: e.target.checked}))} /> Style: <span style={{fontWeight:600}}>{aiResult.style}</span></label>
                </div>
              )}
              {aiResult.youtubeId && (
                <div style={{marginBottom:8}}>
                  <label><input type="checkbox" checked={aiConfirmFields.youtubeId} onChange={e => setAiConfirmFields(f => ({...f, youtubeId: e.target.checked}))} /> YouTube ID: <span style={{fontWeight:600}}>{aiResult.youtubeId}</span></label>
                </div>
              )}
              {aiResult.lyrics && (
                <div style={{marginBottom:8}}>
                  <label><input type="checkbox" checked={aiConfirmFields.lyrics} onChange={e => setAiConfirmFields(f => ({...f, lyrics: e.target.checked}))} /> Lirik: <span style={{fontWeight:600, fontStyle:'italic'}}>{aiResult.lyrics.slice(0, 60)}{aiResult.lyrics.length > 60 ? '...' : ''}</span></label>
                </div>
              )}
              {Array.isArray(aiResult.instruments) && aiResult.instruments.length > 0 && (
                <div style={{marginBottom:8}}>
                  <label><input type="checkbox" checked={aiConfirmFields.instruments} onChange={e => setAiConfirmFields(f => ({...f, instruments: e.target.checked}))} /> Instrumen: <span style={{fontWeight:600}}>{aiResult.instruments.join(', ')}</span></label>
                </div>
              )}
              <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:18}}>
                <button type="button" className="tab-btn" onClick={() => { setShowAiConfirm(false); setAiResult(null); }}>Batal</button>
                <button type="submit" className="tab-btn" style={{background:'#4f8cff', color:'#fff', fontWeight:600}}>Isi Field</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
