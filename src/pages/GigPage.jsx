import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import { useStageModeEnabled } from '../modules/stage-mode/useStageModeEnabled.js';
import { fetchBands, fetchGigs, fetchSetLists, createGig, updateGig, deleteGig } from '../apiClient.js';
import {
  createGigScheduleText,
  createGigCalendar,
  downloadTextFile,
  downloadCalendarFile
} from '../modules/export-share/scheduleShareUtils.js';
import { useExportShareEnabled } from '../modules/export-share/useExportShareEnabled.js';
import '../styles/setlist-poster.css';
import { downloadCalendarAsJPG, downloadCalendarAsPDF } from '../modules/export-share/calendarDownloadUtil.js';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';
import CalendarView from '../components/CalendarView.jsx';

const pad2 = (value) => String(value).padStart(2, '0');

// Format ISO lokal (tanpa konversi UTC) agar jam yang dipilih user tidak bergeser.
export function toLocalIsoDateTime(date, time) {
  if (!date) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!dateMatch) return null;
  const [, year, month, day] = dateMatch;
  const timeMatch = /^(\d{2}):(\d{2})/.exec(String(time || ''));
  const hh = timeMatch ? timeMatch[1] : '00';
  const mm = timeMatch ? timeMatch[2] : '00';
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hh), Number(mm));
  if (Number.isNaN(parsed.getTime())) return null;
  return `${year}-${month}-${day}T${hh}:${mm}:00`;
}

// Pisahkan kembali ISO string menjadi input date & time untuk form.
export function splitIsoDateTime(value) {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  return {
    date: `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`,
    time: `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`,
  };
}

const emptyGigForm = (overrides = {}) => ({
  bandId: '',
  date: '',
  time: '',
  venue: '',
  city: '',
  fee: '',
  setlistId: '',
  notes: '',
  status: 'planned',
  ...overrides,
});

// Status gig disimpan eksplisit (bisa 'cancelled'), sedangkan status turunan
// ('done'/'upcoming') hanya dipakai untuk badge saat status masih default.
export const GIG_STATUS_OPTIONS = [
  { value: 'planned', label: 'Direncanakan' },
  { value: 'confirmed', label: 'Terkonfirmasi' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'done', label: 'Selesai' },
];

const GIG_STATUS_LABELS = GIG_STATUS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

/**
 * Status yang ditampilkan di list.
 *
 * - 'cancelled' dan 'done' selalu dihormati (gig batal tidak boleh terlihat 'Selesai').
 * - 'planned'/'confirmed' dengan tanggal lampau dianggap selesai secara otomatis.
 */
export function resolveGigStatus(gig, now = Date.now()) {
  const stored = String(gig?.status || '').toLowerCase();
  if (stored === 'cancelled' || stored === 'done') return stored;
  const time = gig?.date ? new Date(gig.date).getTime() : NaN;
  if (Number.isNaN(time)) return stored || 'planned';
  if (time < now) return 'done';
  return stored === 'confirmed' ? 'confirmed' : 'upcoming';
}

export function gigStatusLabel(status) {
  if (status === 'upcoming') return 'Akan Datang';
  return GIG_STATUS_LABELS[status] || GIG_STATUS_LABELS.planned;
}

// Opsi tahun untuk pemilih share: selalu memuat tahun berjalan ±2 dan tahun
// yang sedang dipilih (mis. tahun gigs lama di luar rentang default).
export function buildYearOptions(selectedYear, referenceYear = new Date().getFullYear()) {
  const years = new Set();
  for (let i = -2; i < 3; i += 1) years.add(referenceYear + i);
  if (Number.isInteger(selectedYear)) years.add(selectedYear);
  return Array.from(years).sort((a, b) => a - b);
}

export default function GigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stageModeEnabled] = useStageModeEnabled();
  const [exportShareEnabled] = useExportShareEnabled();
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
  // Filter tampilan (toolbar). Sengaja dipisah dari state share agar membagikan
  // jadwal tidak bergantung pada bulan yang sedang difilter di list.
  const [filterMonth, setFilterMonth] = useState(today.getMonth());
  const [filterYear, setFilterYear] = useState(today.getFullYear());
  // State share: default "semua bulan" pada tahun berjalan.
  const [shareMonth, setShareMonth] = useState('');
  const [shareYear, setShareYear] = useState(today.getFullYear());
  const [shareAllTime, setShareAllTime] = useState(true);
  // Pisahkan tanggal dan waktu untuk input
  const defaultDate = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  const defaultTime = `${pad2(today.getHours())}:${pad2(today.getMinutes())}`;
  const [formData, setFormData] = useState(() => emptyGigForm({ date: defaultDate, time: defaultTime }));
  const [formError, setFormError] = useState('');

  // Filter gigs by month/year ('semua bulan' bila month kosong)
  const getGigsByMonthYear = (month, year) => {
    return gigs.filter(gig => {
      if (!gig.date) return false;
      const gigDate = new Date(gig.date);
      if (Number.isNaN(gigDate.getTime())) return false;
      if (month === '' || month === null || Number.isNaN(month)) {
        return gigDate.getFullYear() === year;
      }
      return gigDate.getMonth() === month && gigDate.getFullYear() === year;
    });
  };

  const selectedBand = bands.find(band => band.id === selectedBandId);
  const scheduleBandName = selectedBand?.name || 'Jadwal Gigs';
  const monthName = (filterMonth === '' || filterMonth === null || Number.isNaN(filterMonth))
    ? `Semua bulan ${filterYear}`
    : new Date(filterYear, filterMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const filteredGigs = Array.isArray(gigs) ? gigs : [];
  // Tahun sudah difilter server; bulan disaring di client supaya kontrol toolbar
  // tetap bekerja tanpa memicu request ulang.
  const gigsInMonth = filteredGigs.filter((gig) => {
    if (filterMonth === '' || filterMonth === null || Number.isNaN(filterMonth)) return true;
    const parsed = gig.date ? new Date(gig.date) : null;
    return parsed && !Number.isNaN(parsed.getTime()) && parsed.getMonth() === filterMonth;
  });
  const shareGigs = shareAllTime
    ? gigs.filter(gig => {
      if (!gig.date) return false;
      const gigDate = new Date(gig.date);
      return !Number.isNaN(gigDate.getTime());
    })
    : getGigsByMonthYear(shareMonth, shareYear);
  const shareMonthName = shareAllTime
    ? 'Semua jadwal'
    : ((shareMonth === '' || shareMonth === null || Number.isNaN(shareMonth))
      ? `Semua bulan ${shareYear}`
      : new Date(shareYear, shareMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));
  // Data yang dimuat hanya setahun (filter server), jadi sebutkan tahunnya kalau berbeda.
  const shareScopeLabel = shareAllTime
    ? `${shareMonthName} ${shareYear}`
    : shareMonthName;
  const shareTitle = `${scheduleBandName} - ${shareScopeLabel}`;
  const calendarSelectedMonth = (filterMonth === '' || filterMonth === null || Number.isNaN(filterMonth)) ? 0 : filterMonth;
  const sortByDate = (list) => [...list].sort((a, b) => {
    const aDate = a.date ? new Date(a.date).getTime() : 0;
    const bDate = b.date ? new Date(b.date).getTime() : 0;
    return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
  });
  const sortedGigs = sortByDate(gigsInMonth);
  const sortedShareGigs = sortByDate(shareGigs);
  const scheduleText = createGigScheduleText(
    shareTitle,
    sortedShareGigs,
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
    downloadTextFile(`${shareTitle || 'jadwal-gigs'}.txt`, scheduleText);
  };

  const handleDownloadScheduleCalendar = () => {
    const calendarContent = createGigCalendar(shareTitle, shareGigs);
    downloadCalendarFile(`${shareTitle || 'jadwal-gigs'}.ics`, calendarContent);
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    setIsGeneratingPoster(true);
    setPosterError('');
    try {
      const safeName = (shareTitle || 'jadwal-gigs').replace(/[\\/:*?"<>|]+/g, '').trim();
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
      const safeName = (shareTitle || 'jadwal-gigs').replace(/[\\/:*?"<>|]+/g, '').trim();
      await downloadCalendarAsPDF(posterRef.current, `Jadwal Gigs - ${safeName}`);
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
    if (band && (band.role || band.userRole)) {
      return { role: band.role || band.userRole, bandId };
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
        console.error('Gagal memuat data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Fetch gigs — dimuat per tahun yang dipilih (server-side filter), bukan
  // sekadar 100 baris terakhir, supaya gigs lama tidak hilang dari list.
  useEffect(() => {
    let cancelled = false;
    const loadGigs = async () => {
      setLoading(true);
      setError('');
      try {
        // `` berarti "semua bulan" pada tahun aktif; year selalu dikirim.
        const data = await fetchGigs(selectedBandId || null, { year: filterYear });
        if (cancelled) return;
        setGigs(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Gagal memuat daftar gigs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadGigs();
    return () => {
      cancelled = true;
    };
  }, [selectedBandId, filterYear]);

  const reloadGigs = async () => {
    const data = await fetchGigs(selectedBandId || null, { year: filterYear });
    setGigs(Array.isArray(data) ? data : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.date) {
      setFormError('Tanggal diperlukan');
      return;
    }
    // Gabungkan tanggal dan waktu sebagai ISO lokal (tanpa konversi UTC)
    const isoDate = toLocalIsoDateTime(formData.date, formData.time);
    if (!isoDate) {
      setFormError('Tanggal atau waktu tidak valid');
      return;
    }
    const submitData = {
      bandId: formData.bandId || null,
      date: isoDate,
      venue: formData.venue || '',
      city: formData.city || '',
      fee: formData.fee === '' || formData.fee === null ? null : formData.fee,
      setlistId: formData.setlistId || null,
      notes: formData.notes || '',
      status: formData.status || 'planned'
    };

    try {
      if (editGig) {
        await updateGig(editGig.id, submitData);
      } else {
        await createGig(submitData);
      }
      // Tahun gig yang baru disimpan ikut menentukan data yang perlu dimuat.
      const savedYear = isoDate.slice(0, 4);
      if (savedYear !== String(filterYear)) setFilterYear(Number(savedYear));
      else await reloadGigs();
      setShowForm(false);
      setEditGig(null);
      setFormData(emptyGigForm({ date: defaultDate, time: defaultTime }));
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan gig');
    }
  };

  const handleEdit = (gig) => {
    setEditGig(gig);
    // Pisahkan tanggal dan waktu dari ISO string
    const { date: dateStr, time: timeStr } = splitIsoDateTime(gig.date);
    setFormData({
      bandId: gig.bandId || '',
      date: dateStr,
      time: timeStr,
      venue: gig.venue || '',
      city: gig.city || '',
      fee: gig.fee || '',
      setlistId: gig.setlistId || '',
      notes: gig.notes || '',
      status: gig.status || 'planned'
    });
    setShowForm(true);
    setFormError('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteGig(deleteConfirm.id);
      await reloadGigs();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Gagal menghapus:', err);
    }
  };

  const openCreateForm = () => {
    setShowForm(true);
    setEditGig(null);
    setFormData(emptyGigForm({
      bandId: selectedBandId || '',
      date: defaultDate,
      time: defaultTime
    }));
    setFormError('');
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎤 Jadwal Gigs</h1>
          <p>Kelola pertunjukan band mu</p>
        </div>
        {/* Permission: Only show if user can create gig for selected band */}
        {(() => {
          const canManageGigs = !selectedBandId
            ? Boolean(user)
            : Boolean(userBandInfo && permissionForSelectedBand.can(PERMISSIONS.GIG_EDIT));
          if (!canManageGigs) return null;

          return (
            <div className="page-header-actions">
              <button className="btn" onClick={openCreateForm}>
                <span aria-hidden="true">＋</span> Buat Gigs
              </button>
              {gigs.length > 0 && exportShareEnabled && (
                <button className="btn btn-secondary gig-share-trigger-btn" onClick={() => setShowShareModal(true)}>
                  📤 Bagikan Jadwal
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditGig(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editGig ? 'Edit Jadwal Gigs' : 'Buat Jadwal Gigs Baru'}</h2>
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
                <label className="form-label">Status Gigs</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="modal-input gig-status-select"
                >
                  {GIG_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
                  placeholder="Contoh: Gigs di festival musik, performa bagus..."
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
            <h2 className="gig-delete-title">Hapus Jadwal Gigs?</h2>
            <p className="gig-delete-message">
              Yakin ingin menghapus gigs di <b>{deleteConfirm.venue || deleteConfirm.city || 'lokasi ini'}</b> tanggal <b>{new Date(deleteConfirm.date).toLocaleDateString('id-ID')}</b>?
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

      {showShareModal && exportShareEnabled && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal add-song-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Bagikan Jadwal Gigs</div>
            <p className="gig-share-note">
              Pilih cakupan jadwal yang ingin dibagikan. Pilihan ini tidak memengaruhi filter daftar gigs.
            </p>
            <div className="gig-toolbar-date-group gig-share-range-group">
              <select
                value={shareAllTime ? 'all' : 'month'}
                onChange={(e) => setShareAllTime(e.target.value === 'all')}
                className="modal-input gig-month-filter"
              >
                <option value="all">Semua jadwal</option>
                <option value="month">Per bulan</option>
              </select>
              {!shareAllTime && (
                <>
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
                    {buildYearOptions(shareYear).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <p className="gig-share-month-summary">
              📅 <strong>{shareScopeLabel}</strong> - {shareGigs.length} gigs
            </p>

            {/* Poster preview for sharing */}
            <div className="gig-share-poster-wrap">
              <div className="calendar-export-card schedule-poster-card gig-share-poster-card" ref={posterRef}>
                <div className="schedule-poster-header">
                  <div>
                    <div className="schedule-poster-kicker">Jadwal Gigs</div>
                    <div className="schedule-poster-title">{scheduleBandName}</div>
                    <div className="schedule-poster-subtitle">{shareMonthName}</div>
                  </div>
                  <div className="share-badge">#RuangPerformer</div>
                </div>
                <div className="schedule-poster-list">
                  {sortedShareGigs && sortedShareGigs.length > 0 ? (
                    sortedShareGigs.map((g, idx) => (
                      <div key={g.id} className="schedule-poster-item">
                        <div className="schedule-poster-item-main">
                          <div className="gig-poster-headline-row">
                            <div className="gig-poster-band-name">{idx + 1}. {g.bandName || 'Band Tamu'}{String(g.status || '').toLowerCase() === 'cancelled' ? ' [DIBATALKAN]' : ''}</div>
                            {g.date && !Number.isNaN(new Date(g.date).getTime()) && (
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
                      Tidak ada gigs di bulan ini
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
            value={filterMonth}
            onChange={(e) => {
              const value = e.target.value;
              setFilterMonth(value === '' ? '' : parseInt(value, 10));
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
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="modal-input gig-year-filter"
          >
            {buildYearOptions(filterYear).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
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
          <p>{gigs.length === 0 ? `Belum ada jadwal gigs pada ${filterYear}.` : `Belum ada jadwal gigs untuk ${monthName}.`}</p>
          <button className="btn" onClick={openCreateForm}>
            <span aria-hidden="true">＋</span> Buat Gigs
          </button>
        </div>
      ) : !loading && viewMode === 'calendar' ? (
        <CalendarView gigs={sortedGigs} selectedMonth={calendarSelectedMonth} selectedYear={filterYear} onGigSelect={handleEdit} />
      ) : (
        <div className="song-list-container">
          {sortedGigs.map((gig, idx) => {
            const gigTime = gig.date ? new Date(gig.date).getTime() : 0;
            const hasDate = gigTime > 0 && !Number.isNaN(gigTime);
            const status = resolveGigStatus(gig);
            const isCompleted = status === 'done' && hasDate && gigTime < Date.now();
            const isUpcoming = status === 'upcoming' || status === 'confirmed';
            const isCancelled = status === 'cancelled';
            return (
              <div
                key={gig.id}
                className={`song-item hover-lift ${isCompleted ? 'gig-item-completed' : ''} ${isUpcoming ? 'gig-item-upcoming' : ''} ${isCancelled ? 'gig-item-cancelled' : ''}`}
              >
                <div className="song-info">
                  <div className="song-number">{idx + 1}.</div>
                  <h3 className="song-title">{gig.bandName || 'Band Tamu'}</h3>
                  <div className="song-meta">
                    <span>📅 {hasDate ? new Date(gig.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanggal belum diisi'}</span>
                    {hasDate && (
                      <span>⏰ {new Date(gig.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {(gig.venue || gig.city) && <span>📍 {gig.venue}{gig.venue && gig.city ? ', ' : ''}{gig.city}</span>}
                    {gig.setlistName && <span>🎵 {gig.setlistName}</span>}
                    {isUpcoming && <span className={`gig-status-badge ${status}`}>{gigStatusLabel(status)}</span>}
                    {isCompleted && <span className="gig-status-badge completed">Selesai</span>}
                    {isCancelled && <span className="gig-status-badge cancelled">{gigStatusLabel('cancelled')}</span>}
                  </div>
                </div>

                <div
                  className="song-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const isCreator = gig.userId && user && gig.userId === (user.userId || user.id);
                    // Gigs yang dilihat tanpa filter band memakai izin gigs pribadi:
                    // hanya pembuatnya yang boleh mengubah.
                    const canEdit = isCreator
                      || (selectedBandId && userBandInfo && permissionForSelectedBand.can(PERMISSIONS.GIG_EDIT));
                    const canDelete = isCreator
                      || (selectedBandId && userBandInfo && permissionForSelectedBand.can(PERMISSIONS.GIG_DELETE));
                    return (
                      <>
                        {gig.setlistId && (
                          <button
                            onClick={() => navigate(`/setlists/${gig.setlistId}`)}
                            className="btn gig-setlist-btn"
                            title="Buka setlist gig"
                          >
                            <span aria-hidden="true">🎵</span> Setlist
                          </button>
                        )}
                        {gig.setlistId && stageModeEnabled && (
                          <button
                            onClick={() => navigate(`/stage?setlistId=${encodeURIComponent(gig.setlistId)}`)}
                            className="btn gig-stage-btn"
                            title="Mode panggung dengan setlist gig ini"
                          >
                            <span aria-hidden="true">🎤</span> Stage
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(gig)}
                            className="btn"
                            title="Edit"
                            aria-label={`Edit gig ${gig.bandName || ''} ${gig.venue || ''}`.trim()}
                          >
                            <span aria-hidden="true">✎</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConfirm(gig)}
                            className="btn btn-red"
                            title="Hapus"
                            aria-label={`Hapus gig ${gig.bandName || ''} ${gig.venue || ''}`.trim()}
                          >
                            <span aria-hidden="true">🗑</span>
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
