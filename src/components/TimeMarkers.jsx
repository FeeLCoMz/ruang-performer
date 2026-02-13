import React, { useState, useEffect } from 'react';
import ExpandButton from './ExpandButton';

export default function TimeMarkers({
  timeMarkers = [],
  onSeek,
  currentTime = 0,
  duration = 0,
  readonly = false,
  onUpdate,
  getCurrentYouTubeTime // function: returns current time in seconds from YouTube player
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTime, setEditTime] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLabel, setNewLabel] = useState('');

  // Auto-fill newTime with YouTube time when add form is shown
  useEffect(() => {
    if (!readonly && typeof getCurrentYouTubeTime === 'function') {
      const ytTime = getCurrentYouTubeTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        setNewTime(formatTime(ytTime));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readonly]);

  // Auto-fill editTime with YouTube time when edit form is opened
  useEffect(() => {
    if (editingId && typeof getCurrentYouTubeTime === 'function') {
      const ytTime = getCurrentYouTubeTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        setEditTime(formatTime(ytTime));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const formatTime = (seconds) => {
    const sec = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr) => {
    const parts = timeStr.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr) || 0;
  };

  const handlePlay = (timestamp) => {
    if (onSeek && typeof onSeek === 'function') {
      onSeek(timestamp);
    }
  };

  const handleEdit = (marker) => {
    setEditingId(marker.id || marker.time);
    setEditTime(formatTime(marker.time));
    setEditLabel(marker.label || '');
  };

  // Fill time input with current YouTube time (for add)
  const handleFillNewTimeFromYouTube = () => {
    if (typeof getCurrentYouTubeTime === 'function') {
      const ytTime = getCurrentYouTubeTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        setNewTime(formatTime(ytTime));
      }
    }
  };

  // Fill time input with current YouTube time (for edit)
  const handleFillEditTimeFromYouTube = () => {
    if (typeof getCurrentYouTubeTime === 'function') {
      const ytTime = getCurrentYouTubeTime();
      if (typeof ytTime === 'number' && !isNaN(ytTime)) {
        setEditTime(formatTime(ytTime));
      }
    }
  };

  const handleSaveEdit = () => {
    if (!onUpdate || readonly) return;
    const updatedMarkers = timeMarkers.map(m => {
      const markerId = m.id || m.time;
      if (markerId === editingId) {
        return {
          ...m,
          time: parseTime(editTime),
          label: editLabel
        };
      }
      return m;
    });
    onUpdate(updatedMarkers);
    setEditingId(null);
    setEditTime('');
    setEditLabel('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTime('');
    setEditLabel('');
  };

  const handleDelete = (marker) => {
    if (!onUpdate || readonly) return;
    const markerId = marker.id || marker.time;
    const updatedMarkers = timeMarkers.filter(m => (m.id || m.time) !== markerId);
    onUpdate(updatedMarkers);
  };

  const handleAddNew = () => {
    if (!onUpdate || readonly || !newTime) return;
    const newMarker = {
      time: parseTime(newTime),
      label: newLabel || `Marker ${formatTime(parseTime(newTime))}`
    };
    const updatedMarkers = [...timeMarkers, newMarker].sort((a, b) => a.time - b.time);
    onUpdate(updatedMarkers);
    setNewTime('');
    setNewLabel('');
  };

  const sortedMarkers = [...timeMarkers].sort((a, b) => a.time - b.time);

  return (
    <div className="time-markers">
      {/* Header */}
      <div className="time-markers-header">
        <span className="time-markers-title">⏲️ Time Markers</span>
        {sortedMarkers.length > 0 && (
          <span className="time-markers-badge">{sortedMarkers.length}</span>
        )}
        {duration > 0 && (
          <span className="time-markers-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>
      <div className="time-markers-content">
        {/* Add New Marker (moved above list) */}
        {!readonly && (
          <div className="time-marker-add" style={{ marginBottom: '16px' }}>
            <div className="time-marker-add-title">
              ➕ Tambah Timestamp Baru
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="mm:ss (contoh: 1:30)"
                className="time-marker-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                title="Ambil waktu dari YouTube"
                onClick={handleFillNewTimeFromYouTube}
                className="btn btn-secondary"
                >
                 <span role="img" aria-label="Ambil waktu dari YouTube">⏱️</span>
               </button>
            </div>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (opsional)"
              className="time-marker-input"
            />
            <button
              type="button"
              onClick={handleAddNew}
              disabled={!newTime}
              className="time-marker-add-btn"
            >
              ➕ Tambah Timestamp
            </button>
          </div>
        )}

        {/* Marker List */}
        {sortedMarkers.length > 0 ? (
          <div className="time-markers-list">
            {sortedMarkers.map((marker, idx) => {
              const markerId = marker.id || marker.time;
              const isEditing = editingId === markerId;

              if (isEditing) {
                return (
                  <div
                    key={markerId}
                    className="time-marker-item time-marker-item-editing"
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="mm:ss"
                        className="time-marker-input"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        title="Ambil waktu dari YouTube"
                        onClick={handleFillEditTimeFromYouTube}
                        className="btn btn-secondary"
                        >
                         <span role="img" aria-label="Ambil waktu dari YouTube">⏱️</span>
                       </button>
                    </div>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label"
                      className="time-marker-input"
                    />
                    <div className="time-marker-edit-actions">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="time-marker-save-btn"
                      >
                        ✓ Simpan
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="time-marker-cancel-btn"
                      >
                        ✕ Batal
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={markerId}
                  className="time-marker-item"
                >
                  <button
                    type="button"
                    onClick={() => handlePlay(marker.time)}
                    className="time-marker-play-btn"
                  >
                    ▶ {formatTime(marker.time)}
                  </button>
                  <div className="time-marker-label">
                    {marker.label || `Marker ${idx + 1}`}
                  </div>
                  {!readonly && (
                    <div className="time-marker-actions">
                      <button
                        type="button"
                        onClick={() => handleEdit(marker)}
                        className="time-marker-edit-btn"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(marker)}
                        className="time-marker-delete-btn"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="time-marker-empty">
            Belum ada timestamp
          </div>
        )}
      </div>
    </div>
  );
  
}
