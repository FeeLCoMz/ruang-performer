import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';
import { updatePageMeta } from '../utils/metaTagsUtil.js';
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
    if (band && (band.role || band.userRole)) {
      return { role: band.role || band.userRole, bandId };
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
  // Error khusus form buat band: ditampilkan DI DALAM modal. Sebelumnya error
  // masuk ke state halaman sehingga tertutup overlay dan user tidak tahu
  // mengapa pembuatan band gagal.
  const [formError, setFormError] = useState(null);
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
    setFormError(null);
    try {
      const newBand = await apiClient.createBand(formData);
      setBands([...bands, newBand]);
      setFormData({ name: '', description: '', genre: '' });
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      setFormError(err.message || 'Gagal membuat band. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = search || filterGenre !== 'all';

  // Hook harus dipanggil SEBELUM early-return `if (loading)`. Menaruhnya
  // setelah return membuat jumlah hook berbeda antar-render dan React
  // melempar error (halaman crash ke ErrorBoundary).
  const genreCount = useMemo(() => {
    const set = new Set(bands.map((band) => band.genre).filter(Boolean));
    return set.size;
  }, [bands]);
  const ownerCount = useMemo(
    () => bands.filter((band) => band.isOwner || band.role === 'owner' || band.userRole === 'owner').length,
    [bands],
  );

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
    <div className="page-container band-page">
      <section className="bp-hero">
        <div className="bp-hero-top">
          <div className="bp-eyebrow">
            <span className="bp-eyebrow-dot" aria-hidden="true" />
            Band
          </div>
          {user && (
            <button
              className="btn bp-btn-primary"
              onClick={() => { setShowCreateForm(true); setFormError(null); }}
            >
              <span aria-hidden="true">＋</span> Buat Band
            </button>
          )}
        </div>

        <div className="bp-hero-heading">
          <h1 className="bp-hero-title">Manajemen Band</h1>
          <p className="bp-hero-subtitle">Kelola band, anggota, dan jadwal dalam satu tempat</p>
        </div>

        <div className="bp-summary-grid">
          <div className="bp-summary-card">
            <span className="bp-summary-label">Total band</span>
            <span className="bp-summary-value">{bands.length}</span>
            <span className="bp-summary-hint" aria-live="polite">
              {hasActiveFilters ? `${filteredBands.length} tampil` : 'Seluruh band kamu'}
            </span>
          </div>
          <div className={`bp-summary-card${ownerCount ? '' : ' bp-summary-card--muted'}`}>
            <span className="bp-summary-label">Sebagai pemilik</span>
            <span className={`bp-summary-value${ownerCount ? '' : ' bp-summary-value--muted'}`}>{ownerCount}</span>
            <span className="bp-summary-hint">Band yang kamu kelola</span>
          </div>
          <div className={`bp-summary-card${genreCount ? '' : ' bp-summary-card--muted'}`}>
            <span className="bp-summary-label">Genre berbeda</span>
            <span className={`bp-summary-value${genreCount ? '' : ' bp-summary-value--muted'}`}>
              {genreCount || '—'}
            </span>
            <span className="bp-summary-hint">{genreCount ? 'Variasi genre band' : 'Genre belum diisi'}</span>
          </div>
        </div>
      </section>

      {error && <div className="error-message form-error">{error}</div>}

      {/* Filters & Search */}
      <div className="filter-container band-filter-panel">
        {/* Search Bar */}
        <div className="band-filter-main-row">
          <input
            type="text"
            placeholder="Cari nama band, deskripsi, atau genre..."
            aria-label="Cari band"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-main"
          />
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            aria-expanded={showAdvancedFilters}
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
        <div className="empty-state band-empty-state">
          <div className="bp-empty-icon" aria-hidden="true">🎸</div>
          <p>
            {hasActiveFilters ? 'Tidak ada band yang cocok dengan filter' : 'Belum ada band'}
          </p>
          {!hasActiveFilters ? (
            <button className="btn bp-btn-primary band-empty-cta" onClick={() => setShowCreateForm(true)}>
              <span aria-hidden="true">＋</span> Buat Band Pertama
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleClearFilters}>
              Hapus filter
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
        <div className="modal-overlay" onClick={() => { setShowCreateForm(false); setFormError(null); }}>
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
                {formError && (
                  <p className="band-modal-error" role="alert">{formError}</p>
                )}
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
