import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    songs: 0,
    setlists: 0,
    bands: 0,
    gigs: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [songsData, setlistsData, bandsData, practiceData, gigsData] = await Promise.all([
        apiClient.fetchSongs().catch(() => []),
        apiClient.fetchSetLists().catch(() => []),
        apiClient.fetchBands().catch(() => []),
        apiClient.fetchPracticeSessions().catch(() => []),
        apiClient.fetchGigs().catch(() => [])
      ]);

      const songs = songsData || [];
      const setlists = setlistsData || [];
      const bandsList = bandsData || [];
      const sessions = practiceData || [];
      const gigs = gigsData || [];

      setStats({
        songs: songs.length,
        setlists: setlists.length,
        bands: bandsList.length,
        gigs: gigs.length
      });

      setBands(bandsList.slice(0, 5)); // Show top 5 bands

      // Get upcoming events (next 7 days)
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const upcomingPractice = sessions
        .filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate >= now && sessionDate <= sevenDaysLater;
        })
        .map(s => ({
          type: 'practice',
          id: s.id,
          title: s.bandName || 'Practice Session',
          date: s.date,
          icon: '💪'
        }));

      const upcomingGigs = gigs
        .filter(g => {
          const gigDate = new Date(g.date);
          return gigDate >= now && gigDate <= sevenDaysLater;
        })
        .map(g => ({
          type: 'gig',
          id: g.id,
          title: `${g.venue || 'Venue'} - ${g.bandName || 'Gig'}`,
          date: g.date,
          icon: '🎤'
        }));

      const combined = [...upcomingPractice, ...upcomingGigs]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

      setUpcomingEvents(combined);

      // Build recent activity
      const activities = [];
      
      if (songs.length > 0) {
        activities.push({
          icon: '🎵',
          text: `${songs.length} lagu dalam database`,
          time: 'Always'
        });
      }

      if (bandsList.length > 0) {
        activities.push({
          icon: '🎸',
          text: `${bandsList.length} band terdaftar`,
          time: 'Recently'
        });
      }

      if (setlists.length > 0) {
        activities.push({
          icon: '📋',
          text: `${setlists.length} setlist tersedia`,
          time: 'Recently'
        });
      }

      if (gigs.length > 0) {
        const completedGigs = gigs.filter(g => new Date(g.date) < now).length;
        activities.push({
          icon: '🎤',
          text: `${completedGigs} gig telah selesai`,
          time: 'All time'
        });
      }

      setRecentActivity(activities.slice(0, 4));
      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="loading-container">
        <div>Memuat dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div>
          <h1>👋 Selamat datang, {user?.username || 'Musician'}!</h1>
          <p>Kelola lagu, setlist, latihan, dan konser dalam satu platform</p>
        </div>
        <div>
          <button className="btn-base" onClick={() => navigate('/songs/add')}>
            ➕ Tambah Lagu
          </button>
          <button className="btn-base" onClick={() => navigate('/setlists')}>
            📋 Buat Setlist
          </button>
          <button className="btn-base" onClick={() => navigate('/gigs')}>
            🎤 Jadwal Konser
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card" onClick={() => navigate('/songs')}>
          <h3>🎵 Lagu</h3>
          <div className="stat-value">{stats.songs}</div>
          <p>Total lagu</p>
        </div>
        <div className="stat-card" onClick={() => navigate('/setlists')}>
          <h3>📋 Setlist</h3>
          <div className="stat-value">{stats.setlists}</div>
          <p>Setlist tersedia</p>
        </div>
        <div className="stat-card" onClick={() => navigate('/bands')}>
          <h3>🎸 Band</h3>
          <div className="stat-value">{stats.bands}</div>
          <p>Band aktif</p>
        </div>
        <div className="stat-card" onClick={() => navigate('/gigs')}>
          <h3>🎤 Konser</h3>
          <div className="stat-value">{stats.gigs}</div>
          <p>Jadwal konser</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content-grid">
        {/* Upcoming Events */}
        <div className="dashboard-card">
          <h2>📅 Jadwal Mendatang</h2>
          {upcomingEvents.length === 0 ? (
            <div className="dashboard-empty">
              Tidak ada jadwal untuk 7 hari ke depan
            </div>
          ) : (
            <div className="dashboard-event-list">
              {upcomingEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="event-item"
                  onClick={() => navigate(event.type === 'practice' ? '/practice' : '/gigs')}
                >
                  <div className="event-icon">{event.icon}</div>
                  <div className="event-content">
                    <div className="event-title">{event.title}</div>
                    <div className="event-date">{formatDate(event.date)}</div>
                  </div>
                  <div className="event-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <h2>📊 Aktivitas Terbaru</h2>
          {recentActivity.length === 0 ? (
            <div className="dashboard-empty">
              Belum ada aktivitas
            </div>
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
      </div>

      {/* Band Highlights */}
      {bands.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.2em', marginTop: 0, marginBottom: '16px' }}>🎸 Band Saya</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {bands.map(band => (
              <div
                key={band.id}
                className="card"
                onClick={() => navigate(`/bands/${band.id}`)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '1.1em', color: 'var(--text-primary)' }}>{band.name}</h3>
                {band.description && (
                  <p style={{ 
                    margin: 0, 
                    marginBottom: '8px', 
                    color: 'var(--text-muted)', 
                    fontSize: '0.9em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {band.description}
                  </p>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85em',
                  color: 'var(--text-muted)',
                  marginTop: 'auto'
                }}>
                  <span>{band.genre || 'General'}</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
