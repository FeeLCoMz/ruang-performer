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
  // Gunakan seluruh array bands agar permission cek semua band user
  const userBandInfo = bands && bands.length > 0 ? bands : [];
  const { can } = usePermission(null, userBandInfo);
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const [editSetlist, setEditSetlist] = React.useState(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [deleteSetlist, setDeleteSetlist] = React.useState(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');
  
  // Filter & Sort States
  const [search, setSearch] = React.useState('');
  const [filterBand, setFilterBand] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('updated');
  const [sortOrder, setSortOrder] = React.useState('desc');
  
  // Update page meta tags on mount
  React.useEffect(() => {
    updatePageMeta(pageMetadata.setlists);
  }, []);
  
  // Fetch bands on mount
  React.useEffect(() => {
    const loadBands = async () => {
      try {
        const data = await fetchBands();
        setBands(data || []);
      } catch (err) {
        console.error('Failed to load bands:', err);
      }
    };
    loadBands();
  }, []);
  
  // Helper untuk refresh setlists dari API
  const refreshSetlists = async () => {
    try {
      const data = await fetchSetLists();
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
    if (search.trim()) {
      const searchLower = search.toLowerCase();
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
  }, [setlists, search, filterBand, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterBand('all');
    setSortBy('created');
    setSortOrder('desc');
  };

  const hasActiveFilters = search || filterBand !== 'all';

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
        <div className="error-text" style={{ padding: '20px' }}>{errorSetlists}</div>
      </div>
    );
  }

  return (
    <div className={`page-container${isPerformanceMode ? ' performance-mode' : ''}`}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎵 Setlist</h1>
          {!isPerformanceMode && (
            <p>{filteredSetlists.length} dari {setlists.length} setlist</p>
          )}
        </div>
        {!isPerformanceMode && (
          // Tampilkan tombol jika user punya role (selain guest) di salah satu band ATAU user login (untuk setlist personal)
          ((Array.isArray(userBandInfo)
            ? userBandInfo.some(b => b.role && b.role !== 'guest')
            : can(PERMISSIONS.SETLIST_CREATE))
          ) && (
            <button className="btn" onClick={() => setShowCreateSetlist(true)}>
              <PlusIcon size={18} /> Buat Setlist
            </button>
          )
        )}
      </div>

      {/* Filters & Search */}
      {!isPerformanceMode && (
        <div className="filter-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Search Bar */}
          <input
            type="text"
            placeholder="🔍 Cari nama setlist, deskripsi, atau band..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-main"
          />

          {/* Filters Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
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

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary"
              title={sortOrder === 'asc' ? 'Urut Naik' : 'Urut Turun'}
            >
              {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Setlist List */}
      {filteredSetlists.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada setlist yang cocok dengan filter' : 'Belum ada setlist'}
          </p>
          {!hasActiveFilters && !isPerformanceMode && (
            <button className="btn" onClick={() => setShowCreateSetlist(true)} style={{ marginTop: '12px' }}>
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
                className="setlist-item"
                onClick={() => navigate(`/setlists/${setlist.id}`)}
              >
                {/* Setlist Info */}
                <div className="setlist-info">
                  <h3 className="setlist-title">
                    {setlist.name}
                  </h3>
                    <div className="setlist-meta">
                      {setlist.description && <span>{setlist.description}</span>}
                      {setlist.bandName && <span>🎸 {setlist.bandName}</span>}
                      {setlist.userName && <span>👤 {setlist.userName}</span>}
                      <span>🎵 {setlist.songs?.length || 0} lagu</span>
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
                        className="btn"
                        style={{ padding: '6px 12px', fontSize: '0.85em' }}
                        title="Edit"
                      >
                        <EditIcon size={16} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteSetlist(setlist)}
                        className="btn btn-red"
                        title="Hapus"
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
            loading={editLoading}
            error={createSetlistError}
            onCancel={() => setShowCreateSetlist(false)}
            onSubmit={async ({ name, description, bandId }) => {
              setCreateSetlistError('');
              setEditLoading(true);
              try {
                await addSetList({ name, description, bandId, userId: currentUserId });
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
            <h2 style={{ color: 'var(--error)' }}>Hapus Setlist?</h2>
            <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
              Yakin ingin menghapus setlist <b>{deleteSetlist.name}</b>? Tindakan ini tidak dapat dibatalkan.
            </p>
            {deleteError && <div className="error-text" style={{ marginBottom: '16px' }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
