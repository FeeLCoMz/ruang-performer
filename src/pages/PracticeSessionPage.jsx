import React, { useState, useEffect } from 'react';
import { fetchBands, fetchPracticeSessions, createPracticeSession, updatePracticeSession, deletePracticeSession, fetchSongs } from '../apiClient.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';

export default function PracticeSessionPage() {
  const [sessions, setSessions] = useState([]);
  const [bands, setBands] = useState([]);
  const [songs, setSongs] = useState([]);
  const [selectedBandId, setSelectedBandId] = useState('');
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
  const [formError, setFormError] = useState('');

  // Fetch bands and songs on mount
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

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎯 Sesi Latihan</h1>
          <p>Kelola latihan band mu</p>
        </div>
        <button className="btn-base" onClick={() => {
          setShowForm(true);
          setEditSession(null);
          setFormData({
            bandId: selectedBandId || '',
            date: new Date().toISOString().split('T')[0],
            duration: '',
            songs: [],
            notes: ''
          });
          setFormError('');
        }}>
          <PlusIcon size={18} /> Buat Sesi
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditSession(null); }}>
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
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', backgroundColor: 'var(--primary-bg)' }}>
                  {songs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', padding: '8px' }}>Tidak ada lagu</div>
                  ) : (
                    songs.map(song => (
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
                        <span style={{ fontSize: '0.9em' }}>{song.title} {song.artist ? `- ${song.artist}` : ''}</span>
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
                  className="btn-base"
                  onClick={() => { setShowForm(false); setEditSession(null); }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-base"
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
              <button className="btn-base" onClick={() => setDeleteSession(null)}>Batal</button>
              <button
                className="btn-base"
                style={{ backgroundColor: 'var(--error)', color: 'white' }}
                onClick={handleDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & List */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
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
      </div>

      {/* Content */}
      {loading && <ListSkeleton count={5} />}
      {error && <div className="error-text">{error}</div>}
      
      {!loading && sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Belum ada sesi latihan
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {sessions.map(session => (
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
                <button
                  className="icon-btn-small"
                  onClick={() => handleEdit(session)}
                  title="Edit"
                >
                  <EditIcon size={16} />
                </button>
                <button
                  className="icon-btn-small delete-btn"
                  onClick={() => setDeleteSession(session)}
                  title="Hapus"
                >
                  <DeleteIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
