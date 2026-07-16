import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';
import { updatePageMeta } from '../utils/metaTagsUtil.js';
import PlusIcon from '../components/PlusIcon.jsx';
import BandListItem from '../components/BandListItem.jsx';
import { ListSkeleton } from '../components/LoadingSkeleton.jsx';

export default function BandManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Duplicate state declaration removed

  // Helper: get userBandInfo for a bandId
  const getUserBandInfo = (bandId) => {
    if (!user) return null;
    const band = bands.find(b => b.id === bandId);
    if (band && band.userRole) {
      return { role: band.userRole, bandId };
    }
    if (band && band.isOwner) {
      return { role: 'owner', bandId };
    }
    return { role: user?.role || 'member', bandId };
  };

  // --- Hapus pemanggilan usePermission di useMemo, panggil di dalam map JSX ---
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', genre: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Filter & Sort States
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    updatePageMeta({
      title: 'Manajemen Band | Ruang Performer',
      description: 'Buat dan kelola band Anda'
    });
  }, []);

  useEffect(() => {
    fetchBands();
  }, []);

  const fetchBands = async () => {
    try {
      setLoading(true);
      const data = await apiClient.fetchBands();
      setBands(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setBands([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique genres for filter
  const genreOptions = useMemo(() => {
    const genreSet = new Set();
    bands.forEach(band => {
      if (band.genre) genreSet.add(band.genre);
    });
    return Array.from(genreSet).sort();
  }, [bands]);

  // Filter and sort bands
  const filteredBands = useMemo(() => {
    let result = [...bands];

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(band =>
        band.name?.toLowerCase().includes(searchLower) ||
        band.description?.toLowerCase().includes(searchLower) ||
        band.genre?.toLowerCase().includes(searchLower)
      );
    }

    // Apply genre filter
    if (filterGenre !== 'all') {
      result = result.filter(band => band.genre === filterGenre);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'genre':
          aVal = a.genre?.toLowerCase() || '';
          bVal = b.genre?.toLowerCase() || '';
          break;
        case 'created':
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [bands, search, filterGenre, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterGenre('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newBand = await apiClient.createBand(formData);
      setBands([...bands, newBand]);
      setFormData({ name: '', description: '', genre: '' });
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = search || filterGenre !== 'all';

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🎸 Manajemen Band</h1>
        </div>
        <ListSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🎸 Manajemen Band</h1>
          <p>{filteredBands.length} dari {bands.length} band</p>
        </div>
        {/* Permission: Only show if user can create a band */}
        {user && (
          <button className="btn" onClick={() => setShowCreateForm(true)}>
            <PlusIcon size={18} /> Buat Band
          </button>
        )}
      </div>

      {error && <div className="error-message form-error">{error}</div>}

      {/* Filters & Search */}
      <div className="filter-container band-filter-panel">
        {/* Search Bar */}
        <div className="band-filter-main-row">
          <input
            type="text"
            placeholder="🔍 Cari nama band, deskripsi, atau genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-main"
          />
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? 'Sembunyikan Filter' : 'Filter Lanjutan'}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="band-filter-grid">
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="filter-select"
            >
              <option value="all">Semua Genre</option>
              {genreOptions.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="name">Urutkan: Nama</option>
              <option value="genre">Urutkan: Genre</option>
              <option value="created">Urutkan: Tanggal</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary"
              title={sortOrder === 'asc' ? 'Urut Naik' : 'Urut Turun'}
              type="button"
            >
              {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
                type="button"
              >
                ✕ Reset
              </button>
            )}
          </div>
        )}

        {hasActiveFilters && !showAdvancedFilters && (
          <div className="band-filter-hint">
            Filter aktif. Buka Filter Lanjutan untuk mengubah atau reset.
          </div>
        )}
      </div>

      {/* Band List */}
      {filteredBands.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasActiveFilters ? 'Tidak ada band yang cocok dengan filter' : 'Belum ada band'}
          </p>
          {!hasActiveFilters && (
            <button className="btn band-empty-cta" onClick={() => setShowCreateForm(true)}>
              <PlusIcon size={18} /> Buat Band Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="song-list-container">
          {filteredBands.map(band => {
            const userBandInfo = getUserBandInfo(band.id);
            return (
              <BandListItem
                key={band.id}
                band={band}
                userBandInfo={userBandInfo}
                navigate={navigate}
              />
            );
          })}
        </div>
      )}

      {/* Create Band Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Buat Band Baru</h2>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="Nama Band"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="modal-input"
              />
              <textarea
                placeholder="Deskripsi"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="modal-input"
                rows={3}
              />
              <input
                type="text"
                placeholder="Genre"
                value={formData.genre}
                onChange={e => setFormData({ ...formData, genre: e.target.value })}
                className="modal-input"
              />
              <div className="band-modal-actions">
                <button type="submit" disabled={submitting} className="btn">
                  {submitting ? 'Membuat...' : 'Buat Band'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
