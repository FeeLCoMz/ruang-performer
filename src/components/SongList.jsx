
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragHandleIcon from './DragHandleIcon.jsx';

function SongList({ songs, onSongClick, emptyText = 'Tidak ada lagu ditemukan.', enableSearch = false, showNumber = false, setlistSongKeys: setlistSongMeta = null, draggable = false, onReorder = null }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [sortOrder, setSortOrder] = useState('asc');
  // Always call hooks at the top
  const sensors = useSensors(useSensor(PointerSensor));

  let filteredSongs = enableSearch
    ? (songs || []).filter(song =>
              (song.title || '').toLowerCase().includes(search.toLowerCase()) ||
              (song.artist || '').toLowerCase().includes(search.toLowerCase())
      )
    : songs;

  // Sorting logic
  if (sortBy !== 'default') {
    filteredSongs = [...filteredSongs].sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Dropdown sort
  const sortOptions = [
    { value: 'default', label: 'Urutan Asli' },
    { value: 'title', label: 'Judul' },
    { value: 'artist', label: 'Artist' },
    { value: 'key', label: 'Key' },
    { value: 'tempo', label: 'Tempo' },
    { value: 'style', label: 'Style' },
  ];

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredSongs.findIndex(song => String(song.id) === String(active.id));
    const newIndex = filteredSongs.findIndex(song => String(song.id) === String(over.id));
    if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
      onReorder(oldIndex, newIndex);
    }
  }

  // UI jika kosong
  if (!filteredSongs || filteredSongs.length === 0) {
    return (
      <>
        {enableSearch && (
          <input
            type="text"
            placeholder="Cari judul atau artist..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ marginBottom: 18 }}
          />
        )}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="search-input" style={{ width:150 }}>
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {sortBy !== 'default' && (
            <button className="tab-btn" style={{ padding:'6px 10px' }} onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          )}
        </div>
        <ul className="song-list"><li className="info-text">{emptyText}</li></ul>
      </>
    );
  }

// Refactor: SortableSongItem harus di luar komponen agar urutan hook tidak berubah
function SortableSongItem({ song, idx, renderSongItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: String(song.id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#f0f4ff' : undefined
  };
  return renderSongItem(
    song,
    idx,
    { ...attributes, ...listeners },
    { style },
    setNodeRef
  );
}

  const renderSongItem = (song, idx, dragHandleProps = null, draggableProps = null, ref = null) => {
    let keyOverride = null;
    if (setlistSongMeta && setlistSongMeta[idx] && setlistSongMeta[idx].id === song.id) {
      keyOverride = setlistSongMeta[idx].key;
    }
    // Handler klik item lagu: support object (onClick) atau langsung function
    let handleClick = undefined;
    if (typeof onSongClick === 'object' && onSongClick && onSongClick.onClick) {
      handleClick = () => onSongClick.onClick(song);
    } else if (typeof onSongClick === 'function') {
      handleClick = () => onSongClick(song);
    }
    return (
      <li
        key={song.id}
        className={
          'song-list-item' +
          (showNumber ? ' song-list-item--with-number' : '')
        }
        onClick={handleClick}
        ref={ref}
        {...draggableProps}
      >
        {showNumber && (
          <span className="song-number-badge">{idx + 1}</span>
        )}
        <div style={{ marginLeft: showNumber ? 38 : 0, display: 'flex', alignItems: 'center' }}>
          {draggable && (
            <span {...dragHandleProps} style={{ cursor: 'grab', marginRight: 8 }} onClick={e => e.stopPropagation()}>
              <DragHandleIcon size={18} />
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
              <span className="song-title" style={{ display: 'block', fontSize: '1.13em', fontWeight: 700 }}>{song.title}</span>
              <span className="song-artist" style={{ display: 'block', fontSize: '0.98em', color: 'var(--text-muted)' }}>{song.artist}</span>
            </div>
            <div className="song-info-row" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 6, fontSize: '0.97em', color: 'var(--primary-accent-dark, #a5b4fc)' }}>
              <span>
                <strong>Key:</strong> {keyOverride ? (
                  <>
                    <span style={{ color: 'var(--primary-accent)' }}>{keyOverride}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.97em', marginLeft: 4 }}>
                      ({song.key || '-'})
                    </span>
                  </>
                ) : (song.key || '-')}
              </span>
              <span><strong>Tempo:</strong> {song.tempo ? song.tempo + ' bpm' : '-'}</span>
              <span><strong>Style:</strong> {song.style || '-'}</span>
            </div>
          </div>
          {/* Tombol edit dan hapus lagu dari setlist */}
          {typeof onSongClick === 'object' && onSongClick && (
            <>
              {onSongClick.onEditSong && (
                <button
                  className="tab-btn"
                  style={{ marginLeft: 12, background: '#e0e7ff', color: '#3730a3', fontWeight: 600, border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
                  title="Edit detail lagu di setlist"
                  onClick={e => { e.stopPropagation(); onSongClick.onEditSong(idx); }}
                >
                  Edit
                </button>
              )}
              {onSongClick.onDeleteSong && (
                <button
                  className="tab-btn"
                  style={{ marginLeft: 8, background: '#ff6b6b', color: '#fff', fontWeight: 600, border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
                  title="Hapus lagu dari setlist"
                  onClick={e => { e.stopPropagation(); onSongClick.onDeleteSong(song.id); }}
                >
                  Hapus
                </button>
              )}
            </>
          )}
        </div>
      </li>
    );
  };

  if (draggable) {
    return (
      <>
        {enableSearch && (
          <input
            type="text"
            placeholder="Cari judul atau artist..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ marginBottom: 18 }}
          />
        )}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="search-input" style={{ width:150 }}>
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {sortBy !== 'default' && (
            <button className="tab-btn" style={{ padding:'6px 10px' }} onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          )}
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(filteredSongs || []).map(song => String(song.id))} strategy={verticalListSortingStrategy}>
            <ul className="song-list">
              {(filteredSongs || []).map((song, idx) => (
                <SortableSongItem key={song.id} song={song} idx={idx} renderSongItem={renderSongItem} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </>
    );
  }
  // ...existing code (non-draggable)
  return (
    <>
      {enableSearch && (
        <input
          type="text"
          placeholder="Cari judul atau artist..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
          style={{ marginBottom: 18 }}
        />
      )}
      <div style={{ display:'flex', gap:10, marginBottom:12 }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="search-input" style={{ width:150 }}>
          {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {sortBy !== 'default' && (
          <button className="tab-btn" style={{ padding:'6px 10px' }} onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? '⬆️' : '⬇️'}
          </button>
        )}
      </div>
      <ul className="song-list">
        {(filteredSongs || []).map((song, idx) => renderSongItem(song, idx))}
      </ul>
    </>
  );
}

export default SongList;
