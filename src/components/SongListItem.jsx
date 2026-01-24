import React, { useState } from 'react';
import SetlistPicker from './SetlistPicker';

export default function SongListItem({
  song,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  currentSetList,
  overrideKey,
  onSetListKeyChange,
  viewMode,
  isCompleted,
  onToggleCompleted,

}) {
  const [tempKey, setTempKey] = useState(overrideKey || '');
  const [showSetlistPicker, setShowSetlistPicker] = useState(false);
  const [refresh, setRefresh] = useState(0); // force re-render

  React.useEffect(() => {
    setTempKey(overrideKey || '');
  }, [overrideKey]);

  // Tampilan minimalis untuk mode performance: hanya judul lagu
  return (
    <div className={`song-item${isActive ? ' active' : ''}`}
      style={{ position: 'relative', padding: 16, fontSize: 32, background: '#fff', color: '#111', border: 'none', boxShadow: 'none' }}
      onClick={onSelect}
    >
      <div className="song-title" style={{ fontWeight: 'bold', fontSize: '1.2em', marginBottom: 8 }}>
        {song.title}
      </div>
      {/* Chord/lyric utama bisa ditampilkan di sini jika diperlukan */}
    </div>
  );
}
