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

export default function YouTubeTrendingPage({ performanceMode }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Trending YouTube</h1>
          <p>Daftar lagu musik paling populer di YouTube saat ini.</p>
        </div>
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
              <a
                key={item.videoId || index}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
