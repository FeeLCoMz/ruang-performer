import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { fetchBands, fetchGigs, fetchSetLists, createGig, updateGig, deleteGig } from '../apiClient.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';

export default function GigPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [bands, setBands] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [selectedBandId, setSelectedBandId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editGig, setEditGig] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // Pisahkan tanggal dan waktu untuk input
  const today = new Date();
  const defaultDate = today.toISOString().split('T')[0];
  const defaultTime = today.toTimeString().slice(0,5);
  const [formData, setFormData] = useState({
    bandId: '',
    date: defaultDate,
    time: defaultTime,
    venue: '',
    city: '',
    fee: '',
    setlistId: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Helper: get userBandInfo for a bandId
  const getUserBandInfo = React.useCallback((bandId) => {
    if (!user) return null;
    const band = bands.find(b => b.id === bandId);
    if (band && band.userRole) {
      return { role: band.userRole, bandId };
    }
    if (band && band.isOwner) {
      return { role: 'owner', bandId };
    }
    return { role: user?.role || 'member', bandId };
  }, [bands, user]);

  // Permission hooks for selected band (letakkan setelah getUserBandInfo)
  const userBandInfo = getUserBandInfo(selectedBandId || '');
  const permissionForSelectedBand = usePermission(selectedBandId || '', userBandInfo);
  // Form state
  // (Removed duplicate formData declaration)

  // Fetch bands and setlists on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [bandsData, setlistsData] = await Promise.all([
          fetchBands(),
          fetchSetLists()
        ]);
        setBands(bandsData || []);
        setSetlists(setlistsData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Fetch gigs
  useEffect(() => {
    const loadGigs = async () => {
      setLoading(true);
      try {
        const data = await fetchGigs(selectedBandId || null);
        setGigs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load gigs');
      } finally {
        setLoading(false);
      }
    };
    loadGigs();
  }, [selectedBandId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.date) {
      setFormError('Tanggal diperlukan');
      return;
    }
    // Gabungkan tanggal dan waktu ke ISO string
    let dateTimeStr = formData.date;
    if (formData.time) {
      dateTimeStr += 'T' + formData.time;
    }
    // Pastikan format ISO lengkap
    const isoDate = new Date(dateTimeStr).toISOString();
    const submitData = { ...formData, date: isoDate };
    delete submitData.time;

    try {
      if (editGig) {
        await updateGig(editGig.id, submitData);
      } else {
        await createGig(submitData);
      }
      // Refresh gigs
      const data = await fetchGigs(selectedBandId || null);
      setGigs(Array.isArray(data) ? data : []);
      setShowForm(false);
      setEditGig(null);
      setFormData({
        bandId: '',
        date: defaultDate,
        time: defaultTime,
        venue: '',
        city: '',
        fee: '',
        setlistId: '',
        notes: ''
      });
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan gig');
    }
  };

  const handleEdit = (gig) => {
    setEditGig(gig);
    // Pisahkan tanggal dan waktu dari ISO string
    let date = gig.date ? new Date(gig.date) : today;
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0,5);
    setFormData({
      bandId: gig.bandId || '',
      date: dateStr,
      time: timeStr,
      venue: gig.venue || '',
      city: gig.city || '',
      fee: gig.fee || '',
      setlistId: gig.setlistId || '',
      notes: gig.notes || ''
    });
    setShowForm(true);
    setFormError('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteGig(deleteConfirm.id);
      const data = await fetchGigs(selectedBandId || null);
      setGigs(Array.isArray(data) ? data : []);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎤 Jadwal Konser</h1>
          <p>Kelola pertunjukan band mu</p>
        </div>
        {/* Permission: Only show if user can create gig for selected band */}
        {(() => {
          // If no band selected, allow if user is authenticated (personal gig)
          if (!selectedBandId && user) {
            return (
              <button className="btn" onClick={() => {
                setShowForm(true);
                setEditGig(null);
                setFormData({
                  bandId: selectedBandId || '',
                  date: new Date().toISOString().split('T')[0],
                  venue: '',
                  city: '',
                  fee: '',
                  setlistId: '',
                  notes: ''
                });
                setFormError('');
              }}>
                <PlusIcon size={18} /> Buat Konser
              </button>
            );
          }
          // If band selected, check permission
          if (userBandInfo && permissionForSelectedBand.can('gig:edit')) {
            return (
              <button className="btn" onClick={() => {
                setShowForm(true);
                setEditGig(null);
                setFormData({
                  bandId: selectedBandId || '',
                  date: new Date().toISOString().split('T')[0],
                  venue: '',
                  city: '',
                  fee: '',
                  setlistId: '',
                  notes: ''
                });
                setFormError('');
              }}>
                <PlusIcon size={18} /> Buat Konser
              </button>
            );
          }
          return null;
        })()}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditGig(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editGig ? 'Edit Jadwal Konser' : 'Buat Jadwal Konser Baru'}</h2>
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

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Tanggal *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="modal-input"
                    required
                  />
                </div>
                <div style={{ width: 120 }}>
                  <label className="form-label">Waktu</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="modal-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Lokasi/Venue</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="modal-input"
                  placeholder="Contoh: Balai Budaya Jakarta"
                />
              </div>

              <div>
                <label className="form-label">Kota</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="modal-input"
                  placeholder="Contoh: Jakarta"
                />
              </div>

              <div>
                <label className="form-label">Fee/Bayaran (Rp, opsional)</label>
                <input
                  type="number"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value ? parseFloat(e.target.value) : '' })}
                  className="modal-input"
                  placeholder="1500000"
                  min="0"
                />
              </div>

              <div>
                <label className="form-label">Setlist yang Digunakan (opsional)</label>
                <select
                  value={formData.setlistId}
                  onChange={(e) => setFormData({ ...formData, setlistId: e.target.value })}
                  className="modal-input"
                >
                  <option value="">-- Pilih Setlist --</option>
                  {setlists.map(setlist => (
                    <option key={setlist.id} value={setlist.id}>
                      {setlist.name} ({setlist.songs?.length || 0} lagu)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="modal-input"
                  rows="3"
                  placeholder="Contoh: Konser di festival musik, performa bagus..."
                />
              </div>

              {formError && <div className="error-text form-error">{formError}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn "
                  onClick={() => { setShowForm(false); setEditGig(null); }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn "
                  style={{ background: '#4f8cff', color: '#fff', fontWeight: 600 }}
                >
                  {editGig ? 'Simpan Perubahan' : 'Buat Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: 'var(--error)' }}>Hapus Jadwal Konser?</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Yakin ingin menghapus konser di <b>{deleteConfirm.venue || deleteConfirm.city || 'lokasi ini'}</b> tanggal <b>{new Date(deleteConfirm.date).toLocaleDateString('id-ID')}</b>?
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Batal</button>
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
      
      {!loading && gigs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Belum ada jadwal konser
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {gigs.map(gig => (
            <div
              key={gig.id}
              style={{
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              className="hover-lift"
              onClick={() => navigate(`/gigs/${gig.id}`)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '1.05em' }}>
                  🎤 {new Date(gig.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {gig.date && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.95em', marginLeft: 8 }}>
                      {new Date(gig.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                
                {gig.bandName && (
                  <div style={{ color: 'var(--primary-accent)', fontSize: '0.9em', marginBottom: '4px', fontWeight: '500' }}>
                    🎸 {gig.bandName}
                  </div>
                )}

                {(gig.venue || gig.city) && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    📍 {gig.venue}{gig.venue && gig.city ? ', ' : ''}{gig.city}
                  </div>
                )}

                {gig.fee && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    💰 {formatCurrency(gig.fee)}
                  </div>
                )}

                {gig.setlistName && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    🎵 Setlist: {gig.setlistName}
                  </div>
                )}

                {gig.notes && (
                  <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', padding: '8px', backgroundColor: 'var(--primary-bg)', borderRadius: '6px' }}>
                    "{gig.notes}"
                  </div>
                )}
              </div>

              <div
                className="setlist-actions"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  // Permission: Only show edit/delete if user can edit/delete this gig
                  // Allow edit/delete if:
                  // - user is gig creator (legacy/personal gig)
                  // - or has gig:edit permission for the band
                  const isCreator = gig.userId && user && gig.userId === (user.userId || user.id);
                  const canEdit = isCreator || (userBandInfo && permissionForSelectedBand.can('gig:edit'));
                  const canDelete = isCreator || (userBandInfo && permissionForSelectedBand.can('gig:edit'));
                  if (!canEdit && !canDelete) return null;
                  return (
                    <>
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(gig)}
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '0.85em' }}
                          title="Edit"
                        >
                          <EditIcon size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteConfirm(gig)}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.85em',
                            background: '#dc2626',
                            borderColor: '#b91c1c',
                            color: '#fff'
                          }}
                          title="Hapus"
                        >
                          <DeleteIcon size={16} />
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
