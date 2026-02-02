import React, { useState } from 'react';

export default function TimeMarkers({
  timeMarkers = [],
  onSeek,
  currentTime = 0,
  duration = 0,
  readonly = false,
  onUpdate
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTime, setEditTime] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLabel, setNewLabel] = useState('');

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
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid var(--border-color)'
    }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--secondary-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          fontSize: '1em',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : '0'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>⏲️ Time Markers</span>
          {sortedMarkers.length > 0 && (
            <span style={{
              background: 'var(--primary-color)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.85em',
              fontWeight: '700'
            }}>
              {sortedMarkers.length}
            </span>
          )}
        </span>
        {duration > 0 && (
          <span style={{
            fontSize: '0.9em',
            color: 'var(--text-muted)'
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Marker List */}
          {sortedMarkers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedMarkers.map((marker, idx) => {
                const markerId = marker.id || marker.time;
                const isEditing = editingId === markerId;

                if (isEditing) {
                  return (
                    <div
                      key={markerId}
                      style={{
                        padding: '12px',
                        background: 'var(--secondary-bg)',
                        borderRadius: '6px',
                        border: '2px solid var(--primary-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="mm:ss"
                        style={{
                          padding: '8px 12px',
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '0.95em'
                        }}
                      />
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Label"
                        style={{
                          padding: '8px 12px',
                          background: 'var(--input-bg)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '0.95em'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.9em',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Simpan
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: 'var(--secondary-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontSize: '0.9em',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
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
                    style={{
                      padding: '12px',
                      background: 'var(--secondary-bg)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <button
                      onClick={() => handlePlay(marker.time)}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        fontWeight: '600',
                        cursor: 'pointer',
                        minWidth: '60px'
                      }}
                    >
                      ▶ {formatTime(marker.time)}
                    </button>
                    <div style={{
                      flex: 1,
                      color: 'var(--text-primary)',
                      fontSize: '0.95em'
                    }}>
                      {marker.label || `Marker ${idx + 1}`}
                    </div>
                    {!readonly && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleEdit(marker)}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--secondary-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontSize: '0.85em',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(marker)}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--danger-color, #ef4444)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.85em',
                            cursor: 'pointer'
                          }}
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
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.9em',
              fontStyle: 'italic'
            }}>
              Belum ada timestamp
            </div>
          )}

          {/* Add New Marker */}
          {!readonly && (
            <div style={{
              padding: '12px',
              background: 'var(--secondary-bg)',
              borderRadius: '6px',
              border: '1px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{
                fontSize: '0.9em',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                ➕ Tambah Timestamp Baru
              </div>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="mm:ss (contoh: 1:30)"
                style={{
                  padding: '8px 12px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '0.95em'
                }}
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (opsional)"
                style={{
                  padding: '8px 12px',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '0.95em'
                }}
              />
              <button
                onClick={handleAddNew}
                disabled={!newTime}
                style={{
                  padding: '10px',
                  background: newTime ? 'var(--primary-color)' : 'var(--secondary-bg)',
                  color: newTime ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.95em',
                  fontWeight: '600',
                  cursor: newTime ? 'pointer' : 'not-allowed',
                  opacity: newTime ? 1 : 0.6
                }}
              >
                ➕ Tambah Timestamp
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
