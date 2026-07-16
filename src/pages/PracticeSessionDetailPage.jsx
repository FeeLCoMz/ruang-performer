import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import { PERMISSIONS, hasPermission } from '../utils/permissionUtils.js';

export default function PracticeSessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [bands, setBands] = useState([]);
  const [songSearch, setSongSearch] = useState('');
  const [addSongSearch, setAddSongSearch] = useState('');
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [selectedSongIdsToAdd, setSelectedSongIdsToAdd] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const normalizeSongMeta = (songIds, rawSongMeta) => {
    const source = rawSongMeta && typeof rawSongMeta === 'object' && !Array.isArray(rawSongMeta)
      ? rawSongMeta
      : {};

    const nextMeta = {};
    songIds.forEach((songId) => {
      const item = source[String(songId)] || {};
      const parsedRating = Number.parseInt(item.rating, 10);
      nextMeta[String(songId)] = {
        practiced: item.practiced === true,
        rating: Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : null,
      };
    });
    return nextMeta;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sessionData, songsData, bandsData, setlistsData] = await Promise.all([
          apiClient.fetchPracticeSessionById(id),
          apiClient.fetchSongs(),
          apiClient.fetchBands(),
          apiClient.fetchSetLists(),
        ]);
        const normalizedSongIds = Array.isArray(sessionData?.songs)
          ? sessionData.songs.map((songId) => String(songId))
          : [];
        const normalizedSession = {
          ...sessionData,
          songs: normalizedSongIds,
          songMeta: normalizeSongMeta(normalizedSongIds, sessionData?.songMeta),
        };

        setSession(normalizedSession);
        setSongs(Array.isArray(songsData) ? songsData : []);
        setBands(Array.isArray(bandsData) ? bandsData : []);
        setSetlists(Array.isArray(setlistsData) ? setlistsData : []);
        setError('');
      } catch (err) {
        setSession(null);
        setSongs([]);
        setSetlists([]);
        setBands([]);
        setError(err?.message || 'Gagal memuat detail sesi latihan');
      }
      setLoading(false);
    })();
  }, [id]);

  const currentBandRole = useMemo(() => {
    if (!session?.bandId) return null;
    const band = bands.find((item) => String(item.id) === String(session.bandId));
    return band?.userRole || band?.role || (band?.isOwner ? 'owner' : null);
  }, [bands, session?.bandId]);

  const canEditSession = Boolean(currentBandRole && hasPermission(currentBandRole, PERMISSIONS.SETLIST_EDIT));

  const bandScopedSongs = useMemo(() => {
    if (!session?.bandId) return [];
    return songs.filter((song) => {
      const songBandId = song?.bandId ? String(song.bandId) : '';
      return songBandId === String(session.bandId) || !songBandId;
    });
  }, [songs, session?.bandId]);

  const filteredSessionSongs = useMemo(() => {
    if (!Array.isArray(session?.songs)) return [];
    const keyword = songSearch.trim().toLowerCase();
    if (!keyword) return session.songs;

    return session.songs.filter((songId) => {
      const song = songs.find((item) => String(item.id) === String(songId));
      const haystack = `${song?.title || ''} ${song?.artist || ''}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [session?.songs, songs, songSearch]);

  const addableSongs = useMemo(() => {
    const selected = new Set((session?.songs || []).map((songId) => String(songId)));
    const keyword = addSongSearch.trim().toLowerCase();

    return bandScopedSongs
      .filter((song) => !selected.has(String(song.id)))
      .filter((song) => {
        if (!keyword) return true;
        const haystack = `${song?.title || ''} ${song?.artist || ''}`.toLowerCase();
        return haystack.includes(keyword);
      });
  }, [bandScopedSongs, session?.songs, addSongSearch]);

  const getSongMeta = (songId) => {
    const source = session?.songMeta && typeof session.songMeta === 'object' ? session.songMeta : {};
    const item = source[String(songId)] || {};
    const parsedRating = Number.parseInt(item.rating, 10);
    return {
      practiced: item.practiced === true,
      rating: Number.isInteger(parsedRating) ? parsedRating : null,
    };
  };

  const persistSession = async (nextSession) => {
    if (!nextSession) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.updatePracticeSession(id, {
        date: nextSession.date,
        duration: nextSession.duration,
        notes: nextSession.notes,
        songs: nextSession.songs,
        songMeta: normalizeSongMeta(nextSession.songs, nextSession.songMeta),
      });
      setSession(nextSession);
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan perubahan sesi');
    } finally {
      setSaving(false);
    }
  };

  const addSelectedSongs = async () => {
    if (!session || selectedSongIdsToAdd.length === 0) return;
    const mergedSongs = [...session.songs, ...selectedSongIdsToAdd.map((songId) => String(songId))];
    const nextSongMeta = {
      ...(session.songMeta || {}),
    };
    selectedSongIdsToAdd.forEach((songId) => {
      const normalizedId = String(songId);
      if (!nextSongMeta[normalizedId]) {
        nextSongMeta[normalizedId] = { practiced: false, rating: null };
      }
    });

    await persistSession({
      ...session,
      songs: mergedSongs,
      songMeta: nextSongMeta,
    });
    setSelectedSongIdsToAdd([]);
    setAddSongSearch('');
    setShowAddSongModal(false);
  };

  const removeSongFromSession = async (songId) => {
    if (!session) return;
    const normalizedId = String(songId);
    const nextSongs = session.songs.filter((idItem) => String(idItem) !== normalizedId);
    const nextSongMeta = { ...(session.songMeta || {}) };
    delete nextSongMeta[normalizedId];

    await persistSession({
      ...session,
      songs: nextSongs,
      songMeta: nextSongMeta,
    });
  };

  const moveSong = async (songId, direction) => {
    if (!session) return;
    const currentIndex = session.songs.findIndex((item) => String(item) === String(songId));
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= session.songs.length) return;

    const nextSongs = [...session.songs];
    const [moved] = nextSongs.splice(currentIndex, 1);
    nextSongs.splice(targetIndex, 0, moved);

    await persistSession({
      ...session,
      songs: nextSongs,
    });
  };

  const updateSongPracticeMeta = async (songId, patch) => {
    if (!session) return;
    const normalizedId = String(songId);
    const previous = getSongMeta(normalizedId);
    const nextValue = {
      practiced: patch.practiced ?? previous.practiced,
      rating: patch.rating !== undefined ? patch.rating : previous.rating,
    };

    if (nextValue.practiced !== true) {
      nextValue.rating = null;
    }

    await persistSession({
      ...session,
      songMeta: {
        ...(session.songMeta || {}),
        [normalizedId]: nextValue,
      },
    });
  };

  const getSongLabelById = (songId) => {
    const song = songs.find((item) => String(item.id) === String(songId));
    if (!song) return 'Lagu tidak ditemukan';
    return song.artist ? `${song.title} - ${song.artist}` : song.title;
  };

  const getSongById = (songId) => songs.find((item) => String(item.id) === String(songId));

  const songOrderMap = useMemo(() => {
    const map = {};
    (session?.songs || []).forEach((songId, idx) => {
      map[String(songId)] = idx;
    });
    return map;
  }, [session?.songs]);

  const songSetlistCountMap = useMemo(() => {
    const map = {};
    (setlists || []).forEach((setlist) => {
      if (!Array.isArray(setlist?.songs)) return;
      setlist.songs.forEach((songId) => {
        const key = String(songId);
        map[key] = (map[key] || 0) + 1;
      });
    });
    return map;
  }, [setlists]);

  const songExists = (songId) => songs.some((item) => String(item.id) === String(songId));

  if (loading) return <div className="page-container"><span className="loading-skeleton" style={{width:120,height:32}} /></div>;
  if (!session) return <div className="page-container"><h2>Practice session tidak ditemukan</h2></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>💪 Latihan Band: {session.bandName || 'Session'}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Detail sesi latihan dan progres setiap lagu
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {saving && <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Menyimpan...</span>}
          <button className="btn" onClick={() => navigate(-1)}>← Kembali</button>
        </div>
      </div>

      {error && (
        <div className="error-text" style={{ marginBottom: '12px' }}>{error}</div>
      )}

      <div className="card">
        <p><b>Tanggal:</b> {new Date(session.date).toLocaleString('id-ID')}</p>
        <p><b>Lokasi:</b> {session.location || '-'}</p>
        <p><b>Catatan:</b> {session.notes || '-'}</p>
      </div>

      <div className="filter-container" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={songSearch}
            onChange={(event) => setSongSearch(event.target.value)}
            className="modal-input"
            placeholder="Cari lagu dalam sesi ini..."
            style={{ maxWidth: '360px' }}
          />
          {canEditSession && (
            <button
              type="button"
              className="btn"
              onClick={() => setShowAddSongModal(true)}
              disabled={saving}
            >
              + Tambah Lagu
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <p><b>Lagu yang Dilatih ({session.songs?.length || 0}):</b></p>
        {!Array.isArray(session.songs) || session.songs.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada lagu dipilih</p>
          </div>
        ) : filteredSessionSongs.length === 0 ? (
          <div className="empty-state">
            <p>Tidak ada lagu yang cocok dengan pencarian</p>
          </div>
        ) : (
          <div className="song-list-container">
            {filteredSessionSongs.map((songId) => {
              const meta = getSongMeta(songId);
              const song = getSongById(songId);
              const songNumber = (songOrderMap[String(songId)] ?? 0) + 1;

              return (
                <div
                  key={songId}
                  className={`song-item${meta.practiced ? ' song-item-completed' : ''}`}
                >
                  <div className="song-info">
                    <div className="song-number">{songNumber}.</div>
                    <h3 className="song-title">
                      {songExists(songId) ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/songs/view/${songId}`)}
                          className="btn"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-primary)',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                          }}
                        >
                          {getSongLabelById(songId)}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{getSongLabelById(songId)}</span>
                      )}
                      {meta.practiced && <span className="song-completed-badge">✓</span>}
                    </h3>
                    <div className="song-meta">
                      {song?.artist && <span>👤 {song.artist}</span>}
                      {song?.key && <span>🎹 {song.key}</span>}
                      {song?.tempo && <span>⏱️ {song.tempo} BPM</span>}
                      {song?.genre && <span>🎸 {song.genre}</span>}
                      <span>📋 {songSetlistCountMap[String(songId)] || 0} setlist</span>
                      <span>{meta.practiced ? '✅ Sudah dilatih' : '⏳ Belum dilatih'}</span>
                      {Number.isInteger(meta.rating) && <span>⭐ {meta.rating}</span>}
                    </div>
                  </div>

                  <div className="song-actions">
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={meta.practiced === true}
                        disabled={!canEditSession || saving}
                        onChange={(event) => updateSongPracticeMeta(songId, { practiced: event.target.checked })}
                      />
                      Latih
                    </label>
                    <select
                      className="modal-input"
                      style={{ maxWidth: '110px' }}
                      value={meta.rating ?? ''}
                      disabled={!canEditSession || saving || meta.practiced !== true}
                      onChange={(event) => {
                        const rating = event.target.value ? Number.parseInt(event.target.value, 10) : null;
                        updateSongPracticeMeta(songId, { rating });
                      }}
                    >
                      <option value="">Rating</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                    {canEditSession && (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary song-action-mini"
                          onClick={() => moveSong(songId, 'up')}
                          disabled={saving || songNumber === 1}
                          title="Pindah ke atas"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary song-action-mini"
                          onClick={() => moveSong(songId, 'down')}
                          disabled={saving || songNumber === session.songs.length}
                          title="Pindah ke bawah"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-red"
                          onClick={() => removeSongFromSession(songId)}
                          disabled={saving}
                          title="Hapus lagu dari sesi"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddSongModal && (
        <div className="modal-overlay" onClick={() => setShowAddSongModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>Tambah Lagu ke Sesi</h2>
            <input
              type="text"
              value={addSongSearch}
              onChange={(event) => setAddSongSearch(event.target.value)}
              className="modal-input"
              placeholder="Cari judul atau artis..."
              style={{ marginBottom: '12px' }}
            />

            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
              {addableSongs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Tidak ada lagu yang bisa ditambahkan.</div>
              ) : (
                addableSongs.map((song) => {
                  const checked = selectedSongIdsToAdd.includes(String(song.id));
                  return (
                    <label key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const normalizedId = String(song.id);
                          if (event.target.checked) {
                            setSelectedSongIdsToAdd((prev) => [...prev, normalizedId]);
                          } else {
                            setSelectedSongIdsToAdd((prev) => prev.filter((item) => String(item) !== normalizedId));
                          }
                        }}
                      />
                      <span>{song.artist ? `${song.title} - ${song.artist}` : song.title}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button type="button" className="btn" onClick={addSelectedSongs} disabled={saving || selectedSongIdsToAdd.length === 0}>
                Tambah {selectedSongIdsToAdd.length > 0 ? `(${selectedSongIdsToAdd.length})` : ''}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddSongModal(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
