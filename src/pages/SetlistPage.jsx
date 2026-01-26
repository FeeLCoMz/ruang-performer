import { useNavigate } from 'react-router-dom';

export default function SetlistPage({
  setlists,
  loadingSetlists,
  errorSetlists,
  showCreateSetlist,
  setShowCreateSetlist,
  createSetlistName,
  setCreateSetlistName,
  createSetlistError,
  setCreateSetlistError,
  setSetlists
}) {
  const navigate = useNavigate();
  return (
    <>
      <div className="section-title">Setlist</div>
      <button
        className="tab-btn"
        style={{ marginBottom: 18 }}
        onClick={() => setShowCreateSetlist(true)}
      >
        + Buat Setlist Baru
      </button>
      {/* Modal Buat Setlist Baru */}
      {showCreateSetlist && (
        <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setShowCreateSetlist(false)}>
          <div className="modal-content" style={{ background:'#222', color:'#fff', borderRadius:10, padding:28, minWidth:320, maxWidth:400, boxShadow:'0 4px 32px #0008', position:'relative' }} onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop:0, marginBottom:16}}>Buat Setlist Baru</h3>
            <input
              type="text"
              placeholder="Nama setlist..."
              value={createSetlistName}
              onChange={e => { setCreateSetlistName(e.target.value); setCreateSetlistError(''); }}
              className="search-input"
              style={{ width:'100%', marginBottom:12 }}
              autoFocus
            />
            {createSetlistError && (
              <div style={{ color:'#ff6b6b', marginBottom:10, fontSize:'0.98em' }}>{createSetlistError}</div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className="tab-btn" onClick={() => setShowCreateSetlist(false)}>Batal</button>
              <button
                className="tab-btn"
                style={{ background:'#4f8cff', color:'#fff', fontWeight:600, opacity: createSetlistName.trim() ? 1 : 0.5, pointerEvents: createSetlistName.trim() ? 'auto' : 'none' }}
                onClick={async () => {
                  setCreateSetlistError('');
                  if (!createSetlistName.trim()) {
                    setCreateSetlistError('Nama setlist wajib diisi.');
                    return;
                  }
                  try {
                    const res = await fetch('/api/setlists', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: createSetlistName.trim() })
                    });
                    if (!res.ok) throw new Error('Gagal membuat setlist');
                    const data = await res.json();
                    setSetlists(prev => [...prev, data]);
                    setShowCreateSetlist(false);
                    setCreateSetlistName('');
                    setCreateSetlistError('');
                  } catch (err) {
                    setCreateSetlistError(err.message || 'Gagal membuat setlist');
                  }
                }}
              >Buat</button>
            </div>
          </div>
        </div>
      )}
      {loadingSetlists && <div className="info-text">Memuat setlist...</div>}
      {errorSetlists && <div className="error-text">{errorSetlists}</div>}
      <ul className="setlist-list">
        {!loadingSetlists && !errorSetlists && setlists.length === 0 && (
          <li className="info-text">Belum ada setlist.</li>
        )}
        {setlists.map(setlist => (
          <li key={setlist.id} className="setlist-list-item" style={{ cursor: 'pointer' }} onClick={() => navigate(`/setlists/${setlist.id}/songs`)}>
            <span className="setlist-title">{setlist.name}</span>
            <span className="setlist-count">{(setlist.songs?.length || 0)} lagu</span>
          </li>
        ))}
      </ul>
    </>
  );
}
