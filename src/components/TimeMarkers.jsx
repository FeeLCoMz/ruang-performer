
import React, { useState, useEffect, useRef } from 'react';

// Helper to format seconds as mm:ss
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// API helpers
async function fetchSongMarkers(songId) {
  const res = await fetch(`/api/songs/${songId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.timestamps) ? data.timestamps : [];
}
async function saveSongMarkers(songId, markers) {
  await fetch(`/api/songs/${songId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamps: markers })
  });
}

export default function TimeMarkers({ markers: initialMarkers = [], onMarkersChange, getCurrentTime, seekTo, readonly }) {
  const [markers, setMarkersState] = useState(initialMarkers);
  // Debug: log setiap kali markers berubah dan propagate ke parent
  useEffect(() => {
    console.log('[DEBUG] TimeMarkers markers changed:', markers);
    if (typeof onMarkersChange === 'function') onMarkersChange(markers);
  }, [markers, onMarkersChange]);
  // didMountRef tidak diperlukan lagi
  const [input, setInput] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef();

  // Update current video time every 200ms
  useEffect(() => {
    if (!getCurrentTime) return;
    const interval = setInterval(() => {
      setCurrentVideoTime(getCurrentTime() || 0);
    }, 200);
    return () => clearInterval(interval);
  }, [getCurrentTime]);

  // Sync markers jika initialMarkers berubah
  useEffect(() => {
    setMarkersState(initialMarkers);
  }, [initialMarkers]);

  // Semua fetch/save otomatis dihapus. Parent bertanggung jawab simpan ke DB.

  // Add marker at current time
  const handleAdd = () => {
    if (readonly) return;
    if (!input.trim() || !getCurrentTime) return;
    let time = getCurrentTime();
    if (window._ytRef && window._ytRef.scrubberValueRef && window._ytRef.isScrubbing) {
      const scrubVal = Number(window._ytRef.scrubberValueRef.current);
      if (!isNaN(scrubVal)) time = scrubVal;
    }
    setMarkersState(prev => [...prev, { label: input.trim(), time }].sort((a, b) => a.time - b.time));
    setInput('');
    inputRef.current?.focus();
  };

  // Remove marker
  const handleRemove = idx => {
    if (readonly) return;
    setMarkersState(markers.filter((_, i) => i !== idx));
  };

  // Edit marker
  const handleEdit = idx => {
    if (readonly) return;
    setEditingIdx(idx);
    setEditValue(markers[idx].label);
  };
  const handleEditSave = idx => {
    if (readonly) return;
    setMarkersState(markers.map((m, i) => i === idx ? { ...m, label: editValue } : m));
    setEditingIdx(null);
  };

  // Jump to marker
  const handleJump = t => {
    if (seekTo) seekTo(t);
  };

  return (
    <div className="time-markers-container">
      <div className="time-markers-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span>Penanda Waktu</span>
        <button
          className="time-markers-toggle-btn"
          type="button"
          aria-label={collapsed ? 'Tampilkan penanda waktu' : 'Sembunyikan penanda waktu'}
          onClick={() => setCollapsed(c => !c)}
          style={{marginLeft:8, fontSize:'1.1em', background:'none', border:'none', color:'var(--primary-accent, #6366f1)', cursor:'pointer'}}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>
      {!collapsed && (
        <>
          <div style={{fontSize: '0.98em', color: 'var(--primary-accent-dark)', marginBottom: 6}}>
            Waktu video saat ini: <b>{formatTime(currentVideoTime)}</b>
          </div>
          <div className="time-markers-list">
            {markers.length === 0 && <div className="time-markers-empty">Belum ada penanda.</div>}
            {markers.map((m, idx) => (
              <div className="time-marker-item" key={idx}>
                <span className="time-marker-time" onClick={() => handleJump(m.time)} title="Lompat ke waktu">{formatTime(m.time)}</span>
                <button
                  className="btn-base time-marker-play-btn"
                  type="button"
                  onClick={e => { e.preventDefault(); handleJump(m.time); }}
                  title="Play ke waktu ini"
                  style={{marginLeft: 6, marginRight: 6}}
                >
                  ▶️
                </button>
                {!readonly && (editingIdx === idx ? (
                  <>
                    <input
                      className="time-marker-edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditSave(idx)}
                      autoFocus
                    />
                    <button type="button" className="btn-base time-marker-save-btn" onClick={() => handleEditSave(idx)}>Simpan</button>
                  </>
                ) : (
                  <>
                    <span className="time-marker-label">{m.label}</span>
                    <button type="button" className="btn-base time-marker-edit-btn" onClick={() => handleEdit(idx)} title="Edit">✎</button>
                  </>
                ))}
                {!readonly && <button type="button" className="btn-base time-marker-remove-btn" onClick={() => handleRemove(idx)} title="Hapus">🗑</button>}
              </div>
            ))}
          </div>
          {!readonly && (
            <div className="time-markers-add">
              <input
                className="time-marker-input"
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Tulis label penanda..."
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <button type="button" className="btn-base time-marker-add-btn" onClick={handleAdd} disabled={!input.trim() || !getCurrentTime}>+</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
