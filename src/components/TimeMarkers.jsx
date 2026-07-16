import React, { useState, useEffect } from 'react';

export default function TimeMarkers({
  timeMarkers = [],
  onSeek,
  currentTime = 0,
  duration = 0,
  readonly = false,
  onUpdate,
  getCurrentYouTubeTime // function: returns current time in seconds from YouTube player
}) {  
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

  const [playingMarker, setPlayingMarker] = useState(null);
  const handleSeekMarker = (timestamp) => {
    setPlayingMarker(timestamp);
    if (onSeek && typeof onSeek === 'function') {
      onSeek(timestamp);
    }
  };

  const handlePauseMarker = () => {
    setPlayingMarker(null);
    if (onSeek && typeof onSeek === 'function') {
      onSeek(null, { pause: true });
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
  const isCompactReadonly = readonly;

  return (
    <div className="time-markers">
      <div className="time-markers-content">
        {duration > 0 && (
          <div className="time-markers-progress">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}

        {sortedMarkers.length > 0 && (
          <div className="time-markers-hint" aria-live="polite">
            <span className="time-markers-hint-desktop">Klik marker untuk seek. Double-click untuk pause.</span>
            <span className="time-markers-hint-mobile">Tap: seek | 2x tap: pause</span>
          </div>
        )}

        {!readonly && (
          <div className="time-marker-add">
            <div className="time-marker-add-row">
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="mm:ss"
                className="time-marker-input"
              />
              <button
                type="button"
                title="Ambil waktu dari YouTube"
                onClick={handleFillNewTimeFromYouTube}
                className="btn btn-secondary"
              >
                ⏱️
              </button>
            </div>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="time-marker-input"
            />
            <button
              type="button"
              onClick={handleAddNew}
              disabled={!newTime}
              className="btn"
            >
              Tambah Timestamp
            </button>
          </div>
        )}

        {sortedMarkers.length > 0 ? (
          <div className={`time-markers-list ${isCompactReadonly ? 'time-markers-list-compact' : ''}`}>
            {sortedMarkers.map((marker, idx) => {
              const markerId = marker.id || marker.time;
              const isEditing = editingId === markerId;
              const defaultLabel = `Marker ${idx + 1}`;
              const markerLabel = marker.label || defaultLabel;
              const showLabel = !isCompactReadonly || markerLabel !== defaultLabel;

              if (isEditing) {
                return (
                  <div
                    key={markerId}
                    className="time-marker-item time-marker-item-editing"
                  >
                    <div className="time-marker-add-row">
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="mm:ss"
                        className="time-marker-input"
                      />
                      <button
                        type="button"
                        title="Ambil waktu dari YouTube"
                        onClick={handleFillEditTimeFromYouTube}
                        className="btn btn-secondary"
                      >
                        ⏱️
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
                        className="btn"
                      >
                        ✓ Simpan
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="btn"
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
                  className={`time-marker-item ${isCompactReadonly ? 'time-marker-item-readonly' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSeekMarker(marker.time)}
                    onDoubleClick={handlePauseMarker}
                    className="btn btn-secondary time-marker-play-btn"
                    aria-label={`Seek marker ${formatTime(marker.time)}. Double-click to pause.`}
                    title="Seek | Double-click pause"
                  >
                    {playingMarker === marker.time ? '⏸️' : '▶️'}
                  </button>
                  <div className="time-marker-time">
                    {formatTime(marker.time)}
                  </div>
                  {showLabel && (
                    <div className="time-marker-label">
                      {markerLabel}
                    </div>
                  )}
                  {!readonly && (
                    <div className="time-marker-actions">
                      <button
                        type="button"
                        onClick={() => handleEdit(marker)}
                        className="btn btn-secondary"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(marker)}
                        className="btn btn-red"
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
