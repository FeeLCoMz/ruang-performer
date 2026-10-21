/**
 * YoutubeVideoPickerModal.jsx
 *
 * Modal pencarian & pemilihan video YouTube untuk mengisi field YouTube ID.
 *
 * Dipakai karena AI Autofill tidak lagi menebak satu video secara otomatis:
 * user mengetik query, melihat beberapa hasil (thumbnail, judul, channel), lalu
 * memilih satu. Beberapa hasil lebih dapat dipercaya daripada satu tebakan.
 *
 * Props:
 *   open      : boolean
 *   onClose() : tutup modal
 *   onSelect(video): video = { videoId, title, channelTitle, thumbnail }
 *   initialQuery : query awal (biasanya "judul artist")
 *   onError(message) : laporan error opsional
 */
import React, { useEffect, useRef, useState } from 'react';
import { searchYoutubeVideos } from '../../apiClient.js';
import './youtube-picker.css';

export default function YoutubeVideoPickerModal({
  open,
  onClose,
  onSelect,
  initialQuery = '',
  onError,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  // Menahan pencarian otomatis agar tidak terpicu ulang saat state berubah.
  const autoSearchRef = useRef(false);

  // Reset saat modal dibuka; query mengikuti judul/artist terbaru.
  useEffect(() => {
    if (!open) {
      autoSearchRef.current = false;
      return undefined;
    }
    setQuery(initialQuery || '');
    setVideos([]);
    setError('');
    setLoading(false);
    autoSearchRef.current = true;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, initialQuery]);

  /** Pencarian ke API. Dipakai oleh tombol, form, dan pencarian otomatis. */
  const performSearch = async (rawQuery) => {
    const q = String(rawQuery || '').trim();
    if (!q) {
      setError('Isi kata pencarian terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchYoutubeVideos({ q, max: 8 });
      setVideos(Array.isArray(data?.videos) ? data.videos : []);
      if (!data?.videos?.length) setError('Tidak ada video yang cocok. Coba kata kunci lain.');
    } catch (err) {
      setVideos([]);
      const message = err.message || 'Pencarian YouTube gagal';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  // Pencarian otomatis berdasarkan judul + artis saat modal dibuka. Hanya
  // sekali per pembukaan: user tetap bisa mengubah kata kunci lalu mencari lagi.
  useEffect(() => {
    if (!open || !autoSearchRef.current) return;
    autoSearchRef.current = false;
    if (String(initialQuery || '').trim()) performSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  // Esc menutup modal.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const runSearch = (event) => {
    event?.preventDefault?.();
    performSearch(query);
  };

  return (
    <div
      className="modal-overlay youtube-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Cari video YouTube"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="modal youtube-picker" onClick={(event) => event.stopPropagation()}>
        <div className="youtube-picker-head">
          <h3>🎬 Cari video YouTube</h3>
          <button type="button" className="btn btn-secondary" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>

        <form className="youtube-picker-search" onSubmit={runSearch}>
          <label className="youtube-picker-search-label" htmlFor="youtube-picker-query">
            Kata kunci
          </label>
          <div className="youtube-picker-search-box">
            <span className="youtube-picker-search-icon" aria-hidden="true">🔍</span>
            <input
              id="youtube-picker-query"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Judul lagu / artis"
              aria-label="Kata pencarian video"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary youtube-picker-search-btn" disabled={loading}>
              {loading ? 'Mencari…' : 'Cari'}
            </button>
          </div>
        </form>

        {error && <div className="tools-feedback tools-feedback-error">{error}</div>}

        {initialQuery && initialQuery.trim() && (
          <p className="youtube-picker-query-hint">
            Dicari dari judul &amp; artis: <strong>{initialQuery.trim()}</strong>
          </p>
        )}

        <div className="youtube-picker-results">
          {loading && <div className="youtube-picker-empty">Mencari video…</div>}
          {!loading && videos.length === 0 && !error && (
            <div className="youtube-picker-empty">
              Ketik judul lagu, atau ubah kata kunci di atas lalu tekan Cari.
            </div>
          )}
          {videos.map((video) => (
            <button
              key={video.videoId}
              type="button"
              className="youtube-picker-item"
              onClick={() => onSelect?.(video)}
            >
              {video.thumbnail ? (
                <img src={video.thumbnail} alt="" loading="lazy" />
              ) : (
                <span className="youtube-picker-thumb-fallback" aria-hidden="true">🎬</span>
              )}
              <span className="youtube-picker-meta">
                <span className="youtube-picker-title">{video.title}</span>
                <span className="youtube-picker-channel">
                  {video.channelTitle || '-'}
                  {video.publishedAt ? ` · ${new Date(video.publishedAt).getFullYear()}` : ''}
                </span>
                <span className="youtube-picker-id">{video.videoId}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
