import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavItems } from '../hooks/useNavItems.js';

/**
 * MobileBottomNav
 *
 * Sticky bottom navigation untuk perangkat mobile. Menampilkan menu penting
 * secara langsung, sisanya (termasuk Logout) dibuka lewat tombol "Other".
 */
export default function MobileBottomNav() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { items, isActive } = useNavItems();
  const [otherOpen, setOtherOpen] = useState(false);

  const primaryItems = items.filter((item) => item.bottomNav);
  const otherItems = items.filter((item) => !item.bottomNav);

  const isOtherActive = otherItems.some((item) => item.path === 'logout' ? false : isActive(item.path));

  useEffect(() => {
    setOtherOpen(false);
  }, []);

  const handlePrimaryClick = (path) => {
    setOtherOpen(false);
    navigate(path);
  };

  const handleOtherClick = (path) => {
    setOtherOpen(false);
    if (path === 'logout') {
      logout();
      navigate('/login');
      return;
    }
    navigate(path);
  };

  return (
    <>
      {otherOpen && (
        <div
          className="mobile-bottom-nav-sheet-overlay"
          onClick={() => setOtherOpen(false)}
          role="presentation"
        >
          <div
            className="mobile-bottom-nav-sheet"
            role="menu"
            aria-label="Menu lainnya"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-bottom-nav-sheet-handle" aria-hidden="true" />
            {otherItems.map((item) => (
              <button
                key={item.path}
                type="button"
                role="menuitem"
                className={`mobile-bottom-nav-sheet-item ${item.path === 'logout' ? '' : (isActive(item.path) ? 'active' : '')}`}
                onClick={() => handleOtherClick(item.path)}
              >
                <span className="mobile-bottom-nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Navigasi bawah">
        {primaryItems.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`mobile-bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handlePrimaryClick(item.path)}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            <span className="mobile-bottom-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-bottom-nav-item ${otherOpen || isOtherActive ? 'active' : ''}`}
          onClick={() => setOtherOpen((v) => !v)}
          aria-expanded={otherOpen}
          aria-haspopup="menu"
        >
          <span className="mobile-bottom-nav-icon" aria-hidden="true">⋯</span>
          <span className="mobile-bottom-nav-label">Other</span>
        </button>
      </nav>
    </>
  );
}
