import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';
import { buildRecentActivities, buildUpcomingEvents } from '../utils/dashboardUtils.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ songs: 0, setlists: 0, bands: 0, gigs: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [bands, setBands] = useState([]);
  const [bandsLoading, setBandsLoading] = useState(true);
  const [popularSongs, setPopularSongs] = useState([]);
  const [popularSongsLoading, setPopularSongsLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [popularSongsError, setPopularSongsError] = useState('');

  const handleRetryActivities = useCallback(async () => {
    setStatsLoading(true);
    setBandsLoading(true);
    setActivitiesError('');

    const [setlistsResult, bandsResult, songsResult, gigsResult] = await Promise.allSettled([
      apiClient.fetchSetLists({ summary: true }),
      apiClient.fetchBands(),
      apiClient.fetchSongs(),
      apiClient.fetchGigs(),
    ]);

    const setlistsData = setlistsResult.status === 'fulfilled' ? setlistsResult.value : [];
    const bandsData = bandsResult.status === 'fulfilled' ? bandsResult.value : [];
    const songsData = songsResult.status === 'fulfilled' ? songsResult.value : [];
    const gigsData = gigsResult.status === 'fulfilled' ? gigsResult.value : [];

    if (setlistsResult.status === 'rejected' || bandsResult.status === 'rejected' || songsResult.status === 'rejected' || gigsResult.status === 'rejected') {
      setActivitiesError('Sebagian data aktivitas gagal dimuat. Silakan coba lagi.');
    }

    setStats({
      songs: songsData.length || 0,
      setlists: setlistsData.length || 0,
      bands: bandsData.length || 0,
      gigs: gigsData.length || 0,
    });
    setBands(bandsData.slice(0, 5));
    setRecentActivity(buildRecentActivities({ bandsData, setlistsData, songsData, gigsData }));
    setStatsLoading(false);
    setBandsLoading(false);
  }, []);

  const handleRetryEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError('');

    const [gigsResult, practiceResult] = await Promise.allSettled([
      apiClient.fetchGigs(),
      apiClient.fetchPracticeSessions(),
    ]);

    const gigsData = gigsResult.status === 'fulfilled' ? gigsResult.value : [];
    const practiceData = practiceResult.status === 'fulfilled' ? practiceResult.value : [];

    if (gigsResult.status === 'rejected' || practiceResult.status === 'rejected') {
      setEventsError('Upcoming events gagal dimuat. Silakan coba lagi.');
    }

    setUpcomingEvents(buildUpcomingEvents({ practiceData, gigsData }));
    setEventsLoading(false);
  }, []);

  const handleRetryPopularSongs = useCallback(async () => {
    setPopularSongsLoading(true);
    setPopularSongsError('');

    try {
      const popularData = await apiClient.fetchPopularSongs();
      setPopularSongs(popularData.youtubeSongs || popularData.songs || []);
    } catch {
      setPopularSongs([]);
      setPopularSongsError('Lagu populer YouTube gagal dimuat. Silakan coba lagi.');
    } finally {
      setPopularSongsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      // Wave 1: Load lightweight critical data first (setlists, bands)
      setStatsLoading(true);
      setBandsLoading(true);
      setActivitiesError('');
      setEventsError('');
      setPopularSongsError('');

      const [setlistsResult, bandsResult] = await Promise.allSettled([
        apiClient.fetchSetLists({ summary: true }),
        apiClient.fetchBands(),
      ]);

      const setlistsData = setlistsResult.status === 'fulfilled' ? setlistsResult.value : [];
      const bandsData = bandsResult.status === 'fulfilled' ? bandsResult.value : [];

      if (!isMounted) return;

      if (setlistsResult.status === 'rejected' || bandsResult.status === 'rejected') {
        setActivitiesError('Sebagian data aktivitas gagal dimuat. Silakan coba lagi.');
      }

      // Render first wave immediately
      setStats(prev => ({
        ...prev,
        setlists: setlistsData.length || 0,
        bands: bandsData.length || 0
      }));
      setBands(bandsData.slice(0, 5));
      setBandsLoading(false);

      const activities = buildRecentActivities({
        bandsData,
        setlistsData,
        songsData: [],
        gigsData: [],
      });
      setRecentActivity(activities);

      // Wave 2: Load heavier data (songs, gigs, practice) in background
      setEventsLoading(true);
      setPopularSongsLoading(true);

      const [songsResult, gigsResult, practiceResult, popularResult] = await Promise.allSettled([
        apiClient.fetchSongs(),
        apiClient.fetchGigs(),
        apiClient.fetchPracticeSessions(),
        apiClient.fetchPopularSongs(),
      ]);

      const songsData = songsResult.status === 'fulfilled' ? songsResult.value : [];
      const gigsData = gigsResult.status === 'fulfilled' ? gigsResult.value : [];
      const practiceData = practiceResult.status === 'fulfilled' ? practiceResult.value : [];
      const popularData = popularResult.status === 'fulfilled' ? popularResult.value : { youtubeSongs: [] };

      if (!isMounted) return;

      if (songsResult.status === 'rejected' || gigsResult.status === 'rejected') {
        setActivitiesError('Aktivitas terbaru gagal diperbarui. Silakan coba lagi.');
      }

      if (gigsResult.status === 'rejected' || practiceResult.status === 'rejected') {
        setEventsError('Upcoming events gagal dimuat. Silakan coba lagi.');
      }

      if (popularResult.status === 'rejected') {
        setPopularSongsError('Lagu populer YouTube gagal dimuat. Silakan coba lagi.');
      }

      // Update stats with heavy data
      setStats(prev => ({
        ...prev,
        songs: songsData.length || 0,
        gigs: gigsData.length || 0
      }));

      // Update activities
      setRecentActivity(buildRecentActivities({ bandsData, setlistsData, songsData, gigsData }));

      // Process upcoming events
      setUpcomingEvents(buildUpcomingEvents({ practiceData, gigsData }));

      setPopularSongs(popularData.youtubeSongs || popularData.songs || []);
      setPopularSongsLoading(false);

      setStatsLoading(false);
      setEventsLoading(false);
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari Ini';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Besok';
    } else {
      return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div>
          <h1>👋 Selamat datang, {user?.username || 'Musician'}!</h1>
          <p>Kelola lagu, setlist, latihan, dan konser dalam satu platform</p>
        </div>
        <div>
          <button className="btn" onClick={() => navigate('/songs/add')}>
            ➕ Tambah Lagu
          </button>
          <button className="btn" onClick={() => navigate('/setlists')}>
            📋 Buat Setlist
          </button>
          <button className="btn" onClick={() => navigate('/gigs')}>
            🎤 Jadwal Konser
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card" onClick={() => navigate('/songs')}>
          <h3>🎵 Lagu</h3>
          <div className="stat-value">{statsLoading ? <span className="loading-skeleton loading-skeleton-stat" /> : stats.songs}</div>
          <p>Total lagu</p>
        </div>
        <div className="stat-card" onClick={() => navigate('/setlists')}>
          <h3>📋 Setlist</h3>
          <div className="stat-value">{statsLoading ? <span className="loading-skeleton loading-skeleton-stat" /> : stats.setlists}</div>
          <p>Setlist tersedia</p>
        </div>
        <div className="stat-card" onClick={() => navigate('/bands')}>
          <h3>🎸 Band</h3>
          <div className="stat-value">{statsLoading ? <span className="loading-skeleton loading-skeleton-stat" /> : stats.bands}</div>
          <p>Band aktif</p>
        </div>
        <div className="stat-card" onClick={() => navigate('/gigs')}>
          <h3>🎤 Konser</h3>
          <div className="stat-value">{statsLoading ? <span className="loading-skeleton loading-skeleton-stat" /> : stats.gigs}</div>
          <p>Jadwal konser</p>
        </div>
      </div>


      {/* Main Content Grid */}
      <div className="dashboard-content-grid">
        {/* Recent Activity */}
        <div className="dashboard-card">
          <h2>📊 Aktivitas Terbaru</h2>
          {activitiesError && (
            <div className="dashboard-inline-error">
              <span>{activitiesError}</span>
              <button className="btn btn-secondary" onClick={handleRetryActivities}>
                Coba Lagi
              </button>
            </div>
          )}
          {statsLoading ? (
            <div className="dashboard-event-list">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="activity-item">
                  <span className="loading-skeleton loading-skeleton-full" />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="dashboard-empty">Belum ada aktivitas</div>
          ) : (
            <div className="dashboard-event-list">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <div className="activity-text">{activity.text}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="dashboard-card">
          <h2>📅 Upcoming Events</h2>
          {eventsError && (
            <div className="dashboard-inline-error">
              <span>{eventsError}</span>
              <button className="btn btn-secondary" onClick={handleRetryEvents}>
                Coba Lagi
              </button>
            </div>
          )}
          {eventsLoading ? (
            <div className="dashboard-event-list">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="activity-item">
                  <span className="loading-skeleton loading-skeleton-full" />
                </div>
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="dashboard-empty">Tidak ada event dalam 7 hari ke depan</div>
          ) : (
            <div className="dashboard-event-list">
              {upcomingEvents.map((event, idx) => (
                <div key={event.id} className="activity-item activity-item--clickable" onClick={() => {
                  if (event.type === 'practice') navigate(`/practice/${event.id}`);
                  else if (event.type === 'gig') navigate(`/gigs/${event.id}`);
                }}>
                  <div className="activity-icon">{event.icon}</div>
                  <div className="activity-content">
                    <div className="activity-text">{event.title}</div>
                    <div className="activity-time">{formatDate(event.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Songs */}
        <div className="dashboard-card">
          <h2>🔥 Lagu Populer di YouTube</h2>
          {popularSongsError && (
            <div className="dashboard-inline-error">
              <span>{popularSongsError}</span>
              <button className="btn btn-secondary" onClick={handleRetryPopularSongs}>
                Coba Lagi
              </button>
            </div>
          )}
          {popularSongsLoading ? (
            <div className="dashboard-event-list">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="activity-item">
                  <span className="loading-skeleton loading-skeleton-full" />
                </div>
              ))}
            </div>
          ) : popularSongs.length === 0 ? (
            <div className="dashboard-empty">Tidak dapat memuat lagu populer YouTube</div>
          ) : (
            <div className="dashboard-popular-list">
              {popularSongs.slice(0, 5).map((song) => (
                <div
                  key={song.id}
                  className="activity-item activity-item--clickable"
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${song.youtubeId}`, '_blank', 'noopener,noreferrer')}
                >
                  <div className="activity-icon">🎵</div>
                  <div className="activity-content">
                    <div className="activity-text">{song.title}</div>
                    <div className="activity-time">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spotify popular songs feature removed */}
      </div>

      {/* Band Highlights */}
      <div className="card">
        <h2 className="dashboard-section-title">🎸 Band Saya</h2>
        {bandsLoading ? (
          <div className="dashboard-band-grid">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="card dashboard-band-card">
                <span className="loading-skeleton loading-skeleton-block" />
              </div>
            ))}
          </div>
        ) : bands.length > 0 ? (
          <div className="dashboard-band-grid">
            {bands.map(band => (
              <div
                key={band.id}
                className="card dashboard-band-card"
                onClick={() => navigate(`/bands/${band.id}`)}
              >
                <h3 className="dashboard-band-card-title">{band.name}</h3>
                {band.description && (
                  <p className="dashboard-band-card-description">
                    {band.description}
                  </p>
                )}
                <div className="dashboard-band-card-footer">
                  <span>{band.genre || 'General'}</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">Belum ada band</div>
        )}
      </div>
    </div>
  );
}
