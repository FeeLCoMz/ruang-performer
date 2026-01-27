
import React from 'react';
import SongList from '../components/SongList.jsx';
import PlusIcon from '../components/PlusIcon.jsx';

export default function SongListPage({ songs, loading, error, search, setSearch, onSongClick }) {
  return (
    <>
      <div className="section-title">Lagu</div>
      <div className="info-text" style={{ marginTop: -12, marginBottom: 16, fontSize: '1.05em' }}>
        {songs.length} Lagu
      </div>
      <button className="tab-btn" style={{ marginBottom: 18, padding: '0.5rem 0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onSongClick('add')} title="Tambah Lagu">
        <PlusIcon size={22} />
      </button>
      <input
        type="text"
        placeholder="Cari judul atau artist..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="search-input"
      />
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
