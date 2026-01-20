import React, { useEffect, useState } from 'react';

/**
 * Halaman untuk menampilkan daftar lagu dalam setlist yang dipilih.
 * Props:
 *   - setList: objek setlist yang dipilih (berisi id, name, songs, songKeys, dst)
 *   - songs: array semua lagu (untuk lookup detail lagu)
 */
export default function SetListSongsPage({ setList, songs, onBack, onSongClick }) {
  // Sorting state
  const [sortBy, setSortBy] = useState('no');
  const [sortOrder, setSortOrder] = useState('asc');
  // Detect dark mode from body class
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.body.classList.contains('dark-mode'));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  if (!setList) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2 style={{ color: '#e11d48', marginBottom: 24 }}>Setlist tidak ditemukan</h2>
        <button onClick={onBack} style={{ padding: '8px 20px', borderRadius: 6, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>← Kembali</button>
      </div>
    );
  }

  // Ambil detail lagu dari setList.songs (bisa id atau string pending)
  const getSongDetail = (songIdOrName) => {
    if (!songIdOrName) return null;
    if (typeof songIdOrName === 'string') {
      const found = songs.find(s => s.id === songIdOrName);
      if (found) return found;
      // Jika tidak ditemukan, anggap pending
      return { id: songIdOrName, title: songIdOrName, artist: '', isPending: true };
    }
    return null;
  };

  const songListRaw = Array.isArray(setList.songs) ? setList.songs.map(getSongDetail) : [];

  // Sorting logic
  const sortFn = (a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'no':
        valA = a._idx;
        valB = b._idx;
        break;
      case 'title':
        valA = (a.title || '').toLowerCase();
        valB = (b.title || '').toLowerCase();
        break;
      case 'artist':
        valA = (a.artist || '').toLowerCase();
        valB = (b.artist || '').toLowerCase();
        break;
      case 'key':
        valA = (a.key || '').toLowerCase();
        valB = (b.key || '').toLowerCase();
        break;
      case 'tempo':
        valA = parseInt(a.tempo, 10) || 0;
        valB = parseInt(b.tempo, 10) || 0;
        break;
      case 'style':
        valA = (a.style || '').toLowerCase();
        valB = (b.style || '').toLowerCase();
        break;
      case 'status':
        valA = a.isPending ? 1 : 0;
        valB = b.isPending ? 1 : 0;
        break;
      default:
        valA = a._idx;
        valB = b._idx;
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  };
  // Tambahkan index untuk sort by nomor
  const songList = songListRaw.map((s, i) => ({ ...s, _idx: i }));
  songList.sort(sortFn);

  // Style theme
  const theme = isDark
    ? {
        bg: '#18181b',
        card: '#23232a',
        text: '#e5e7eb',
        header: '#38bdf8',
        border: '#27272a',
        thBg: '#23232a',
        thText: '#e5e7eb',
        even: '#23232a',
        odd: '#18181b',
        pending: '#f59e0b',
        siap: '#22c55e',
        btn: '#6366f1',
      }
    : {
        bg: '#f8fafc',
        card: '#fff',
        text: '#334155',
        header: '#0ea5e9',
        border: '#e5e7eb',
        thBg: '#f1f5f9',
        thText: '#334155',
        even: '#f8fafc',
        odd: '#fff',
        pending: '#f59e0b',
        siap: '#22c55e',
        btn: '#6366f1',
      };

  // Helper untuk render icon sort
  const renderSortIcon = (col) => {
    if (sortBy !== col) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div style={{ padding: '32px 0', maxWidth: 900, margin: '0 auto', background: theme.bg, color: theme.text, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack} style={{ padding: '8px 20px', borderRadius: 6, background: theme.btn, color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>← Kembali</button>
          <h2 style={{ margin: 0, fontSize: 28, color: theme.header, letterSpacing: 1 }}>{setList.name}</h2>
        </div>
        <div style={{ fontSize: 16, color: theme.text, fontWeight: 500 }}>
          Total: <span style={{ color: theme.header, fontWeight: 700 }}>{songList.length}</span> lagu
        </div>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.24)' : '0 2px 8px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: theme.card, fontSize: 16 }}>
          <thead style={{ background: theme.thBg }}>
            <tr>
              <th style={{ padding: '10px 8px', borderBottom: `2px solid ${theme.border}`, textAlign: 'center', fontWeight: 700, color: theme.thText, cursor: 'pointer' }} onClick={() => {
                if (sortBy === 'no') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('no');
              }}>No{renderSortIcon('no')}</th>
              <th style={{ padding: '10px 8px', borderBottom: `2px solid ${theme.border}`, textAlign: 'left', fontWeight: 700, color: theme.thText, cursor: 'pointer' }} onClick={() => {
                if (sortBy === 'title') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('title');
              }}>Judul{renderSortIcon('title')}</th>
              <th style={{ padding: '10px 8px', borderBottom: `2px solid ${theme.border}`, textAlign: 'left', fontWeight: 700, color: theme.thText, cursor: 'pointer' }} onClick={() => {
                if (sortBy === 'artist') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('artist');
              }}>Artis{renderSortIcon('artist')}</th>
              <th style={{ padding: '10px 8px', borderBottom: `2px solid ${theme.border}`, textAlign: 'center', fontWeight: 700, color: theme.thText, cursor: 'pointer' }} onClick={() => {
                if (sortBy === 'key') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('key');
              }}>Key{renderSortIcon('key')}</th>
              <th style={{ padding: '10px 8px', borderBottom: `2px solid ${theme.border}`, textAlign: 'center', fontWeight: 700, color: theme.thText, cursor: 'pointer' }} onClick={() => {
                if (sortBy === 'tempo') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('tempo');
              }}>Tempo{renderSortIcon('tempo')}</th>
              <th style={{ padding: '10px 8px', borderBottom: `2px solid ${theme.border}`, textAlign: 'center', fontWeight: 700, color: theme.thText, cursor: 'pointer' }} onClick={() => {
                if (sortBy === 'style') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('style');
              }}>Style{renderSortIcon('style')}</th>
              <th style={{ padding: '10px 8px', borderBottom: `2px solid ${theme.border}`, textAlign: 'center', fontWeight: 700, color: theme.thText, cursor: 'pointer' }} onClick={() => {
                if (sortBy === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setSortBy('status');
              }}>Status{renderSortIcon('status')}</th>
            </tr>
          </thead>
          <tbody>
            {songList.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: 32, background: theme.card }}>Belum ada lagu di setlist ini.</td></tr>
            ) : songList.map((song, idx) => (
              <tr key={song.id || idx} style={{ background: song.isPending ? theme.pending + '22' : idx % 2 === 0 ? theme.even : theme.odd }}>
                <td style={{ textAlign: 'center', padding: '8px 0', color: theme.text, fontWeight: 600 }}>{song._idx + 1}</td>
                <td style={{ padding: '8px 8px', fontWeight: 600 }}>
                  {song.isPending ? (
                    <span style={{ color: theme.pending }}>{song.title}</span>
                  ) : (
                    <button
                      onClick={() => onSongClick && onSongClick(song.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: theme.header,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 'inherit',
                        padding: 0,
                      }}
                    >
                      {song.title}
                    </button>
                  )}
                </td>
                <td style={{ padding: '8px 8px', color: theme.text }}>{song.artist}</td>
                <td style={{ textAlign: 'center', padding: '8px 0', color: theme.btn, fontWeight: 600 }}>{song.key}</td>
                <td style={{ textAlign: 'center', padding: '8px 0', color: theme.header }}>{song.tempo}</td>
                <td style={{ textAlign: 'center', padding: '8px 0', color: theme.text }}>{song.style}</td>
                <td style={{ textAlign: 'center', padding: '8px 0' }}>
                  {song.isPending ? (
                    <span style={{ background: theme.pending, color: '#fff', borderRadius: 12, padding: '2px 12px', fontWeight: 600, fontSize: 14 }}>Pending</span>
                  ) : (
                    <span style={{ background: theme.siap, color: '#fff', borderRadius: 12, padding: '2px 12px', fontWeight: 600, fontSize: 14 }}>Siap</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
