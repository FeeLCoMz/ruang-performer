import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavItems } from '../hooks/useNavItems.js';
import StageModeButton from '../modules/stage-mode/StageModeButton.jsx';

export default function Sidebar({ isOpen, onClose, stageMode, onToggleStageMode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { items: navItems, isActive } = useNavItems();

  const visibleNavItems = navItems.filter((item) => item.path !== 'logout');

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
            <img
              className="sidebar-logo-icon"
              src="/icon-192x192.png"
              alt=""
              width="32"
              height="32"
              aria-hidden="true"
            />
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

          {/* Toggle Stage Mode — pintasan ke mode panggung dari menu. */}
          <div className="sidebar-nav-section">
            <h3 className="sidebar-nav-title">Performa</h3>
            <div className="sidebar-stage-mode">
              <StageModeButton stageMode={stageMode} onToggle={() => onToggleStageMode?.(!stageMode)} />
            </div>
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
