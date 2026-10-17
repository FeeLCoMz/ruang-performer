import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SetlistForm from '../components/SetlistForm.jsx';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';
import { fetchBands, addSetList, updateSetList, fetchSetLists } from '../apiClient.js';
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS, canPerformAction, canEditSetlist } from '../utils/permissionUtils.js';
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
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎵 Setlist</h1>
        </div>
        {(Array.isArray(userBandInfo)
          ? userBandInfo.some(b => b.role && b.role !== 'guest')
          : can(PERMISSIONS.SETLIST_CREATE)
        ) && (
          <div className="page-header-actions">
            <button className="btn" onClick={() => setShowCreateSetlist(true)}>
              <span aria-hidden="true">＋</span> Buat Setlist
            </button>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="filter-container setlist-filter-container">
          <input
            type="text"
            placeholder="🔍 Cari nama setlist, deskripsi, atau band..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-main"
          />

          {/* Filters Row */}
          <div className="setlist-filter-grid">
            <div className="setlist-filter-field">
              <label className="setlist-filter-label" htmlFor="setlist-band-filter">Band</label>
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

            <div className="setlist-filter-field">
              <label className="setlist-filter-label" htmlFor="setlist-sort-by">Urutkan</label>
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
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary setlist-sort-order-btn"
              title={sortOrder === 'asc' ? 'Urutan naik' : 'Urutan turun'}
              aria-label={sortOrder === 'asc' ? 'Ubah ke urutan turun' : 'Ubah ke urutan naik'}
            >
              {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
            </button>

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
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada setlist yang cocok dengan filter' : 'Belum ada setlist'}
          </p>
          {!hasActiveFilters && (
            <button className="btn setlist-empty-add-btn" onClick={() => setShowCreateSetlist(true)}>
              <span aria-hidden="true">＋</span> Buat Setlist Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="song-list-container">
          {filteredSetlists.map(setlist => {
            const canEdit = canEditSetlist(setlist, userBandInfo, user);
            return (
              <div
                key={setlist.id}
                className="setlist-item"
                onClick={() => navigate(`/setlists/${setlist.id}`)}
              >
                {/* Setlist Info */}
                <div className="setlist-info">
                  <h3 className="setlist-title">
                    {setlist.name}
                  </h3>
                    <div className="setlist-meta">
                      {setlist.bandName && (
                        <span className="setlist-meta-badge setlist-meta-band">🎸 {setlist.bandName}</span>
                      )}
                      <span className="setlist-meta-badge">🎵 {(setlist.songCount ?? setlist.songs?.length) || 0} lagu</span>
                      {setlist.description && (
                        <span className="setlist-meta-desc">{setlist.description}</span>
                      )}
                    </div>
                </div>

                {/* Actions */}
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
                      <span aria-hidden="true">✎</span>
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

    </div>
  );
}
