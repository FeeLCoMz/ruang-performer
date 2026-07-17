import React, { useEffect, useState } from 'react';
import * as apiClient from '../apiClient.js';

function formatViews(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 'N/A';
  if (number >= 1000000000) return `${Math.round(number / 1000000000)}B`;
  if (number >= 1000000) return `${Math.round(number / 1000000)}M`;
  if (number >= 1000) return `${Math.round(number / 1000)}K`;
  return number.toString();
}

function formatPublishedDate(iso) {
  if (!iso) return 'Tanggal tidak tersedia';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildTrendingShareText(trending) {
  if (!Array.isArray(trending) || trending.length === 0) {
    return 'Daftar lagu trending YouTube belum tersedia.';
  }

  const lines = trending.map((item, index) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${item.videoId}`;
    return `${index + 1}. ${item.title} - ${item.channelTitle}\n${youtubeUrl}`;
  });

  return `Daftar Lagu Trending YouTube:\n\n${lines.join('\n\n')}`;
}

// Share Modal Component
function ShareModal({ isOpen, video, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !video) return null;

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const shareText = `🎵 ${video.title}\n🎤 ${video.channelTitle}\n👉 ${youtubeUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(youtubeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Social media share URLs
  const socialLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(youtubeUrl)}&text=${encodeURIComponent(`🎵 ${video.title}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(youtubeUrl)}`,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bagikan Lagu</h2>
          <button
            className="modal-close"
            onClick={onClose}
            title="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="modal-body youtube-share-modal-body">
          <div className="youtube-share-info">
            <h3>{video.title}</h3>
            <p className="youtube-share-channel">{video.channelTitle}</p>
            {video.viewCount && (
              <p className="youtube-share-stats">
                {formatViews(video.viewCount)} views • {formatPublishedDate(video.publishedAt)}
              </p>
            )}
          </div>

          <div className="youtube-share-link-section">
            <label>Link YouTube:</label>
            <div className="youtube-share-link-box">
              <input
                type="text"
                readOnly
                value={youtubeUrl}
                className="youtube-share-link-input"
              />
              <button
                className="btn btn-primary"
                onClick={handleCopyLink}
                title="Salin link"
              >
                {copied ? '✓ Disalin' : 'Salin Link'}
              </button>
            </div>
          </div>

          <div className="youtube-share-text-section">
            <label>Teks Bagikan:</label>
            <textarea
              readOnly
              value={shareText}
              className="youtube-share-textarea"
            />
            <button
              className="btn btn-secondary youtube-share-copy-text-btn"
              onClick={handleCopyText}
              title="Salin teks"
            >
              {copied ? '✓ Disalin' : 'Salin Teks'}
            </button>
          </div>

          <div className="youtube-share-social">
            <label>Bagikan ke Media Sosial:</label>
            <div className="youtube-share-social-buttons">
              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="btn btn-social whatsapp"
                title="Bagikan ke WhatsApp"
              >
                📱 WhatsApp
              </a>
              <a
                href={socialLinks.telegram}
                target="_blank"
                rel="noreferrer"
                className="btn btn-social telegram"
                title="Bagikan ke Telegram"
              >
                ✈️ Telegram
              </a>
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noreferrer"
                className="btn btn-social twitter"
                title="Bagikan ke Twitter"
              >
                𝕏 Twitter
              </a>
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noreferrer"
                className="btn btn-social facebook"
                title="Bagikan ke Facebook"
              >
                f Facebook
              </a>
            </div>
          </div>

          <div className="youtube-share-direct-link">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary youtube-share-watch-btn"
            >
              ▶️ Tonton di YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareAllTrendingModal({ isOpen, trending, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = buildTrendingShareText(trending);
  const encodedShareText = encodeURIComponent(shareText);
  const socialLinks = {
    whatsapp: `https://wa.me/?text=${encodedShareText}`,
    telegram: `https://t.me/share/url?text=${encodedShareText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedShareText}`,
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bagikan Semua Lagu Trending</h2>
          <button
            className="modal-close"
            onClick={onClose}
            title="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="modal-body youtube-share-modal-body">
          <div className="youtube-share-info">
            <h3>{trending.length} Lagu Siap Dibagikan</h3>
            <p className="youtube-share-channel">
              Bagikan daftar lengkap lagu trending YouTube ke teman atau grup band.
            </p>
          </div>

          <div className="youtube-share-text-section">
            <label>Teks Bagikan:</label>
            <textarea
              readOnly
              value={shareText}
              className="youtube-share-textarea youtube-share-textarea-large"
            />
            <button
              className="btn btn-secondary youtube-share-copy-text-btn"
              onClick={handleCopyText}
              title="Salin semua teks"
            >
              {copied ? '✓ Disalin' : 'Salin Semua Teks'}
            </button>
          </div>

          <div className="youtube-share-social">
            <label>Bagikan ke Media Sosial:</label>
            <div className="youtube-share-social-buttons">
              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="btn btn-social whatsapp"
                title="Bagikan daftar ke WhatsApp"
              >
                📱 WhatsApp
              </a>
              <a
                href={socialLinks.telegram}
                target="_blank"
                rel="noreferrer"
                className="btn btn-social telegram"
                title="Bagikan daftar ke Telegram"
              >
                ✈️ Telegram
              </a>
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noreferrer"
                className="btn btn-social twitter"
                title="Bagikan daftar ke Twitter"
              >
                𝕏 Twitter
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function YouTubeTrendingPage({ performanceMode }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareAllModal, setShowShareAllModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .fetchYoutubeTrending()
      .then((data) => {
        if (cancelled) return;
        setTrending(Array.isArray(data.trending) ? data.trending : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Gagal mengambil daftar trending YouTube');
        setTrending([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleShareClick = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedVideo(video);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSelectedVideo(null);
  };

  const handleOpenShareAll = () => {
    setShowShareAllModal(true);
  };

  const handleCloseShareAll = () => {
    setShowShareAllModal(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Trending YouTube</h1>
          <p>Daftar lagu musik paling populer di YouTube saat ini. Klik tombol bagikan untuk share dengan teman.</p>
        </div>
        {!performanceMode && trending.length > 0 && (
          <div className="youtube-trending-actions">
            <button
              className="btn btn-secondary"
              onClick={handleOpenShareAll}
              title="Bagikan seluruh daftar lagu trending"
            >
              📤 Bagikan Semua
            </button>
          </div>
        )}
      </div>

      <div className="card youtube-trending-panel">
        {loading ? (
          <p>Memuat daftar trending musik YouTube...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : trending.length === 0 ? (
          <p>Tidak ada data trending. Pastikan YouTube API key sudah dikonfigurasi.</p>
        ) : (
          <div className={`youtube-trending-grid ${performanceMode ? 'performance-mode' : ''}`}>
            {trending.map((item, index) => (
              <div
                key={item.videoId || index}
                className="youtube-trending-card-wrapper"
              >
                <a
                  href={`https://www.youtube.com/watch?v=${item.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="youtube-trending-card"
                >
                  {!performanceMode && item.thumbnailUrl && (
                    <img
                      className="youtube-trending-thumbnail"
                      src={item.thumbnailUrl}
                      alt={item.title}
                    />
                  )}
                  <div className="youtube-trending-card-body">
                    <div className="youtube-trending-rank">#{index + 1}</div>
                    <h2>{item.title}</h2>
                    <p className="youtube-trending-channel">{item.channelTitle}</p>
                    <p className="youtube-trending-meta">
                      {item.viewCount ? `${formatViews(item.viewCount)} views` : 'Views tidak tersedia'} • {formatPublishedDate(item.publishedAt)}
                    </p>
                  </div>
                </a>
                {!performanceMode && (
                  <button
                    className="youtube-trending-share-btn"
                    onClick={(e) => handleShareClick(e, item)}
                    title="Bagikan lagu ini"
                  >
                    📤 Bagikan
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ShareModal
        isOpen={showShareModal}
        video={selectedVideo}
        onClose={handleCloseShareModal}
      />

      <ShareAllTrendingModal
        isOpen={showShareAllModal}
        trending={trending}
        onClose={handleCloseShareAll}
      />
    </div>
  );
}
