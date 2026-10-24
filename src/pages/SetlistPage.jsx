import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import SetlistForm from '../components/SetlistForm.jsx';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';
import { fetchBands, addSetList, updateSetList, deleteSetList, fetchSetLists } from '../apiClient.js';
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS, canPerformAction, canEditSetlist, canDeleteSetlist } from '../utils/permissionUtils.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function SetlistPage({
  setlists,
  loadingSetlists,
  errorSetlists,
  songs = [],
  userBandInfo = [],
  showCreateSetlist,
  setShowCreateSetlist,
  setCreateSetlistName,
  createSetlistError,
  setCreateSetlistError,
  setSetlists,
}) {
  const navigate = useNavigate();
  const [bands, setBands] = React.useState([]);
  const { can } = usePermission(null, userBandInfo);
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const [editSetlist, setEditSetlist] = React.useState(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [autoSourceSetlists, setAutoSourceSetlists] = React.useState([]);
  const [autoSourceLoading, setAutoSourceLoading] = React.useState(false);
  // Konfirmasi hapus setlist (setlist pribadi maupun band)
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  // Filter & Sort States
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('created');
  const [sortOrder, setSortOrder] = React.useState('desc');
  const [bandFilter, setBandFilter] = React.useState('all');

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Update page meta tags on mount
  React.useEffect(() => {
    updatePageMeta(pageMetadata.setlists);
  }, []);

  const loadBands = React.useCallback(async () => {
    try {
      const data = await fetchBands();
      setBands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat daftar band:', err);
      setBands([]);
    }
  }, []);

  // Load band options saat halaman dibuka.
  React.useEffect(() => {
    loadBands();
  }, [loadBands]);

  // Fallback: jika API gagal, pakai band dari userBandInfo.
  React.useEffect(() => {
    if (bands.length === 0 && Array.isArray(userBandInfo) && userBandInfo.length > 0) {
      setBands(userBandInfo.map(b => ({
        id: b.bandId || b.id,
        name: b.bandName || b.name,
      })).filter(b => b.id && b.name));
    }
  }, [bands.length, userBandInfo]);

  const loadAutoSourceSetlists = React.useCallback(async () => {
    setAutoSourceLoading(true);
    try {
      const data = await fetchSetLists();
      setAutoSourceSetlists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat sumber setlist otomatis:', err);
      setAutoSourceSetlists([]);
    } finally {
      setAutoSourceLoading(false);
    }
  }, []);

  // Muat ulang band saat modal/filter butuh dan daftar masih kosong.
  React.useEffect(() => {
    if ((showCreateSetlist || editSetlist) && bands.length === 0) {
      loadBands();
    }
  }, [showCreateSetlist, editSetlist, bands.length, loadBands]);

  React.useEffect(() => {
    if (showCreateSetlist) {
      loadAutoSourceSetlists();
    }
  }, [showCreateSetlist, loadAutoSourceSetlists]);

  // Helper untuk refresh setlists dari API
  const refreshSetlists = async () => {
    try {
      const data = await fetchSetLists({ summary: true });
      setSetlists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memperbarui daftar setlist:', err);
    }
  };

  // Filter and sort setlists
  const filteredSetlists = useMemo(() => {
    let result = [...setlists];

    // Apply search
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(setlist =>
        setlist.name?.toLowerCase().includes(searchLower) ||
        setlist.description?.toLowerCase().includes(searchLower) ||
        setlist.bandName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply band filter
    if (bandFilter !== 'all') {
      const selectedBand = bands.find(b => String(b.id || b.bandId) === bandFilter);
      const selectedBandName = selectedBand?.name?.toLowerCase();
      result = result.filter(setlist =>
        String(setlist.bandId || '') === bandFilter ||
        (selectedBandName && setlist.bandName?.toLowerCase() === selectedBandName)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'band':
          aVal = a.bandName?.toLowerCase() || '';
          bVal = b.bandName?.toLowerCase() || '';
          break;
        case 'songs':
          aVal = a.songs?.length || 0;
          bVal = b.songs?.length || 0;
          break;
        case 'created':
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        case 'updated':
          aVal = new Date(a.updatedAt || a.createdAt || 0).getTime();
          bVal = new Date(b.updatedAt || b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [setlists, debouncedSearch, sortBy, sortOrder, bandFilter, bands]);

  const handleClearFilters = () => {
    setSearch('');
    setSortBy('created');
    setSortOrder('desc');
    setBandFilter('all');
  };

  const hasActiveFilters = Boolean(search) || bandFilter !== 'all';

  // Ringkasan untuk hero (di luar filter, karena menggambarkan koleksi).
  const totalSongs = setlists.reduce(
    (total, setlist) => total + (setlist.songCount ?? setlist.songs?.length ?? 0), 0,
  );
  const bandCount = new Set(
    setlists.map((setlist) => setlist.bandId || setlist.bandName).filter(Boolean),
  ).size;
  const latestSetlist = setlists.reduce((latest, setlist) => {
    const stamp = new Date(setlist.updatedAt || setlist.createdAt || 0).getTime();
    if (Number.isNaN(stamp)) return latest;
    return !latest || stamp > latest.stamp ? { setlist, stamp } : latest;
  }, null);
  const songCountOf = (setlist) => setlist.songCount ?? setlist.songs?.length ?? 0;
  const formatFullDate = (value) => {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
  };

  const openDeleteSetlist = (setlist) => {
    setDeleteError('');
    setDeleteTarget(setlist);
  };

  const closeDeleteSetlist = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const confirmDeleteSetlist = async () => {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteSetList(deleteTarget.id);
      if (setSetlists) {
        setSetlists(prev => (Array.isArray(prev) ? prev : []).filter(s => String(s.id) !== String(deleteTarget.id)));
      }
      setDeleteTarget(null);
      await refreshSetlists();
    } catch (err) {
      setDeleteError(err.message || 'Gagal menghapus setlist');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loadingSetlists) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🎵 Setlist</h1>
        </div>
        <ListSkeleton count={6} />
      </div>
    );
  }

  if (errorSetlists) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🎵 Setlist</h1>
        </div>
        <div className="error-text setlist-error-box">{errorSetlists}</div>
      </div>
    );
  }

  return (
    <div className="page-container setlist-page">
      {/* Hero: judul + ringkasan koleksi */}
      <section className="setlist-hero">
        <div className="setlist-hero-heading">
          <div>
            <h1 className="setlist-hero-title">Setlist</h1>
            <p className="setlist-hero-subtitle">Susun urutan lagu untuk latihan dan panggung</p>
          </div>
          {(Array.isArray(userBandInfo)
            ? userBandInfo.some(b => b.role && b.role !== 'guest')
            : can(PERMISSIONS.SETLIST_CREATE)
          ) && (
            <div className="setlist-hero-actions">
              <button className="btn setlist-btn-primary" onClick={() => setShowCreateSetlist(true)}>
                <span aria-hidden="true">＋</span> Buat Setlist
              </button>
            </div>
          )}
        </div>

        <div className="setlist-summary-grid">
          <div className="setlist-summary-card">
            <span className="setlist-summary-label">Total setlist</span>
            <span className="setlist-summary-value">{setlists.length}</span>
            <span className="setlist-summary-hint">
              {hasActiveFilters ? `${filteredSetlists.length} tampil` : 'Semua koleksi kamu'}
            </span>
          </div>
          <div className="setlist-summary-card">
            <span className="setlist-summary-label">Lagu tersusun</span>
            <span className="setlist-summary-value">{totalSongs}</span>
            <span className="setlist-summary-hint">Di seluruh setlist</span>
          </div>
          <div className={`setlist-summary-card${latestSetlist ? '' : ' setlist-summary-card--muted'}`}>
            <span className="setlist-summary-label">Terakhir diubah</span>
            <span className="setlist-summary-value setlist-summary-value--text">
              {latestSetlist ? formatFullDate(latestSetlist.setlist.updatedAt || latestSetlist.setlist.createdAt) : '—'}
            </span>
            <span className="setlist-summary-hint">
              {latestSetlist
                ? `${latestSetlist.setlist.name}${bandCount ? ` · ${bandCount} band` : ''}`
                : 'Belum ada setlist'}
            </span>
          </div>
        </div>
      </section>

      {/* Filter & pencarian */}
      <div className="setlist-toolbar">
        <div className="setlist-search-field">
          <label className="setlist-field-label" htmlFor="setlist-search">Cari</label>
          <input
            id="setlist-search"
            type="text"
            placeholder="Nama setlist, deskripsi, atau band..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-select setlist-search-input"
          />
        </div>

        <div className="setlist-field">
          <label className="setlist-field-label" htmlFor="setlist-band-filter">Band</label>
          <select
            id="setlist-band-filter"
            value={bandFilter}
            onChange={(e) => setBandFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter berdasarkan band"
          >
            <option value="all">Semua Band</option>
            {bands.map(band => (
              <option key={band.id || band.bandId} value={String(band.id || band.bandId)}>
                {band.name}
              </option>
            ))}
          </select>
        </div>

        <div className="setlist-field">
          <label className="setlist-field-label" htmlFor="setlist-sort-by">Urutkan</label>
          <div className="setlist-sort-group">
            <select
              id="setlist-sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="name">Nama</option>
              <option value="band">Band</option>
              <option value="songs">Jumlah Lagu</option>
              <option value="created">Tanggal Dibuat</option>
              <option value="updated">Terakhir Diupdate</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary setlist-sort-order-btn"
              title={sortOrder === 'asc' ? 'Urutan naik' : 'Urutan turun'}
              aria-label={sortOrder === 'asc' ? 'Ubah ke urutan turun' : 'Ubah ke urutan naik'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="setlist-toolbar-meta">
          <span className="setlist-filter-count">
            {hasActiveFilters
              ? `${filteredSetlists.length} / ${setlists.length}`
              : `${setlists.length} setlist`}
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary setlist-reset-btn"
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Setlist List */}
      {filteredSetlists.length === 0 ? (
        <div className="empty-state setlist-empty-state">
          <div className="setlist-empty-icon" aria-hidden="true">📋</div>
          <p>
            {hasActiveFilters ? 'Tidak ada setlist yang cocok dengan filter' : 'Belum ada setlist'}
          </p>
          {hasActiveFilters ? (
            <button className="btn btn-secondary" onClick={handleClearFilters}>
              Hapus filter
            </button>
          ) : (
            <button className="btn setlist-btn-primary setlist-empty-add-btn" onClick={() => setShowCreateSetlist(true)}>
              <span aria-hidden="true">＋</span> Buat Setlist Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="song-list-container setlist-list">
          {filteredSetlists.map(setlist => {
            const canEdit = canEditSetlist(setlist, userBandInfo, user);
            const canDelete = canDeleteSetlist(setlist, userBandInfo, user);
            const songs = songCountOf(setlist);
            return (
              <div
                key={setlist.id}
                className="setlist-item setlist-card"
                onClick={() => navigate(`/setlists/${setlist.id}`)}
              >
                {/* Indikator jumlah lagu */}
                <div className={`setlist-count-block${songs === 0 ? ' setlist-count-block--empty' : ''}`} aria-hidden="true">
                  <span className="setlist-count-value">{songs}</span>
                  <span className="setlist-count-label">lagu</span>
                </div>

                {/* Setlist Info */}
                <div className="setlist-info setlist-card-body">
                  <div className="setlist-card-title-row">
                    <h3 className="setlist-title">{setlist.name}</h3>
                    {setlist.bandName && (
                      <span className="setlist-meta-badge setlist-meta-band">{setlist.bandName}</span>
                    )}
                  </div>
                  {setlist.description && (
                    <p className="setlist-card-desc">{setlist.description}</p>
                  )}
                  <p className="setlist-card-meta">
                    {formatFullDate(setlist.updatedAt || setlist.createdAt)}
                    {songs === 0 ? ' · Belum ada lagu' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div
                  className="setlist-actions setlist-card-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => navigate(`/setlists/${setlist.id}`)}
                    className="btn setlist-open-btn"
                    aria-label={`Buka setlist ${setlist.name}`}
                  >
                    Buka
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => setEditSetlist(setlist)}
                      className="btn setlist-action-icon-btn"
                      title="Edit setlist"
                      aria-label={`Edit setlist ${setlist.name}`}
                    >
                      <span aria-hidden="true">✎</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => openDeleteSetlist(setlist)}
                      className="btn setlist-action-icon-btn setlist-action-icon-btn-danger"
                      title="Hapus setlist"
                      aria-label={`Hapus setlist ${setlist.name}`}
                    >
                      <span aria-hidden="true">🗑</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Setlist Baru */}
      {showCreateSetlist && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={() => setShowCreateSetlist(false)}
          onKeyDown={e => { if (e.key === 'Escape') setShowCreateSetlist(false); }}
        >
          <SetlistForm
            mode="create"
            title="Buat Setlist Baru"
            initialData={{}}
            bands={bands}
            sourceSetlists={autoSourceSetlists}
            songs={songs}
            loadingSourceSetlists={autoSourceLoading}
            loading={editLoading}
            error={createSetlistError}
            onCancel={() => setShowCreateSetlist(false)}
            onSubmit={async ({ name, description, bandId, autoGenerate, previewSongIds }) => {
              setCreateSetlistError('');
              setEditLoading(true);
              try {
                let songs = [];
                if (autoGenerate) {
                  if (autoSourceLoading) {
                    throw new Error('Data sumber lagu masih dimuat, coba lagi sebentar');
                  }

                  if (bandId) {
                    const selectedBandInfo = Array.isArray(userBandInfo)
                      ? userBandInfo.find((b) => String(b.bandId || b.id) === String(bandId))
                      : null;
                    const canCreateForBand = canPerformAction(
                      { userId: String(currentUserId || '') },
                      String(bandId || ''),
                      selectedBandInfo
                        ? { bandId: String(selectedBandInfo.bandId || selectedBandInfo.id), role: selectedBandInfo.role }
                        : null,
                      PERMISSIONS.SETLIST_CREATE
                    );

                    if (!canCreateForBand) {
                      throw new Error('Anda tidak punya izin membuat setlist otomatis untuk band ini');
                    }
                  }

                  if (!Array.isArray(previewSongIds) || previewSongIds.length === 0) {
                    throw new Error('Daftar lagu otomatis belum tersedia, silakan cek pilihan sumber lagu');
                  }
                  songs = previewSongIds;
                }

                await addSetList({ name, description, bandId, songs, userId: currentUserId });
                setShowCreateSetlist(false);
                setCreateSetlistName('');
                setCreateSetlistError('');
                await refreshSetlists();
              } catch (err) {
                setCreateSetlistError(err.message || 'Gagal membuat setlist');
              } finally {
                setEditLoading(false);
              }
            }}
          />
        </div>
      )}

      {/* Modal Edit Setlist */}
      {editSetlist && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={() => setEditSetlist(null)}
          onKeyDown={e => { if (e.key === 'Escape') setEditSetlist(null); }}
        >
          <SetlistForm
            mode="edit"
            title="Edit Setlist"
            initialData={editSetlist}
            bands={bands}
            loading={editLoading}
            error={editError}
            onCancel={() => setEditSetlist(null)}
            onSubmit={async ({ name, description, bandId }) => {
              setEditError('');
              setEditLoading(true);
              try {
                await updateSetList({ id: editSetlist.id, name, description, bandId });
                setEditSetlist(null);
                await refreshSetlists();
              } catch (err) {
                setEditError(err.message || 'Gagal mengupdate setlist');
              } finally {
                setEditLoading(false);
              }
            }}
          />
        </div>
      )}

      {/* Konfirmasi Hapus Setlist */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          tabIndex={-1}
          aria-label="Konfirmasi hapus setlist"
          onClick={(e) => { if (e.target === e.currentTarget) closeDeleteSetlist(); }}
          onKeyDown={e => { if (e.key === 'Escape') closeDeleteSetlist(); }}
        >
          <div className="modal delete-confirm-modal" role="dialog" aria-modal="true" tabIndex={0}>
            <div className="modal-title">Konfirmasi Hapus Setlist</div>
            <div className="modal-message">
              Apakah Anda yakin ingin menghapus setlist &quot;{deleteTarget.name}&quot;?
              Tindakan ini tidak bisa dibatalkan.
            </div>
            {deleteError && <div className="error-text modal-error-bottom">{deleteError}</div>}
            <div className="modal-actions">
              <button className="btn btn-red" onClick={confirmDeleteSetlist} disabled={deleteLoading}>
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button className="btn btn-secondary" onClick={closeDeleteSetlist} disabled={deleteLoading}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

SetlistPage.propTypes = {
  setlists: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    description: PropTypes.string,
    bandId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bandName: PropTypes.string,
    songs: PropTypes.array,
    songCount: PropTypes.number,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
  })),
  loadingSetlists: PropTypes.bool,
  errorSetlists: PropTypes.string,
  songs: PropTypes.array,
  userBandInfo: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  showCreateSetlist: PropTypes.bool,
  setShowCreateSetlist: PropTypes.func,
  setCreateSetlistName: PropTypes.func,
  createSetlistError: PropTypes.string,
  setCreateSetlistError: PropTypes.func,
  setSetlists: PropTypes.func,
};
