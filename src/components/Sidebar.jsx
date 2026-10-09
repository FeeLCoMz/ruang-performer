import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';

export default function Sidebar({ isOpen, onClose, theme, setTheme, performanceMode, setPerformanceMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  // ...invitation logic removed...

  // Ambil info band dan role user jika ada (untuk permission)
  // Di sidebar global, kita asumsikan role global (user.role) untuk audit log
  const userBandInfo = user && user.role ? { role: user.role } : null;
  const { can } = usePermission(null, userBandInfo);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/songs', label: 'Lagu', icon: '🎵' },
    { path: '/setlists', label: 'Setlist', icon: '📋' },
    { path: '/bands/manage', label: 'Band', icon: '🎸' },
    { path: '/gigs', label: 'Konser', icon: '🎤' },
    { path: '/youtube-trending', label: 'Trending', icon: '📺' },
    ...(can && can('view_audit_log') ? [{ path: '/audit', label: 'Audit Log', icon: '📝' }] : []),
    ...(user && user.role === 'owner' ? [{ path: '/tools', label: 'Tools', icon: '🛠️' }] : []),
  ];

  // Saat Performance Mode aktif, tampilkan hanya menu Lagu dan Setlist
  const visibleNavItems = performanceMode
    ? navItems.filter((item) => item.path === '/songs' || item.path === '/setlists')
    : navItems;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    // Exact match untuk /bands agar tidak konflik dengan /bands/manage
    if (path === '/bands') return location.pathname === '/bands';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path) => {
    navigate(path);
    onClose(); // Close sidebar on mobile after navigation
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Overlay untuk mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} tabIndex={-1} aria-label="Tutup sidebar"></div>}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Sidebar utama" tabIndex={0}>
        {/* Logo/Branding */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">🎸</span>
            <span className="sidebar-logo-text">Ruang Performer</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            title="Tutup menu"
            aria-label="Tutup menu"
          >
            ✕
          </button>
        </div>

        {/* Theme & Performance Mode toggle buttons */}
        <div className="sidebar-controls">
          <button
            className={`btn btn-secondary sidebar-control-btn ${theme === 'dark' ? 'dark' : 'light'}`}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Ganti mode gelap/terang"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <button
            className={`btn btn-secondary sidebar-control-btn sidebar-performance-btn ${performanceMode ? 'active' : ''}`}
            onClick={() => setPerformanceMode(v => !v)}
            title={performanceMode ? 'Nonaktifkan Performance Mode' : 'Aktifkan Performance Mode'}
            aria-label="Toggle performance mode"
          >
            {performanceMode ? '🎤 Performance' : '🎶 Normal'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Navigasi utama sidebar">
          <div className="sidebar-nav-section">
            <h3 className="sidebar-nav-title">Menu Utama</h3>
            {visibleNavItems.map(item => (
              <button
                key={item.path}
                className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.badge > 0 && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer - Logout */}
        <div className="sidebar-footer">
          <button
            className="btn"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            tabIndex={0}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
