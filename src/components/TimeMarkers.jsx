
import React, { useState, useEffect, useRef } from 'react';
import './TimeMarkers.css';

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

export default function TimeMarkers({ songId, getCurrentTime, seekTo, markers: propMarkers, setMarkers: propSetMarkers, manualMode, readonly }) {
  const [markers, setMarkersState] = useState(propMarkers || []);
  const [input, setInput] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const inputRef = useRef();

  // Update current video time every 200ms
  useEffect(() => {
    if (!getCurrentTime) return;
    const interval = setInterval(() => {
      setCurrentVideoTime(getCurrentTime() || 0);
    }, 200);
    return () => clearInterval(interval);
  }, [getCurrentTime]);

  // Sync with parent (for add mode)
  useEffect(() => {
    if (manualMode && propMarkers) setMarkersState(propMarkers);
  }, [propMarkers, manualMode]);

  // Load markers from DB (edit mode)
  useEffect(() => {
    if (!manualMode && songId) {
      fetchSongMarkers(songId).then(setMarkersState);
    }
  }, [songId, manualMode]);

  // Save markers to DB (edit mode)
  useEffect(() => {
    if (!manualMode && songId) {
      saveSongMarkers(songId, markers);
    }
  }, [markers, songId, manualMode]);

  // Propagate to parent (add mode)
  useEffect(() => {
    if (manualMode && propSetMarkers) propSetMarkers(markers);
  }, [markers, manualMode, propSetMarkers]);

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
      <div className="time-markers-header">Penanda Waktu</div>
      <div style={{fontSize: '0.98em', color: 'var(--primary-accent-dark)', marginBottom: 6}}>
        Waktu video saat ini: <b>{formatTime(currentVideoTime)}</b>
      </div>
      <div className="time-markers-list">
        {markers.length === 0 && <div className="time-markers-empty">Belum ada penanda.</div>}
        {markers.map((m, idx) => (
          <div className="time-marker-item" key={idx}>
            <span className="time-marker-time" onClick={() => handleJump(m.time)} title="Lompat ke waktu">{formatTime(m.time)}</span>
            <button className="time-marker-play-btn" onClick={() => handleJump(m.time)} title="Play ke waktu ini" style={{marginLeft: 6, marginRight: 6}}>▶️</button>
            {!readonly && (editingIdx === idx ? (
              <>
                <input
                  className="time-marker-edit-input"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEditSave(idx)}
                  autoFocus
                />
                <button className="time-marker-save-btn" onClick={() => handleEditSave(idx)}>Simpan</button>
              </>
            ) : (
              <>
                <span className="time-marker-label">{m.label}</span>
                <button className="time-marker-edit-btn" onClick={() => handleEdit(idx)} title="Edit">✎</button>
              </>
            ))}
            {!readonly && <button className="time-marker-remove-btn" onClick={() => handleRemove(idx)} title="Hapus">🗑</button>}
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
          <button className="time-marker-add-btn" onClick={handleAdd} disabled={!input.trim() || !getCurrentTime}>+ Tambah (waktu saat ini)</button>
        </div>
      )}
    </div>
  );
}
