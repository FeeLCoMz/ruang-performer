import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';

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

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      // Wave 1: Load lightweight critical data first (setlists, bands)
      setStatsLoading(true);
      setBandsLoading(true);

      const [setlistsData, bandsData] = await Promise.all([
        apiClient.fetchSetLists({ summary: true }).catch(() => []),
        apiClient.fetchBands().catch(() => []),
      ]);

      if (!isMounted) return;

      // Render first wave immediately
      setStats(prev => ({
        ...prev,
        setlists: setlistsData.length || 0,
        bands: bandsData.length || 0
      }));
      setBands(bandsData.slice(0, 5));
      setBandsLoading(false);

      const now = new Date();
      const activities = [];
      if (bandsData.length > 0) activities.push({ icon: '🎸', text: `${bandsData.length} band terdaftar`, time: 'Recently' });
      if (setlistsData.length > 0) activities.push({ icon: '📋', text: `${setlistsData.length} setlist tersedia`, time: 'Recently' });
      setRecentActivity(activities);

      // Wave 2: Load heavier data (songs, gigs, practice) in background
      setEventsLoading(true);

      const [songsData, gigsData, practiceData] = await Promise.all([
        apiClient.fetchSongs().catch(() => []),
        apiClient.fetchGigs().catch(() => []),
        apiClient.fetchPracticeSessions().catch(() => []),
      ]);

      if (!isMounted) return;

      // Update stats with heavy data
      setStats(prev => ({
        ...prev,
        songs: songsData.length || 0,
        gigs: gigsData.length || 0
      }));

      // Update activities
      const updatedActivities = [...activities];
      if (songsData.length > 0) updatedActivities.unshift({ icon: '🎵', text: `${songsData.length} lagu dalam database`, time: 'Always' });
      if (gigsData.length > 0) {
        const completedGigs = gigsData.filter(g => new Date(g.date) < now).length;
        updatedActivities.push({ icon: '🎤', text: `${completedGigs} gig telah selesai`, time: 'All time' });
      }
      setRecentActivity(updatedActivities.slice(0, 4));

      // Process upcoming events
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingPractice = practiceData.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate >= now && sessionDate <= sevenDaysLater;
      }).map(s => ({ type: 'practice', id: s.id, title: s.bandName || 'Practice Session', date: s.date, icon: '💪' }));
      const upcomingGigs = gigsData.filter(g => {
        const gigDate = new Date(g.date);
        return gigDate >= now && gigDate <= sevenDaysLater;
      }).map(g => ({ type: 'gig', id: g.id, title: `${g.venue || 'Venue'} - ${g.bandName || 'Gig'}`, date: g.date, icon: '🎤' }));

      const combined = [...upcomingPractice, ...upcomingGigs]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
      setUpcomingEvents(combined);

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
