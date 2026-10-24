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
  const [activitiesError, setActivitiesError] = useState('');
  const [eventsError, setEventsError] = useState('');

  const loadActivities = useCallback(async () => {
    setStatsLoading(true);
    setBandsLoading(true);
    setActivitiesError('');

    // Setiap request diselesaikan sendiri-sendiri: statistik ringan (songs,
    // gigs) harus muncul segera tanpa menunggu setlists/bands yang bisa lambat.
    // Dengan Promise.allSettled biasa, satu request lambat menahan SEMUA stat
    // di skeleton — judul test "summary stats render immediately" menangkapnya.
    const track = (promise) => promise
      .then((value) => ({ status: 'fulfilled', value }))
      .catch((error) => ({ status: 'rejected', reason: error }));

    const songsPromise = track(apiClient.fetchSongs());
    const gigsPromise = track(apiClient.fetchGigs());

    // Partial update: kirim bagian yang sudah siap ke state secepat mungkin.
    const applyStats = (partial) => setStats((prev) => ({ ...prev, ...partial }));

    const [songsResult, gigsResult] = await Promise.all([songsPromise, gigsPromise]);

    const songsPayload = songsResult.status === 'fulfilled' ? songsResult.value : [];
    const gigsData = gigsResult.status === 'fulfilled' ? gigsResult.value : [];
    const songsData = Array.isArray(songsPayload) ? songsPayload : Array.isArray(songsPayload?.songs) ? songsPayload.songs : [];

    applyStats({ songs: songsData.length || 0, gigs: gigsData.length || 0 });
    setRecentActivity(buildRecentActivities({ bandsData: [], setlistsData: [], songsData, gigsData }));
    setStatsLoading(false);

    const [setlistsResult, bandsResult] = await Promise.all([
      track(apiClient.fetchSetLists({ summary: true })),
      track(apiClient.fetchBands()),
    ]);

    const setlistsData = setlistsResult.status === 'fulfilled' ? setlistsResult.value : [];
    const bandsData = bandsResult.status === 'fulfilled' ? bandsResult.value : [];

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

  const handleRetryActivities = loadActivities;

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError('');

    const gigsResult = await apiClient.fetchGigs()
      .then((data) => ({ status: 'fulfilled', value: data }))
      .catch((error) => ({ status: 'rejected', reason: error }));

    const gigsData = gigsResult.status === 'fulfilled' ? gigsResult.value : [];

    if (gigsResult.status === 'rejected') {
      setEventsError('Upcoming events gagal dimuat. Silakan coba lagi.');
    }

    setUpcomingEvents(buildUpcomingEvents({ gigsData }));
    setEventsLoading(false);
  }, []);

  const handleRetryEvents = loadEvents;

  useEffect(() => {
    loadActivities();
    loadEvents();
  }, [loadActivities, loadEvents]);

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

  const statItems = [
    { key: 'songs', icon: '🎵', label: 'Lagu', hint: 'Buka daftar lagu', to: '/songs' },
    { key: 'setlists', icon: '📋', label: 'Setlist', hint: 'Buka daftar setlist', to: '/setlists' },
    { key: 'bands', icon: '🎸', label: 'Band', hint: 'Buka daftar band', to: '/bands' },
    { key: 'gigs', icon: '🎤', label: 'Gigs', hint: 'Buka jadwal gigs', to: '/gigs' },
  ];

  return (
    <div className="page-container dashboard-page">
      <section className="dash-hero">
        <div className="dash-hero-top">
          <div className="dash-eyebrow">
            <span className="dash-eyebrow-dot" aria-hidden="true" />
            Ringkasan
          </div>
        </div>

        <div className="dash-hero-heading">
          <div className="dash-hero-title-block">
            <h1 className="dash-hero-title">Halo, {user?.username || 'Musician'}</h1>
            <p className="dash-hero-subtitle">
              Kelola lagu, setlist, dan jadwal panggung dalam satu tempat
            </p>
          </div>
          <div className="dash-hero-actions">
            <button className="btn dash-btn-primary" onClick={() => navigate('/songs/add')}>
              <span aria-hidden="true">＋</span> Tambah Lagu
            </button>
            <button className="btn dash-btn-ghost" onClick={() => navigate('/setlists')}>
              <span aria-hidden="true">📋</span> Setlist
            </button>
            <button className="btn dash-btn-ghost" onClick={() => navigate('/gigs')}>
              <span aria-hidden="true">🎤</span> Gigs
            </button>
          </div>
        </div>

        {/* Ringkasan angka dalam satu blok padat: satu angka besar + label
            per kartu, jauh lebih ringkas daripada empat kartu tinggi. */}
        <div className="dash-stats">
          {statItems.map((item) => {
            const value = stats[item.key] ?? 0;
            const isZero = !statsLoading && !value;
            return (
              <button
                key={item.key}
                type="button"
                className={`dash-stat${isZero ? ' dash-stat--muted' : ''}`}
                onClick={() => navigate(item.to)}
                title={item.hint}
                aria-label={`${item.label}: ${statsLoading ? 'memuat' : value}`}
              >
                <span className="dash-stat-icon" aria-hidden="true">{item.icon}</span>
                <span className="dash-stat-body">
                  <span className="dash-stat-value">
                    {statsLoading ? <span className="dash-stat-skeleton" /> : value}
                  </span>
                  <span className="dash-stat-label">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-content-grid dash-panels">
        {/* Recent Activity */}
        <div className="dashboard-card dash-panel">
          <h2 className="dash-panel-title">Aktivitas Terbaru</h2>
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
        <div className="dashboard-card dash-panel">
          <h2 className="dash-panel-title">Jadwal Terdekat</h2>
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
              {upcomingEvents.map((event) => (
                <div key={event.id} className="activity-item activity-item--clickable" onClick={() => {
                  if (event.type === 'gig') navigate('/gigs');
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

        {/* Spotify popular songs feature removed */}
      </div>

      {/* Band Highlights */}
      <div className="dashboard-card dash-panel dash-bands">
        <h2 className="dash-panel-title">Band Saya</h2>
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
          <div className="dash-empty">
            <p>Belum ada band</p>
            <button className="btn btn-secondary" onClick={() => navigate('/bands')}>
              Kelola Band
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
