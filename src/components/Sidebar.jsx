import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavItems, LOGOUT_ITEM } from '../hooks/useNavItems.js';
import StageModeButton from '../modules/stage-mode/StageModeButton.jsx';

export default function Sidebar({ isOpen, onClose, stageMode, onToggleStageMode, badges = {} }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { items: navItems, isActive } = useNavItems();

  // useNavItems tidak lagi menyertakan entri logout.
  const visibleNavItems = navItems;

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
            {visibleNavItems.map(item => {
              // Badge opsional dari App (mis. jumlah gigs mendatang).
              // Sebelumnya nilainya dibaca dari `item.badge` yang tidak pernah
              // diisi siapa pun, sehingga badge tidak pernah tampil.
              const badgeValue = Number(badges[item.path]) || 0;
              return (
                <button
                  key={item.path}
                  className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.path)}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {badgeValue > 0 && (
                    <span className="sidebar-badge" aria-label={`${badgeValue} baru`}>{badgeValue}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pintasan mode panggung. Dulu punya seksi berjudul sendiri
              ("PERFORMA") untuk satu tombol — sekarang cukup di baris terpisah. */}
          <div className="sidebar-nav-section">
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
            title={LOGOUT_ITEM.label}
            aria-label={LOGOUT_ITEM.label}
            tabIndex={0}
          >
            <span aria-hidden="true">{LOGOUT_ITEM.icon}</span>
            <span>{LOGOUT_ITEM.label}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  stageMode: PropTypes.bool,
  onToggleStageMode: PropTypes.func,
  /** Peta path menu → jumlah badge, mis. { '/gigs': 3 }. */
  badges: PropTypes.objectOf(PropTypes.number),
};
