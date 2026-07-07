import React, { useState, useEffect, useMemo } from 'react';
import { collectBandSongPool } from '../utils/setlistAutoBuilder.js';
import { collectSetlistSongPool } from '../utils/setlistAutoBuilder.js';
import { pickAutoSongs } from '../utils/setlistAutoBuilder.js';
import { generateAutoSetlistSongs } from '../utils/setlistAutoBuilder.js';

export default function SetlistForm({
  mode = 'create',
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  error = '',
  title = '',
  bands = [],
  sourceSetlists = [],
  songs = [],
  loadingSourceSetlists = false,
}) {
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || initialData.desc || '');
  const [bandId, setBandId] = useState(initialData.bandId || '');
  const [autoMode, setAutoMode] = useState('none');
  const [sourceSetlistId, setSourceSetlistId] = useState('');
  const [sourceSetlistSearch, setSourceSetlistSearch] = useState('');
  const [autoSongCount, setAutoSongCount] = useState('10');
  const [autoStrategy, setAutoStrategy] = useState('random');
  const [autoPreviewNonce, setAutoPreviewNonce] = useState(0);
  const [previewSearch, setPreviewSearch] = useState('');
  const [pinnedSongIds, setPinnedSongIds] = useState([]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setName(initialData.name || '');
    setDescription(initialData.description || initialData.desc || '');
    setBandId(initialData.bandId || '');
    setAutoMode('none');
    setSourceSetlistId('');
    setSourceSetlistSearch('');
    setAutoSongCount('10');
    setAutoStrategy('random');
    setAutoPreviewNonce(0);
    setPreviewSearch('');
    setPinnedSongIds([]);
    setFormError('');
  }, [initialData, mode]);

  useEffect(() => {
    setPreviewSearch('');
  }, [bandId, sourceSetlistId, autoSongCount, autoStrategy, autoMode]);

  useEffect(() => {
    if (autoMode !== 'existing') {
      setSourceSetlistSearch('');
    }
  }, [autoMode]);

  const availableBandSongIds = useMemo(() => {
    return collectBandSongPool(sourceSetlists, bandId);
  }, [sourceSetlists, bandId]);

  const existingSetlistOptions = useMemo(() => {
    return (sourceSetlists || []).filter((setlist) => Array.isArray(setlist?.songs) && setlist.songs.length > 0);
  }, [sourceSetlists]);

  const filteredExistingSetlistOptions = useMemo(() => {
    const term = sourceSetlistSearch.trim().toLowerCase();
    return existingSetlistOptions.filter((setlist) => {
      const matchBand = bandId ? String(setlist?.bandId || '') === String(bandId) : true;
      const matchSearch = !term
        || String(setlist?.name || '').toLowerCase().includes(term)
        || String(setlist?.bandName || '').toLowerCase().includes(term);
      return matchBand && matchSearch;
    });
  }, [existingSetlistOptions, sourceSetlistSearch, bandId]);

  useEffect(() => {
    if (!sourceSetlistId) return;
    const stillVisible = filteredExistingSetlistOptions.some(
      (setlist) => String(setlist?.id || '') === String(sourceSetlistId)
    );
    if (!stillVisible) {
      setSourceSetlistId('');
    }
  }, [filteredExistingSetlistOptions, sourceSetlistId]);

  const availableSourceSongIds = useMemo(() => {
    if (autoMode === 'band') {
      return availableBandSongIds;
    }
    if (autoMode === 'existing') {
      return collectSetlistSongPool(sourceSetlists, sourceSetlistId);
    }
    return [];
  }, [autoMode, availableBandSongIds, sourceSetlists, sourceSetlistId]);

  useEffect(() => {
    setPinnedSongIds((prev) => prev.filter((songId) => availableSourceSongIds.includes(songId)));
  }, [availableSourceSongIds]);

  const songMap = useMemo(() => {
    const map = new Map();
    (songs || []).forEach((song) => {
      if (song?.id) map.set(song.id, song);
    });
    return map;
  }, [songs]);

  const requestedPreviewCount = useMemo(() => {
    const parsedCount = Number.parseInt(autoSongCount, 10);
    if (!Number.isInteger(parsedCount) || parsedCount < 1) return 0;
    return Math.min(parsedCount, availableSourceSongIds.length);
  }, [autoSongCount, availableSourceSongIds.length]);

  const generatedSongIds = useMemo(() => {
    if (mode !== 'create' || autoMode === 'none' || loadingSourceSetlists) return [];
    if (requestedPreviewCount < 1) return [];

    if (autoMode === 'existing') {
      const effectiveStrategy = autoStrategy === 'recent' ? 'ordered' : autoStrategy;
      return pickAutoSongs(availableSourceSongIds, requestedPreviewCount, {
        strategy: effectiveStrategy,
      });
    }

    return generateAutoSetlistSongs(sourceSetlists, bandId, requestedPreviewCount, {
      strategy: autoStrategy,
    });
  }, [mode, autoMode, loadingSourceSetlists, requestedPreviewCount, sourceSetlists, bandId, autoStrategy, autoPreviewNonce, availableSourceSongIds]);

  const previewSongIds = useMemo(() => {
    if (generatedSongIds.length === 0) return [];
    const safePinnedSongIds = pinnedSongIds.filter((songId) => availableSourceSongIds.includes(songId));
    const nonPinnedGenerated = generatedSongIds.filter((songId) => !safePinnedSongIds.includes(songId));
    const merged = [...safePinnedSongIds, ...nonPinnedGenerated];
    return merged.slice(0, requestedPreviewCount);
  }, [generatedSongIds, pinnedSongIds, availableSourceSongIds, requestedPreviewCount]);

  const previewSongs = useMemo(() => {
    return previewSongIds.map((songId, index) => {
      const info = songMap.get(songId);
      return {
        id: songId,
        order: index + 1,
        pinned: pinnedSongIds.includes(songId),
        title: info?.title || `Song ${songId}`,
        artist: info?.artist || '',
      };
    });
  }, [previewSongIds, songMap, pinnedSongIds]);

  const filteredPreviewSongs = useMemo(() => {
    const term = previewSearch.trim().toLowerCase();
    if (!term) return previewSongs;
    return previewSongs.filter((song) => {
      return song.title.toLowerCase().includes(term) || song.artist.toLowerCase().includes(term);
    });
  }, [previewSongs, previewSearch]);

  const togglePinSong = (songId) => {
    setPinnedSongIds((prev) => {
      if (prev.includes(songId)) {
        return prev.filter((id) => id !== songId);
      }
      return [...prev, songId];
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Nama setlist wajib diisi');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      bandId: bandId || null,
      autoGenerate: false,
      autoSongCount: 0,
    };

    if (mode === 'create' && autoMode !== 'none') {
      if (autoMode === 'band') {
        if (!bandId) {
          setFormError('Pilih band terlebih dahulu untuk generate lagu otomatis');
          return;
        }
      }

      if (autoMode === 'existing') {
        if (!sourceSetlistId) {
          setFormError('Pilih setlist sumber terlebih dahulu');
          return;
        }
      }

      if (availableSourceSongIds.length === 0) {
        setFormError('Belum ada lagu yang bisa diambil dari sumber terpilih');
        return;
      }

      const parsedCount = Number.parseInt(autoSongCount, 10);
      if (!Number.isInteger(parsedCount) || parsedCount < 1) {
        setFormError('Jumlah lagu minimal 1');
        return;
      }

      if (!Array.isArray(previewSongIds) || previewSongIds.length === 0) {
        setFormError('Preview lagu kosong, silakan ubah pengaturan auto setlist');
        return;
      }

      payload.autoGenerate = true;
      payload.autoSourceType = autoMode;
      payload.autoSourceSetlistId = sourceSetlistId || null;
      payload.autoSongCount = Math.min(parsedCount, availableSourceSongIds.length);
      payload.autoStrategy = autoStrategy;
      payload.previewSongIds = previewSongIds;
    }

    onSubmit(payload);
  };

  return (
    <div
      className="modal-card"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-label={title || 'Setlist Modal'}
      onClick={e => e.stopPropagation()}
    >
      <h2 className="setlist-form-title">{title}</h2>
      
      <form onSubmit={handleSubmit} className="setlist-form-layout">
        <div>
          <label className="setlist-form-label">
            📋 Setlist Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="modal-input"
            placeholder="Enter setlist name..."
            required
            autoFocus
          />
        </div>

        <div>
          <label className="setlist-form-label">
            📝 Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="modal-input"
            placeholder="Add description..."
            rows={3}
          />
        </div>

        <div>
          <label className="setlist-form-label">
            🎸 Band (Optional)
          </label>
          <select
            value={bandId}
            onChange={e => setBandId(e.target.value)}
            className="modal-input"
          >
            <option value="">-- Select Band (Optional) --</option>
            {bands.map(band => (
              <option key={band.id} value={band.id}>{band.name}</option>
            ))}
          </select>
        </div>

        {mode === 'create' && (
          <div className="setlist-auto-section">
            <p className="setlist-auto-title">🎛️ Isi Lagu Setlist Baru</p>
            <label className="setlist-auto-option">
              <input
                type="radio"
                name="setlist-auto-mode"
                value="none"
                checked={autoMode === 'none'}
                onChange={() => setAutoMode('none')}
              />
              <span>Mulai dari setlist kosong</span>
            </label>
            <label className="setlist-auto-option">
              <input
                type="radio"
                name="setlist-auto-mode"
                value="band"
                checked={autoMode === 'band'}
                onChange={() => setAutoMode('band')}
              />
              <span>Ambil otomatis dari lagu-lagu setlist band terpilih</span>
            </label>
            <label className="setlist-auto-option">
              <input
                type="radio"
                name="setlist-auto-mode"
                value="existing"
                checked={autoMode === 'existing'}
                onChange={() => setAutoMode('existing')}
              />
              <span>Ambil dari setlist yang sudah ada</span>
            </label>

            {autoMode !== 'none' && (
              <div className="setlist-auto-config">
                <p className="setlist-auto-hint">
                  {loadingSourceSetlists
                    ? 'Sedang memuat sumber lagu setlist...'
                    : `Tersedia ${availableSourceSongIds.length} lagu unik dari sumber yang dipilih.`}
                </p>

                {autoMode === 'existing' && (
                  <>
                    <label className="setlist-form-label" htmlFor="source-setlist-search">
                      Cari setlist sumber
                    </label>
                    <input
                      id="source-setlist-search"
                      type="text"
                      value={sourceSetlistSearch}
                      onChange={(e) => setSourceSetlistSearch(e.target.value)}
                      className="modal-input"
                      disabled={loadingSourceSetlists}
                      placeholder={bandId ? 'Cari nama setlist di band terpilih...' : 'Cari nama setlist/band...'}
                    />
                    <label className="setlist-form-label" htmlFor="source-setlist-id">
                      Setlist sumber
                    </label>
                    <select
                      id="source-setlist-id"
                      value={sourceSetlistId}
                      onChange={(e) => setSourceSetlistId(e.target.value)}
                      className="modal-input"
                      disabled={loadingSourceSetlists}
                    >
                      <option value="">-- Pilih Setlist Sumber --</option>
                      {filteredExistingSetlistOptions.map((setlist) => (
                        <option key={setlist.id} value={setlist.id}>
                          {setlist.name} ({setlist.songs?.length || 0} lagu){setlist.bandName ? ` - ${setlist.bandName}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="setlist-auto-hint">
                      Menampilkan {filteredExistingSetlistOptions.length} setlist sumber
                      {bandId ? ' dari band yang dipilih.' : '.'}
                    </p>
                  </>
                )}

                <label className="setlist-form-label" htmlFor="auto-song-count">
                  Jumlah lagu yang dimasukkan
                </label>
                <input
                  id="auto-song-count"
                  type="number"
                  min="1"
                  max={Math.max(1, availableSourceSongIds.length)}
                  value={autoSongCount}
                  onChange={(e) => setAutoSongCount(e.target.value)}
                  className="modal-input"
                  disabled={loadingSourceSetlists}
                />
                <label className="setlist-form-label" htmlFor="auto-song-strategy">
                  Metode pengambilan lagu
                </label>
                <select
                  id="auto-song-strategy"
                  value={autoStrategy}
                  onChange={(e) => setAutoStrategy(e.target.value)}
                  className="modal-input"
                  disabled={loadingSourceSetlists}
                >
                  <option value="random">Acak</option>
                  <option value="ordered">Urutan asli</option>
                  {autoMode === 'band' && <option value="recent">Prioritaskan lagu terbaru</option>}
                </select>
                <p className="setlist-auto-hint">
                  {autoMode === 'band'
                    ? 'Opsi terbaru memprioritaskan lagu yang muncul di setlist band paling baru diupdate/dibuat.'
                    : 'Urutan asli mengikuti urutan lagu di setlist sumber.'}
                </p>

                {previewSongIds.length > 0 && (
                  <p className="setlist-auto-hint">
                    Lagu dipin: {previewSongs.filter((song) => song.pinned).length}. Lagu dipin akan diprioritaskan tetap masuk saat regenerate.
                  </p>
                )}

                {autoStrategy === 'random' && (
                  <div className="setlist-auto-controls">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setAutoPreviewNonce((prev) => prev + 1)}
                      disabled={loadingSourceSetlists || availableSourceSongIds.length === 0}
                    >
                      Regenerate Acak
                    </button>
                  </div>
                )}

                {previewSongs.length > 0 && (
                  <div className="setlist-auto-preview" aria-live="polite">
                    <div className="setlist-auto-preview-head">
                      <p className="setlist-auto-preview-title">Preview lagu terpilih</p>
                      <span className="setlist-auto-preview-count">
                        {filteredPreviewSongs.length}/{previewSongs.length} lagu
                      </span>
                    </div>
                    <input
                      type="text"
                      className="modal-input setlist-auto-preview-search"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Cari judul/artist di preview..."
                    />
                    <ul className="setlist-auto-preview-list">
                      {filteredPreviewSongs.map((song) => (
                        <li key={song.id} className="setlist-auto-preview-item">
                          <span className="setlist-auto-preview-order">{song.order}.</span>
                          <span className="setlist-auto-preview-main">
                            <span className="setlist-auto-preview-name">{song.title}</span>
                            {song.artist && <span className="setlist-auto-preview-artist">{song.artist}</span>}
                          </span>
                          <button
                            type="button"
                            className={`setlist-auto-pin-btn${song.pinned ? ' is-pinned' : ''}`}
                            onClick={() => togglePinSong(song.id)}
                            title={song.pinned ? 'Unpin lagu' : 'Pin lagu'}
                          >
                            {song.pinned ? 'Pinned' : 'Pin'}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {filteredPreviewSongs.length === 0 && (
                      <p className="setlist-auto-hint">Tidak ada lagu di preview yang cocok dengan pencarian.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(formError || error) && <div className="setlist-form-error">{formError || error}</div>}

        <div className="setlist-form-actions">
          <button
            type="button"
            className="btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn setlist-submit-btn"
            disabled={loading || !name.trim() || (mode === 'create' && autoMode !== 'none' && loadingSourceSetlists)}
          >
            {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Setlist')}
          </button>
        </div>
      </form>
    </div>
  );
}
