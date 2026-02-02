import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import YouTubeViewer from '../components/YouTubeViewer';
import TimeMarkers from '../components/TimeMarkers';
import TapTempo from '../components/TapTempo';
import AIAutofillModal from '../components/AIAutofillModal';
import { getAuthHeader } from '../utils/auth';

export default function SongAddEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  // Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [songKey, setSongKey] = useState('C');
  const [tempo, setTempo] = useState('');
  const [genre, setGenre] = useState('');
  const [capo, setCapo] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [instruments, setInstruments] = useState('');
  const [timeMarkers, setTimeMarkers] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiConfirmFields, setAiConfirmFields] = useState({});
  
  // YouTube ref
  const ytRef = useRef(null);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);

  // Load song data for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setLoadingData(true);
      fetch(`/api/songs/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Gagal memuat data lagu');
          return res.json();
        })
        .then(data => {
          setTitle(data.title || '');
          setArtist(data.artist || '');
          setSongKey(data.key || 'C');
          setTempo(data.tempo || '');
          setGenre(data.genre || '');
          setCapo(data.capo || '');
          setLyrics(data.lyrics || '');
          setYoutubeId(extractYouTubeId(data.youtubeId || data.youtube_url || ''));
          setInstruments(Array.isArray(data.instruments) ? data.instruments.join(', ') : '');
          setTimeMarkers(data.time_markers || []);
          setLoadingData(false);
        })
        .catch(err => {
          setError(err.message);
          setLoadingData(false);
        });
    }
  }, [id, isEditMode]);

  // Extract YouTube ID from URL
  const extractYouTubeId = (input) => {
    if (!input) return '';
    const maybeId = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(maybeId)) return maybeId;
    
    try {
      const url = new URL(maybeId.includes('http') ? maybeId : `https://${maybeId}`);
      if (url.searchParams && url.searchParams.get('v')) return url.searchParams.get('v');
      if (url.hostname && url.pathname) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) return parts[parts.length - 1];
      }
    } catch (e) {
      const m = maybeId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
    }
    return input;
  };

  const handleAIAutofill = async () => {
    if (!title.trim()) {
      setError('Isi judul lagu terlebih dahulu untuk AI autofill');
      return;
    }
    
    setAiLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/ai/song-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim()
        })
      });
      
      if (!res.ok) throw new Error('Gagal mendapatkan data AI');
      
      const data = await res.json();
      setAiResult(data);
      setAiConfirmFields({
        artist: !!data.artist,
        key: !!data.key,
        tempo: !!data.tempo,
        genre: !!data.genre,
        capo: data.capo !== undefined && data.capo !== null,
        youtubeId: !!data.youtubeId,
        lyrics: !!data.lyrics,
        instruments: Array.isArray(data.instruments) && data.instruments.length > 0
      });
      setShowAiModal(true);
    } catch (err) {
      setError(err.message || 'Gagal autofill AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAI = () => {
    if (!aiResult) return;
    
    if (aiConfirmFields.artist && aiResult.artist) setArtist(aiResult.artist);
    if (aiConfirmFields.key && aiResult.key) setSongKey(aiResult.key);
    if (aiConfirmFields.tempo && aiResult.tempo) setTempo(aiResult.tempo.toString());
    if (aiConfirmFields.genre && aiResult.genre) setGenre(aiResult.genre);
    if (aiConfirmFields.capo && aiResult.capo !== undefined && aiResult.capo !== null) setCapo(aiResult.capo.toString());
    if (aiConfirmFields.youtubeId && aiResult.youtubeId) setYoutubeId(aiResult.youtubeId);
    if (aiConfirmFields.lyrics && aiResult.lyrics) setLyrics(aiResult.lyrics);
    if (aiConfirmFields.instruments && aiResult.instruments) {
      setInstruments(Array.isArray(aiResult.instruments) ? aiResult.instruments.join(', ') : aiResult.instruments);
    }
    
    setShowAiModal(false);
    setAiResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Judul lagu wajib diisi');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const payload = {
      title: title.trim(),
      artist: artist.trim(),
      key: songKey,
      tempo: tempo ? parseInt(tempo) : null,
      genre: genre.trim(),
      capo: capo ? parseInt(capo) : null,
      lyrics: lyrics.trim(),
      youtubeId: extractYouTubeId(youtubeId),
      instruments: instruments.split(',').map(i => i.trim()).filter(Boolean),
      time_markers: timeMarkers
    };
    
    try {
      const url = isEditMode ? `/api/songs/${id}` : '/api/songs';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan lagu');
      }
      
      const savedSong = await res.json();
      
      // Navigate to song detail page
      navigate(`/songs/view/${savedSong.id || id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/songs/view/${id}`);
    } else {
      navigate('/songs');
    }
  };

  if (loadingData) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-icon">⏳</div>
          <div>Memuat data lagu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="song-edit-header">
        <button
          onClick={handleCancel}
          className="song-edit-back-btn"
        >
          ←
        </button>
        <div className="song-edit-title-section">
          <h1 className="song-edit-title">
            {isEditMode ? '✏️ Edit Lagu' : '➕ Tambah Lagu Baru'}
          </h1>
          <p className="song-edit-subtitle">
            {isEditMode ? 'Perbarui informasi lagu' : 'Tambahkan lagu baru ke koleksi'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAIAutofill}
          disabled={aiLoading || !title.trim()}
          className="btn-ai-autofill"
        >
          {aiLoading ? '⏳ Memuat...' : '🤖 AI Autofill'}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Section */}
        <div className="song-section-card">
          <h3 className="song-section-title">
            📝 Informasi Dasar
          </h3>
          
          <div className="form-section">
            <div>
              <label className="form-label-required">
                🎵 Judul Lagu <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Masukkan judul lagu"
                className="form-input-field"
              />
            </div>

            <div>
              <label className="form-label-required">
                👤 Artist
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Nama artist atau band"
                className="form-input-field"
              />
            </div>

            <div className="form-grid-2col">
              <div>
                <label className="form-label-required">
                  🎹 Key
                </label>
                <input
                  type="text"
                  value={songKey}
                  onChange={(e) => setSongKey(e.target.value)}
                  placeholder="C, D, E, dll"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label-required">
                  ⏱️ Tempo (BPM)
                </label>
                <div className="form-section" style={{ flexDirection: 'row' }}>
                  <input
                    type="number"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    placeholder="120"
                    min="40"
                    max="240"
                    className="form-input-field"
                    style={{ flex: 1 }}
                  />
                  <TapTempo onTempo={setTempo} initialTempo={tempo} />
                </div>
              </div>

              <div>
                <label className="form-label-required">
                  🎸 Genre
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Pop, Rock, Jazz, dll"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label-required">
                  📌 Capo
                </label>
                <input
                  type="number"
                  value={capo}
                  onChange={(e) => setCapo(e.target.value)}
                  placeholder="Fret number"
                  min="0"
                  max="12"
                  className="form-input-field"
                />
              </div>
            </div>

            <div>
              <label className="form-label-required">
                🎺 Instrumen (pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={instruments}
                onChange={(e) => setInstruments(e.target.value)}
                placeholder="Gitar, Piano, Drum, Bass"
                className="form-input-field"
              />
            </div>
          </div>
        </div>

        {/* YouTube & Time Markers Section */}
        <div className="song-section-card">
          <h3 className="song-section-title">
            🎬 Video & Time Markers
          </h3>

          <div>
            <label className="form-label-required">
              YouTube URL atau ID
            </label>
            <input
              type="text"
              value={youtubeId}
              onChange={(e) => setYoutubeId(e.target.value)}
              placeholder="https://youtube.com/watch?v=... atau dQw4w9WgXcQ"
              className="form-input-field"
            />
          </div>

          {youtubeId && (
            <div className="form-section">
              <YouTubeViewer
                videoId={extractYouTubeId(youtubeId)}
                ref={ytRef}
                onTimeUpdate={(t, d) => {
                  setYtCurrentTime(t);
                  if (typeof d === 'number') setYtDuration(d);
                }}
              />
              
              <TimeMarkers
                timeMarkers={timeMarkers}
                onUpdate={setTimeMarkers}
                onSeek={(time) => {
                  if (ytRef.current && ytRef.current.handleSeek) {
                    ytRef.current.handleSeek(time);
                  }
                }}
                currentTime={ytCurrentTime}
                duration={ytDuration}
                readonly={false}
              />
            </div>
          )}
        </div>

        {/* Lyrics Section */}
        <div className="song-section-card">
          <h3 className="song-section-title">
            🎤 Lirik & Chord
          </h3>

          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Masukkan lirik dan chord di sini..."
            rows={15}
            className="form-input-field"
            style={{
              fontFamily: 'var(--font-mono, "Courier New", monospace)',
              lineHeight: '1.6',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-cancel"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-submit"
          >
            {loading ? '⏳ Menyimpan...' : (isEditMode ? '💾 Simpan Perubahan' : '➕ Tambah Lagu')}
          </button>
        </div>
      </form>

      {/* AI Autofill Modal */}
      {showAiModal && aiResult && (
        <AIAutofillModal
          aiResult={aiResult}
          aiConfirmFields={aiConfirmFields}
          setAiConfirmFields={setAiConfirmFields}
          onApply={handleApplyAI}
          onClose={() => {
            setShowAiModal(false);
            setAiResult(null);
          }}
        />
      )}
    </div>
  );
}
