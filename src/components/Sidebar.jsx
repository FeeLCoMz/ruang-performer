import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [invitationCount, setInvitationCount] = useState(0);

  // Fetch invitation count on mount and when route changes
  useEffect(() => {
    const fetchInvitationCount = async () => {
      try {
        const data = await apiClient.getPendingInvitations();
        setInvitationCount(Array.isArray(data) ? data.length : 0);
      } catch (err) {
        // Silently fail if user not authenticated or fetch fails
        setInvitationCount(0);
      }
    };
    
    // Only fetch if user is authenticated
    if (logout) {
      fetchInvitationCount();
      // Refresh every 30 seconds
      const interval = setInterval(fetchInvitationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [location.pathname, logout]);

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
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Close button for mobile */}
        <button className="sidebar-close-btn" onClick={onClose} title="Close sidebar">
          ✕
        </button>

        {/* Logo/Branding */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">🎸</span>
            <span className="sidebar-logo-text">PerformerHub</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
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
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
