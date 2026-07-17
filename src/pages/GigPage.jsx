import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { fetchBands, fetchGigs, fetchSetLists, createGig, updateGig, deleteGig } from '../apiClient.js';
import {
  createGigScheduleText,
  createGigCalendar,
  downloadTextFile,
  downloadCalendarFile
} from '../utils/scheduleShareUtils.js';
import '../styles/setlist-poster.css';
import { downloadCalendarAsJPG, downloadCalendarAsPDF } from '../utils/calendarDownloadUtil.js';
import PlusIcon from '../components/PlusIcon.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';
import CalendarView from '../components/CalendarView.jsx';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const posterRef = useRef(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterError, setPosterError] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'calendar'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = terbaru, 'asc' = terlama
  const today = new Date();
  const [shareMonth, setShareMonth] = useState(today.getMonth());
  const [shareYear, setShareYear] = useState(today.getFullYear());
  // Pisahkan tanggal dan waktu untuk input
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

  // Filter gigs by month/year for sharing
  const getGigsByMonthYear = (month, year) => {
    return gigs.filter(gig => {
      if (!gig.date) return false;
      const gigDate = new Date(gig.date);
      if (month === '' || month === null || Number.isNaN(month)) {
        return gigDate.getFullYear() === year;
      }
      return gigDate.getMonth() === month && gigDate.getFullYear() === year;
    });
  };

  const selectedBand = bands.find(band => band.id === selectedBandId);
  const scheduleBandName = selectedBand?.name || 'Jadwal Konser';
  const monthName = (shareMonth === '' || shareMonth === null || Number.isNaN(shareMonth))
    ? `Semua bulan ${shareYear}`
    : new Date(shareYear, shareMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const scheduleTitle = `${scheduleBandName} - ${monthName}`;
  const filteredGigs = getGigsByMonthYear(shareMonth, shareYear);
  const calendarSelectedMonth = (shareMonth === '' || shareMonth === null || Number.isNaN(shareMonth)) ? 0 : shareMonth;
  const sortedGigs = [...filteredGigs].sort((a, b) => {
    const aDate = a.date ? new Date(a.date).getTime() : 0;
    const bDate = b.date ? new Date(b.date).getTime() : 0;
    return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
  });
  const scheduleText = createGigScheduleText(
    scheduleTitle,
    sortedGigs,
    typeof window !== 'undefined' ? window.location.href : ''
  );

  const handleCopyScheduleText = async () => {
    if (!scheduleText) return;
    try {
      await navigator.clipboard.writeText(scheduleText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch (err) {
      console.error('Gagal menyalin teks jadwal:', err);
    }
  };

  const handleDownloadScheduleText = () => {
    downloadTextFile(`${scheduleTitle || 'jadwal-konser'}.txt`, scheduleText);
  };

  const handleDownloadScheduleCalendar = () => {
    const calendarContent = createGigCalendar(scheduleTitle, filteredGigs);
    downloadCalendarFile(`${scheduleTitle || 'jadwal-konser'}.ics`, calendarContent);
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    setIsGeneratingPoster(true);
    setPosterError('');
    try {
      const safeName = (scheduleTitle || 'jadwal-konser').replace(/[\\/:*?"<>|]+/g, '').trim();
      await downloadCalendarAsJPG(posterRef.current, `${safeName}-poster.jpg`);
    } catch (err) {
      console.error('Gagal membuat poster:', err);
      setPosterError('Gagal membuat poster. Coba lagi.');
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleDownloadPosterPDF = async () => {
    if (!posterRef.current) return;
    setIsGeneratingPoster(true);
    setPosterError('');
    try {
      const safeName = (scheduleTitle || 'jadwal-konser').replace(/[\\/:*?"<>|]+/g, '').trim();
      await downloadCalendarAsPDF(posterRef.current, `Jadwal Konser - ${safeName}`);
    } catch (err) {
      console.error('Gagal membuat poster PDF:', err);
      setPosterError('Gagal membuat PDF. Coba lagi.');
    } finally {
      setIsGeneratingPoster(false);
    }
  };

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
              <>
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
                {gigs.length > 0 && (
                  <button className="btn btn-secondary gig-share-trigger-btn" onClick={() => setShowShareModal(true)}>
                    📤 Bagikan Jadwal
                  </button>
                )}
              </>
            );
          }
          // If band selected, check permission
          if (userBandInfo && permissionForSelectedBand.can('gig:edit')) {
            return (
              <>
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
                {gigs.length > 0 && (
                  <button className="btn btn-secondary gig-share-trigger-btn" onClick={() => setShowShareModal(true)}>
                    📤 Bagikan Jadwal
                  </button>
                )}
              </>
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

              <div className="gig-form-row">
                <div className="gig-form-col-flex">
                  <label className="form-label">Tanggal *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="modal-input"
                    required
                  />
                </div>
                <div className="gig-form-col-time">
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
                  className="btn gig-submit-btn"
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
            <h2 className="gig-delete-title">Hapus Jadwal Konser?</h2>
            <p className="gig-delete-message">
              Yakin ingin menghapus konser di <b>{deleteConfirm.venue || deleteConfirm.city || 'lokasi ini'}</b> tanggal <b>{new Date(deleteConfirm.date).toLocaleDateString('id-ID')}</b>?
            </p>
            <div className="gig-delete-actions">
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Batal</button>
              <button
                className="btn gig-delete-btn"
                onClick={handleDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal add-song-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Bagikan Jadwal Konser</div>
            <p className="gig-share-note">
              Gunakan bulan dan tahun yang dipilih untuk daftar dan kalender.
            </p>
            <p className="gig-share-month-summary">
              📅 <strong>{monthName}</strong> - {filteredGigs.length} konser
            </p>

            {/* Poster preview for sharing */}
            <div className="gig-share-poster-wrap">
              <div className="calendar-export-card schedule-poster-card gig-share-poster-card" ref={posterRef}>
                <div className="schedule-poster-header">
                  <div>
                    <div className="schedule-poster-kicker">Jadwal Konser</div>
                    <div className="schedule-poster-title">{scheduleBandName}</div>
                    <div className="schedule-poster-subtitle">{monthName}</div>
                  </div>
                  <div className="share-badge">#RuangPerformer</div>
                </div>
                <div className="schedule-poster-list">
                  {sortedGigs && sortedGigs.length > 0 ? (
                    sortedGigs.map((g, idx) => (
                      <div key={g.id} className="schedule-poster-item">
                        <div className="schedule-poster-item-main">
                          <div className="gig-poster-headline-row">
                            <div className="gig-poster-band-name">{idx + 1}. {g.bandName || 'Band Tamu'}</div>
                            {g.date && (
                              <div className="schedule-poster-meta">
                                {new Date(g.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                {' • '}
                                {new Date(g.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                          {(g.venue || g.city) && (
                            <div className="schedule-poster-details">📍 {g.venue}{g.venue && g.city ? ', ' : ''}{g.city}</div>
                          )}
                          {g.setlistName && (
                            <div className="schedule-poster-details">🎵 Setlist: {g.setlistName}</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="schedule-poster-item gig-poster-empty-item">
                      Tidak ada konser di bulan ini
                    </div>
                  )}
                </div>
                <div className="setlist-poster-footer gig-poster-footer">
                  <div className="setlist-poster-brand">Ruang Performer</div>
                </div>
              </div>
            </div>

            <textarea
              className="modal-input"
              readOnly
              rows={7}
              value={scheduleText}
            />
            <div className="setlist-share-actions">
              <button className="btn" onClick={handleCopyScheduleText}>
                {shareCopied ? '✅ Tersalin!' : 'Salin Teks'}
              </button>
              <button className="btn" onClick={handleDownloadPoster} disabled={isGeneratingPoster}>
                {isGeneratingPoster ? 'Membuat Poster...' : 'Unduh Poster'}
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadPosterPDF} disabled={isGeneratingPoster}>
                {isGeneratingPoster ? 'Membuat PDF...' : 'Download PDF'}
              </button>
              <button className="btn" onClick={handleDownloadScheduleText}>
                Unduh Teks
              </button>
              <button className="btn btn-primary" onClick={handleDownloadScheduleCalendar}>
                Unduh Kalender (.ics)
              </button>
              <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>
                Tutup
              </button>
            </div>
            {posterError && <div className="setlist-poster-error">{posterError}</div>}
          </div>
        </div>
      )}

      {/* Filter & View Mode Toggle */}
      <div className="gig-toolbar">
        <select
          value={selectedBandId}
          onChange={(e) => setSelectedBandId(e.target.value)}
          className="modal-input gig-band-filter"
        >
          <option value="">-- Semua Band --</option>
          {bands.map(band => (
            <option key={band.id} value={band.id}>{band.name}</option>
          ))}
        </select>
        <div className="gig-toolbar-date-group">
          <select
            value={shareMonth}
            onChange={(e) => {
              const value = e.target.value;
              setShareMonth(value === '' ? '' : parseInt(value, 10));
            }}
            className="modal-input gig-month-filter"
          >
            <option value="">Semua bulan</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(2024, i).toLocaleDateString('id-ID', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={shareYear}
            onChange={(e) => setShareYear(parseInt(e.target.value))}
            className="modal-input gig-year-filter"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
        <div className="gig-toolbar-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            title="Ubah urutan tanggal"
          >
            {sortOrder === 'desc' ? '⬇️ Terbaru' : '⬆️ Terlama'}
          </button>
          <button
            className={`btn gig-view-toggle-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 List
          </button>
          <button
            className={`btn gig-view-toggle-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            📅 Kalender
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && <ListSkeleton count={5} />}
      {error && <div className="error-text">{error}</div>}
      
      {!loading && sortedGigs.length === 0 ? (
        <div className="gig-empty-state">
          Belum ada jadwal konser untuk {monthName}
        </div>
      ) : !loading && viewMode === 'calendar' ? (
        <CalendarView gigs={sortedGigs} selectedMonth={calendarSelectedMonth} selectedYear={shareYear} />
      ) : (
        <div className="song-list-container">
          {sortedGigs.map((gig, idx) => {
            const gigTime = gig.date ? new Date(gig.date).getTime() : 0;
            const isCompleted = gigTime > 0 && gigTime < Date.now();
            const isUpcoming = gigTime > Date.now();
            return (
              <div
                key={gig.id}
                className={`song-item hover-lift ${isCompleted ? 'gig-item-completed' : ''} ${isUpcoming ? 'gig-item-upcoming' : ''}`}
                onClick={() => navigate(`/gigs/${gig.id}`)}
              >
                <div className="song-info">
                  <div className="song-number">{idx + 1}.</div>
                  <h3 className="song-title">{gig.bandName || 'Band Tamu'}</h3>
                  <div className="song-meta">
                    <span>📅 {new Date(gig.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {gig.date && (
                      <span>⏰ {new Date(gig.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {(gig.venue || gig.city) && <span>📍 {gig.venue}{gig.venue && gig.city ? ', ' : ''}{gig.city}</span>}
                    {gig.setlistName && <span>🎵 Setlist: {gig.setlistName}</span>}
                    {isUpcoming && <span className="gig-status-badge upcoming">Akan Datang</span>}
                    {isCompleted && <span className="gig-status-badge completed">Selesai</span>}
                  </div>
                </div>

                <div
                  className="song-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const isCreator = gig.userId && user && gig.userId === (user.userId || user.id);
                    const canEdit = isCreator || (userBandInfo && permissionForSelectedBand.can('gig:edit'));
                    const canDelete = isCreator || (userBandInfo && permissionForSelectedBand.can('gig:edit'));
                    if (!canEdit && !canDelete) return null;
                    return (
                      <>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEdit(gig)}
                              className="btn"
                              title="Edit"
                            >
                              <EditIcon size={16} />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirm(gig)}
                            className="btn btn-red"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
