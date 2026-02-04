import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';

export default function Sidebar({ isOpen, onClose, theme, setTheme, invitationCount: propInvitationCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  // Gunakan invitationCount dari prop (AppContent)
  const invitationCount = typeof propInvitationCount === 'number' ? propInvitationCount : 0;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/songs', label: 'Lagu', icon: '🎵' },
    { path: '/setlists', label: 'Setlist', icon: '📋' },
    { path: '/bands/manage', label: 'Band Saya', icon: '🎸' },
    { path: '/invitations/pending', label: 'Undangan', icon: '📨', badge: invitationCount },
    { path: '/practice', label: 'Latihan', icon: '💪' },
    { path: '/gigs', label: 'Konser', icon: '🎤' }
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
            <span className="sidebar-logo-text">PerformerHub</span>
          </div>
          {/* Theme toggle button for desktop */}
          <button
            className={`btn-base theme-switch-btn ${theme === 'dark' ? 'dark' : 'light'}`}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Ganti mode gelap/terang"
            style={{ marginLeft: 'auto', marginTop: 4 }}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
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
