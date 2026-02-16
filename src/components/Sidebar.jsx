import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import * as apiClient from '../apiClient.js';

export default function Sidebar({ isOpen, onClose, theme, setTheme, performanceMode, setPerformanceMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  // ...invitation logic removed...

  // Ambil info band dan role user jika ada (untuk permission)
  // Di sidebar global, kita asumsikan role global (user.role) untuk audit log
  // dan user login saja untuk 2FA
  const userBandInfo = user && user.role ? { role: user.role } : null;
  const { can } = usePermission(null, userBandInfo);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/songs', label: 'Lagu', icon: '🎵' },
    { path: '/karaoke', label: 'Lirik', icon: '🎤' },
    { path: '/setlists', label: 'Setlist', icon: '📋' },
    { path: '/bands/manage', label: 'Band Saya', icon: '🎸' },
    { path: '/practice', label: 'Latihan', icon: '💪' },
    { path: '/gigs', label: 'Konser', icon: '🎤' },
    // Menu Tools (khusus owner)
    ...(user && user.role === 'owner'
      ? [{ path: '/tools', label: 'Tools', icon: '🛠️' }] : []),
  ];

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
        {/* Close button for mobile */}
        <button className="sidebar-close-btn" onClick={onClose} title="Tutup sidebar" aria-label="Tutup sidebar" tabIndex={0}>
          ✕
        </button>

        {/* Logo/Branding */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">🎸</span>
            <span className="sidebar-logo-text">Ruang Performer</span>
          </div>
          {/* Theme & Performance Mode toggle buttons for desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', marginTop: 4 }}>
            <button
              className={`btn theme-switch-btn ${theme === 'dark' ? 'dark' : 'light'}`}
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title="Ganti mode gelap/terang"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            <button
              className={`btn performance-switch-btn${performanceMode ? ' active' : ''}`}
              onClick={() => setPerformanceMode(v => !v)}
              title={performanceMode ? 'Nonaktifkan Performance Mode' : 'Aktifkan Performance Mode'}
              aria-label="Toggle performance mode"
            >
              {performanceMode ? '🎤 Performance' : '🎶 Normal'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Navigasi utama sidebar">
          <div className="sidebar-nav-section">
            <h3 className="sidebar-nav-title">Menu Utama</h3>
            {navItems.map(item => (
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
            {/* Menu Pengaturan 2FA, hanya tampil jika user login */}
            {user && (
              <button
                className={`sidebar-nav-item ${isActive('/settings/2fa') ? 'active' : ''}`}
                onClick={() => handleNavClick('/settings/2fa')}
              >
                <span className="sidebar-nav-icon">🔒</span>
                <span className="sidebar-nav-label">Keamanan 2FA</span>
              </button>
            )}
          </div>
        </nav>

        {/* Footer - Logout */}
        <div className="sidebar-footer">
          <button
            className="sidebar-logout-btn"
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
