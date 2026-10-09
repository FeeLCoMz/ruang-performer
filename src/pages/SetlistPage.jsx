import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PlusIcon from '../components/PlusIcon.jsx';
import SetlistForm from '../components/SetlistForm.jsx';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
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
  isPerformanceMode = false
}) {
  const navigate = useNavigate();
  const [bands, setBands] = React.useState([]);
  const { can } = usePermission(null, userBandInfo);
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const [editSetlist, setEditSetlist] = React.useState(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [deleteSetlist, setDeleteSetlist] = React.useState(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');
  const [autoSourceSetlists, setAutoSourceSetlists] = React.useState([]);
  const [autoSourceLoading, setAutoSourceLoading] = React.useState(false);
  
  // Filter & Sort States
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filterBand, setFilterBand] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('created');
  const [sortOrder, setSortOrder] = React.useState('desc');

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
      setBands(data || []);
    } catch (err) {
      console.error('Failed to load bands:', err);
    }
  }, []);

  const loadAutoSourceSetlists = React.useCallback(async () => {
    setAutoSourceLoading(true);
    try {
      const data = await fetchSetLists();
      setAutoSourceSetlists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load setlist auto source:', err);
      setAutoSourceSetlists([]);
    } finally {
      setAutoSourceLoading(false);
    }
  }, []);

  // Load band options only when create/edit modal needs them.
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
      console.error('Failed to refresh setlists:', err);
    }
  };

  // Extract unique band names for filter
  const bandOptions = useMemo(() => {
    const bandSet = new Set();
    setlists.forEach(setlist => {
      if (setlist.bandName) bandSet.add(setlist.bandName);
    });
    return Array.from(bandSet).sort();
  }, [setlists]);

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
    if (filterBand !== 'all') {
      if (filterBand === 'personal') {
        result = result.filter(setlist => !setlist.bandId);
      } else {
        result = result.filter(setlist => setlist.bandName === filterBand);
      }
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
  }, [setlists, debouncedSearch, filterBand, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterBand('all');
    setSortBy('created');
    setSortOrder('desc');
  };

  const hasActiveFilters = search || filterBand !== 'all';

  // Statistik ringkas untuk performance mode
  const performanceStats = useMemo(() => {
    const list = filteredSetlists;
    const totalSetlists = list.length;
    const totalSongs = list.reduce(
      (sum, setlist) => sum + (setlist.songCount ?? setlist.songs?.length ?? 0),
      0,
    );
    const completedSongs = list.reduce((sum, setlist) => {
      const completed = setlist.completedSongs;
      if (!completed || typeof completed !== 'object' || Array.isArray(completed)) return sum;
      return sum + Object.keys(completed).filter((id) => completed[id] === true).length;
    }, 0);
    return {
      totalSetlists,
      totalSongs,
      completedSongs,
    };
  }, [filteredSetlists]);

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
    <div className={`page-container${isPerformanceMode ? ' performance-mode' : ''}`}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎵 Setlist</h1>
          {isPerformanceMode ? (
            <div className="setlist-header-summary">
              {performanceStats.totalSetlists} setlist • {performanceStats.totalSongs} lagu • {performanceStats.completedSongs} sudah dibawakan
            </div>
          ) : (
            <p>
              {hasActiveFilters
                ? `${filteredSetlists.length} dari ${setlists.length} setlist`
                : `${setlists.length} setlist`}
            </p>
          )}
        </div>
        {!isPerformanceMode && (
          // Tampilkan tombol jika user punya role (selain guest) di salah satu band ATAU user login (untuk setlist personal)
          ((Array.isArray(userBandInfo)
            ? userBandInfo.some(b => b.role && b.role !== 'guest')
            : can(PERMISSIONS.SETLIST_CREATE))
          ) && (
            <div className="page-header-actions">
              <button className="btn" onClick={() => setShowCreateSetlist(true)}>
                <PlusIcon size={18} /> Buat Setlist
              </button>
            </div>
          )
        )}
      </div>

      {/* Statistik ringkas - hanya di performance mode */}
      {isPerformanceMode && performanceStats.totalSetlists > 0 && (
        <div className="setlist-stats-grid setlist-stats-grid-compact" aria-label="Statistik setlist">
          <div className="setlist-stat-card">
            <span className="setlist-stat-icon" aria-hidden="true">📋</span>
            <span className="setlist-stat-value">{performanceStats.totalSetlists}</span>
            <span className="setlist-stat-label">Setlist</span>
          </div>
          <div className="setlist-stat-card">
            <span className="setlist-stat-icon" aria-hidden="true">🎵</span>
            <span className="setlist-stat-value">{performanceStats.totalSongs}</span>
            <span className="setlist-stat-label">Total Lagu</span>
          </div>
          <div className="setlist-stat-card">
            <span className="setlist-stat-icon" aria-hidden="true">✅</span>
            <span className="setlist-stat-value">{performanceStats.completedSongs}</span>
            <span className="setlist-stat-label">Sudah Dibawakan</span>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className={`filter-container setlist-filter-container${isPerformanceMode ? ' setlist-filter-container-performance' : ''}`}>
          {/* Search Bar - hanya mode normal */}
          {!isPerformanceMode && (
            <input
              type="text"
              placeholder="🔍 Cari nama setlist, deskripsi, atau band..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input-main"
            />
          )}

          {/* Filters Row */}
          <div className="setlist-filter-grid">
            <select
              value={filterBand}
              onChange={(e) => setFilterBand(e.target.value)}
              className="filter-select"
            >
              <option value="all">Semua Band</option>
              <option value="personal">Personal</option>
              {bandOptions.map(band => (
                <option key={band} value={band}>{band}</option>
              ))}
            </select>

            {!isPerformanceMode && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name">Urutkan: Nama</option>
                <option value="band">Urutkan: Band</option>
                <option value="songs">Urutkan: Jumlah Lagu</option>
                <option value="created">Urutkan: Tanggal Dibuat</option>
                <option value="updated">Urutkan: Terakhir Diupdate</option>
              </select>
            )}

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary setlist-sort-order-btn"
              title={sortOrder === 'asc' ? 'Urutan naik' : 'Urutan turun'}
              aria-label={sortOrder === 'asc' ? 'Ubah ke urutan turun' : 'Ubah ke urutan naik'}
            >
              {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
            </button>

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
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada setlist yang cocok dengan filter' : 'Belum ada setlist'}
          </p>
          {!hasActiveFilters && !isPerformanceMode && (
            <button className="btn setlist-empty-add-btn" onClick={() => setShowCreateSetlist(true)}>
              <PlusIcon size={18} /> Buat Setlist Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="song-list-container">
          {filteredSetlists.map(setlist => {
            const canEdit = canEditSetlist(setlist, userBandInfo, user);
            const canDelete = canDeleteSetlist(setlist, userBandInfo, user);
            return (
              <div
                key={setlist.id}
                className={`setlist-item${isPerformanceMode ? ' setlist-item-performance' : ''}`}
                onClick={() => navigate(`/setlists/${setlist.id}`)}
              >
                {/* Setlist Info */}
                <div className="setlist-info">
                  <h3 className="setlist-title">
                    {setlist.name}
                  </h3>
                    <div className="setlist-meta">
                      {isPerformanceMode ? (
                        <>
                          <span>🎵 {(setlist.songCount ?? setlist.songs?.length) || 0} lagu</span>
                          {setlist.bandName && <span>🎸 {setlist.bandName}</span>}
                        </>
                      ) : (
                        <>
                          {setlist.description && <span>{setlist.description}</span>}
                          {setlist.bandName && <span>🎸 {setlist.bandName}</span>}
                          <span>🎵 {(setlist.songCount ?? setlist.songs?.length) || 0} lagu</span>
                        </>
                      )}
                    </div>
                </div>

                {/* Actions */}
                {!isPerformanceMode && (
                  <div
                    className="setlist-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canEdit && (
                      <button
                        onClick={() => setEditSetlist(setlist)}
                        className="btn btn-secondary setlist-action-icon-btn"
                        title="Edit setlist"
                        aria-label={`Edit setlist ${setlist.name}`}
                      >
                        <EditIcon size={16} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteSetlist(setlist)}
                        className="btn btn-red setlist-action-icon-btn"
                        title="Hapus setlist"
                        aria-label={`Hapus setlist ${setlist.name}`}
                      >
                        <DeleteIcon size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Setlist Baru */}
      {!isPerformanceMode && showCreateSetlist && (
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
      {!isPerformanceMode && editSetlist && (
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

      {/* Modal Konfirmasi Hapus */}
      {!isPerformanceMode && deleteSetlist && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={() => setDeleteSetlist(null)}
          onKeyDown={e => { if (e.key === 'Escape') setDeleteSetlist(null); }}
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="setlist-delete-title">Hapus Setlist?</h2>
            <p className="setlist-delete-message">
              Yakin ingin menghapus setlist <b>{deleteSetlist.name}</b>? Tindakan ini tidak dapat dibatalkan.
            </p>
            {deleteError && <div className="error-text setlist-delete-error">{deleteError}</div>}
            <div className="setlist-delete-actions">
              <button className="btn" onClick={() => setDeleteSetlist(null)}>
                Batal
              </button>
              <button
                className="btn btn-red"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteError('');
                  setDeleteLoading(true);
                  try {
                    await deleteSetList(deleteSetlist.id);
                    setDeleteSetlist(null);
                    await refreshSetlists();
                  } catch (err) {
                    setDeleteError(err.message || 'Gagal menghapus setlist');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
              >
                {deleteLoading ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
