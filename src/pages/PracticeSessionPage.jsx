import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PERMISSIONS, hasPermission } from '../utils/permissionUtils.js';
import { usePermission } from '../hooks/usePermission.js';
import { fetchBands, fetchPracticeSessions, createPracticeSession, updatePracticeSession, deletePracticeSession, fetchSongs } from '../apiClient.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';

export default function PracticeSessionPage() {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const getPersistedState = () => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('practiceSessionPageState');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const persistedState = getPersistedState();

  const [sessions, setSessions] = useState([]);
  const [bands, setBands] = useState([]);
  const [songs, setSongs] = useState([]);
  const [selectedBandId, setSelectedBandId] = useState(persistedState.selectedBandId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [deleteSession, setDeleteSession] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    bandId: '',
    date: new Date().toISOString().split('T')[0],
    duration: '',
    songs: [],
    notes: ''
  });
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [debouncedSongSearchQuery, setDebouncedSongSearchQuery] = useState('');
  const [songMasteryFilter, setSongMasteryFilter] = useState('all');
  const [sessionSortBy, setSessionSortBy] = useState(persistedState.sessionSortBy || 'date-desc');
  const [sessionDateFilter, setSessionDateFilter] = useState(persistedState.sessionDateFilter || 'all');
  const [customDateFrom, setCustomDateFrom] = useState(persistedState.customDateFrom || '');
  const [customDateTo, setCustomDateTo] = useState(persistedState.customDateTo || '');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSongSearchQuery(songSearchQuery);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [songSearchQuery]);

  const normalizedSongSearchQuery = debouncedSongSearchQuery.trim().toLowerCase();

  const isSongMasteredByCurrentUser = (song) => {
    if (!song) return false;
    if (song.isMasteredByCurrentUser) return true;
    if (!Array.isArray(song.masteredBy) || !currentUserId) return false;
    return song.masteredBy.some((entry) => String(entry?.userId) === String(currentUserId));
  };

  const filteredSongs = useMemo(() => {
    let result = [...songs];

    if (normalizedSongSearchQuery) {
      result = result.filter(song => {
        const songSearchText = `${song.title || ''} ${song.artist || ''}`.toLowerCase();
        return songSearchText.includes(normalizedSongSearchQuery);
      });
    }

    if (songMasteryFilter === 'mastered') {
      result = result.filter((song) => isSongMasteredByCurrentUser(song));
    }

    if (songMasteryFilter === 'unmastered') {
      result = result.filter((song) => !isSongMasteredByCurrentUser(song));
    }

    return result;
  }, [songs, normalizedSongSearchQuery, songMasteryFilter, currentUserId]);

  const sortedSessions = useMemo(() => {
    let list = [...sessions];

    if (sessionDateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let startDate = null;
      let endDate = null;

      if (sessionDateFilter === 'this-week') {
        const day = today.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        startDate = new Date(today);
        startDate.setDate(today.getDate() - diffToMonday);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      }

      if (sessionDateFilter === 'last-30-days') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = today;
      }

      if (sessionDateFilter === 'custom') {
        if (customDateFrom) {
          startDate = new Date(customDateFrom);
          startDate.setHours(0, 0, 0, 0);
        }
        if (customDateTo) {
          endDate = new Date(customDateTo);
          endDate.setHours(0, 0, 0, 0);
        }
      }

      list = list.filter((session) => {
        const sessionDate = new Date(session.date || 0);
        if (Number.isNaN(sessionDate.getTime())) return false;
        sessionDate.setHours(0, 0, 0, 0);

        if (startDate && sessionDate < startDate) return false;
        if (endDate && sessionDate > endDate) return false;
        return true;
      });
    }

    list.sort((a, b) => {
      if (sessionSortBy === 'date-asc' || sessionSortBy === 'date-desc') {
        const aTime = new Date(a.date || 0).getTime();
        const bTime = new Date(b.date || 0).getTime();
        return sessionSortBy === 'date-asc' ? aTime - bTime : bTime - aTime;
      }

      if (sessionSortBy === 'duration-desc') {
        return (b.duration || 0) - (a.duration || 0);
      }

      if (sessionSortBy === 'songs-desc') {
        return (b.songs?.length || 0) - (a.songs?.length || 0);
      }

      return 0;
    });

    return list;
  }, [sessions, sessionSortBy, sessionDateFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('practiceSessionPageState', JSON.stringify({
      selectedBandId,
      sessionSortBy,
      sessionDateFilter,
      customDateFrom,
      customDateTo
    }));
  }, [selectedBandId, sessionSortBy, sessionDateFilter, customDateFrom, customDateTo]);

  const progressSummary = useMemo(() => {
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);

    const sessionsLast30Days = sessions.filter((session) => {
      const sessionDate = new Date(session.date || 0);
      return !Number.isNaN(sessionDate.getTime()) && sessionDate >= last30Days;
    });

    const totalMinutesLast30Days = sessionsLast30Days.reduce((sum, session) => {
      return sum + (Number(session.duration) || 0);
    }, 0);

    const masteredSongsCount = songs.filter((song) => isSongMasteredByCurrentUser(song)).length;
    const masteryPercentage = songs.length > 0
      ? Math.round((masteredSongsCount / songs.length) * 100)
      : 0;

    return {
      sessionsLast30Days: sessionsLast30Days.length,
      totalMinutesLast30Days,
      masteredSongsCount,
      masteryPercentage,
      totalSongs: songs.length
    };
  }, [sessions, songs, currentUserId]);

  // Helper: get userBandInfo for a bandId
  const getUserBandInfo = (bandId) => {
    if (!bandId) return { role: user?.role || 'member' };
    const band = bands.find(b => b.id === bandId);
    return band ? { role: band.role || (band.isOwner ? 'owner' : 'member') } : { role: user?.role || 'member' };
  };

  // Permission hook for selected band (for create)
  const { can: canSelectedBand } = usePermission(selectedBandId, getUserBandInfo(selectedBandId));

  // Pure function for permission check per session (no hook)
  const canSession = (session, action) => {
    const bandId = session.bandId;
    const userBandInfo = getUserBandInfo(bandId);
    if (!userBandInfo || !userBandInfo.role) return false;
    return hasPermission(userBandInfo.role, action);
  };
  useEffect(() => {
    updatePageMeta(pageMetadata.practice);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [bandsData, songsData] = await Promise.all([
          fetchBands(),
          fetchSongs()
        ]);
        setBands(bandsData || []);
        setSongs(songsData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Fetch practice sessions
  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const data = await fetchPracticeSessions(selectedBandId || null);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [selectedBandId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.date) {
      setFormError('Tanggal diperlukan');
      return;
    }

    try {
      if (editSession) {
        await updatePracticeSession(editSession.id, formData);
      } else {
        await createPracticeSession(formData);
      }
      
      // Refresh sessions
      const data = await fetchPracticeSessions(selectedBandId || null);
      setSessions(Array.isArray(data) ? data : []);
      
      setShowForm(false);
      setEditSession(null);
      setSongSearchQuery('');
      setSongMasteryFilter('all');
      setFormData({
        bandId: '',
        date: new Date().toISOString().split('T')[0],
        duration: '',
        songs: [],
        notes: ''
      });
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan sesi');
    }
  };

  const handleEdit = (session) => {
    setEditSession(session);
    setFormData({
      bandId: session.bandId || '',
      date: session.date,
      duration: session.duration || '',
      songs: session.songs || [],
      notes: session.notes || ''
    });
    setSongSearchQuery('');
    setSongMasteryFilter('all');
    setShowForm(true);
    setFormError('');
  };

  const handleDelete = async () => {
    if (!deleteSession) return;
    
    try {
      await deletePracticeSession(deleteSession.id);
      const data = await fetchPracticeSessions(selectedBandId || null);
      setSessions(Array.isArray(data) ? data : []);
      setDeleteSession(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderHighlightedText = (text, query) => {
    if (!query) return text;

    const source = text || '';
    const escapedQuery = escapeRegExp(query);
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    const parts = source.split(regex);
    const normalizedQuery = query.toLowerCase();

    return parts.map((part, idx) => (
      part.toLowerCase() === normalizedQuery
        ? <mark key={`${part}-${idx}`}>{part}</mark>
        : <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>
    ));
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎯 Sesi Latihan</h1>
          <p>Kelola latihan band mu</p>
        </div>
        {canSelectedBand(PERMISSIONS.SETLIST_CREATE) && (
          <button className="btn" onClick={() => {
            setShowForm(true);
            setEditSession(null);
            setFormData({
              bandId: selectedBandId || '',
              date: new Date().toISOString().split('T')[0],
              duration: '',
              songs: [],
              notes: ''
            });
            setSongSearchQuery('');
            setSongMasteryFilter('all');
            setFormError('');
          }}>
            <PlusIcon size={18} /> Buat Sesi
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditSession(null); setSongSearchQuery(''); setSongMasteryFilter('all'); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editSession ? 'Edit Sesi Latihan' : 'Buat Sesi Latihan Baru'}</h2>
            <form onSubmit={handleSubmit} className="form-section">
              <div>
                <label className="form-label">Band (opsional)</label>
                <select
                  value={formData.bandId}
                  onChange={(e) => setFormData({ ...formData, bandId: e.target.value })}
                  className="modal-input"
                >
                  <option value="">-- Pilih Band --</option>
                  {bands.map(band => (
                    <option key={band.id} value={band.id}>{band.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Tanggal *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="modal-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Durasi (menit, opsional)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value ? parseInt(e.target.value) : '' })}
                  className="modal-input"
                  placeholder="90"
                  min="0"
                />
              </div>

              <div>
                <label className="form-label">Lagu yang Dilatih</label>
                <input
                  type="text"
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  className="modal-input"
                  placeholder="Cari lagu atau artis..."
                />
                <select
                  value={songMasteryFilter}
                  onChange={(e) => setSongMasteryFilter(e.target.value)}
                  className="modal-input"
                  style={{ marginTop: '8px' }}
                >
                  <option value="all">Semua status mastery</option>
                  <option value="mastered">Sudah dikuasai saya</option>
                  <option value="unmastered">Belum dikuasai saya</option>
                </select>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', backgroundColor: 'var(--primary-bg)' }}>
                  {songs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', padding: '8px' }}>Tidak ada lagu</div>
                  ) : filteredSongs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', padding: '8px' }}>
                      Lagu tidak ditemukan
                    </div>
                  ) : (
                    filteredSongs.map(song => (
                      <label key={song.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.songs.includes(song.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, songs: [...formData.songs, song.id] });
                            } else {
                              setFormData({ ...formData, songs: formData.songs.filter(id => id !== song.id) });
                            }
                          }}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9em' }}>
                          {renderHighlightedText(song.title || '', normalizedSongSearchQuery)}
                          {song.artist ? (
                            <>
                              {' - '}
                              {renderHighlightedText(song.artist, normalizedSongSearchQuery)}
                            </>
                          ) : ''}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="modal-input"
                  rows="3"
                  placeholder="Contoh: Fokus pada chord transitions, tempo konsisten..."
                />
              </div>

              {formError && <div className="error-text">{formError}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowForm(false);
                    setEditSession(null);
                    setSongSearchQuery('');
                    setSongMasteryFilter('all');
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: 'var(--primary-accent)', color: 'white' }}
                >
                  {editSession ? 'Simpan Perubahan' : 'Buat Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteSession && (
        <div className="modal-overlay" onClick={() => setDeleteSession(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: 'var(--error)' }}>Hapus Sesi Latihan?</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Yakin ingin menghapus sesi latihan tanggal <b>{new Date(deleteSession.date).toLocaleDateString('id-ID')}</b>?
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn" onClick={() => setDeleteSession(null)}>Batal</button>
              <button
                className="btn"
                style={{ backgroundColor: 'var(--error)', color: 'white' }}
                onClick={handleDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Summary */}
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>Sesi 30 Hari</div>
          <div style={{ fontWeight: '700', fontSize: '1.25em', marginTop: '4px' }}>{progressSummary.sessionsLast30Days}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>Total Menit 30 Hari</div>
          <div style={{ fontWeight: '700', fontSize: '1.25em', marginTop: '4px' }}>{progressSummary.totalMinutesLast30Days}</div>
        </div>
        <div className="card" style={{ padding: '14px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>Mastery Lagu</div>
          <div style={{ fontWeight: '700', fontSize: '1.25em', marginTop: '4px' }}>
            {progressSummary.masteryPercentage}%
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
            {progressSummary.masteredSongsCount}/{progressSummary.totalSongs} lagu
          </div>
        </div>
      </div>

      {/* Filter & List */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          value={selectedBandId}
          onChange={(e) => setSelectedBandId(e.target.value)}
          className="modal-input"
          style={{ maxWidth: '300px' }}
        >
          <option value="">-- Semua Band --</option>
          {bands.map(band => (
            <option key={band.id} value={band.id}>{band.name}</option>
          ))}
        </select>
        <select
          value={sessionSortBy}
          onChange={(e) => setSessionSortBy(e.target.value)}
          className="modal-input"
          style={{ maxWidth: '260px' }}
        >
          <option value="date-desc">Urutkan: Tanggal terbaru</option>
          <option value="date-asc">Urutkan: Tanggal terlama</option>
          <option value="duration-desc">Urutkan: Durasi terlama</option>
          <option value="songs-desc">Urutkan: Lagu terbanyak</option>
        </select>
        <select
          value={sessionDateFilter}
          onChange={(e) => setSessionDateFilter(e.target.value)}
          className="modal-input"
          style={{ maxWidth: '260px' }}
        >
          <option value="all">Rentang: Semua tanggal</option>
          <option value="this-week">Rentang: Minggu ini</option>
          <option value="last-30-days">Rentang: 30 hari terakhir</option>
          <option value="custom">Rentang: Custom</option>
        </select>
        {sessionDateFilter === 'custom' && (
          <>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="modal-input"
              style={{ maxWidth: '180px' }}
              aria-label="Tanggal mulai"
            />
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="modal-input"
              style={{ maxWidth: '180px' }}
              aria-label="Tanggal selesai"
            />
          </>
        )}
      </div>

      {/* Content */}
      {loading && <ListSkeleton count={5} />}
      {error && <div className="error-text">{error}</div>}
      
      {!loading && sortedSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Belum ada sesi latihan
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {sortedSessions.map(session => (
            <div
              key={session.id}
              style={{
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                transition: 'all 0.2s'
              }}
              className="hover-lift"
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '1.05em' }}>
                  📅 {new Date(session.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                {session.bandName && (
                  <div style={{ color: 'var(--primary-accent)', fontSize: '0.9em', marginBottom: '4px', fontWeight: '500' }}>
                    🎸 {session.bandName}
                  </div>
                )}

                {session.duration && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    ⏱️ {formatDuration(session.duration)}
                  </div>
                )}

                {session.songs?.length > 0 && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    🎵 {session.songs.length} lagu dilatih
                  </div>
                )}

                {session.notes && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', padding: '8px', backgroundColor: 'var(--primary-bg)', borderRadius: '6px' }}>
                    "{session.notes}"
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                {/* Permission for edit/delete per session (pure function, not hook) */}
                {canSession(session, PERMISSIONS.SETLIST_EDIT) && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEdit(session)}
                    title="Edit"
                  >
                    <EditIcon size={16} />
                  </button>
                )}
                {canSession(session, PERMISSIONS.SETLIST_DELETE) && (
                  <button
                    className="btn btn-red"
                    onClick={() => setDeleteSession(session)}
                    title="Hapus"
                  >
                    <DeleteIcon size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
