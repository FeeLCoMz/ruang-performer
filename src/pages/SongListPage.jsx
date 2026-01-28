
import React, { useRef } from 'react';
import SongList from '../components/SongList.jsx';
import PlusIcon from '../components/PlusIcon.jsx';

export default function SongListPage({ songs, loading, error, search, setSearch, onSongClick }) {
  const recognitionRef = useRef(null);
  const isSpeechSupported = typeof window !== 'undefined' && (
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  const handleVoiceSearch = () => {
    if (!isSpeechSupported) {
      alert('Fitur pencarian suara tidak didukung di browser Anda.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'id-ID';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearch(transcript);
      };
      recognitionRef.current.onerror = (event) => {
        alert('Terjadi kesalahan saat mengenali suara: ' + event.error);
      };
    }
    recognitionRef.current.start();
  };
  return (
    <>
      <div className="section-title">Lagu</div>
      <div className="info-text" style={{ marginTop: -12, marginBottom: 16, fontSize: '1.05em' }}>
        {songs.length} Lagu
      </div>
      <button className="tab-btn" style={{ marginBottom: 18, padding: '0.5rem 0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onSongClick('add')} title="Tambah Lagu">
        <PlusIcon size={22} />
      </button>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Cari judul atau artist..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="tab-btn"
          title="Cari dengan suara"
          style={{ padding: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={handleVoiceSearch}
        >
          <span role="img" aria-label="Mic">🎤</span>
        </button>
      </div>
      {loading && <div className="info-text">Memuat daftar lagu...</div>}
      {error && <div className="error-text">{error}</div>}
      <SongList
        songs={songs}
        onSongClick={onSongClick}
        emptyText="Tidak ada lagu ditemukan."
      />
    </>
  );
}
