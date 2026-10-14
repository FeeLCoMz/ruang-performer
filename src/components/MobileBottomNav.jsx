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
export default function MobileBottomNav({ performanceMode = false }) {
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

  // Android back button / browser back should close the "Other" sheet first,
  // instead of leaving the current page.
  useEffect(() => {
    if (!otherOpen) return undefined;

    const handlePopState = () => setOtherOpen(false);
    window.history.pushState({ mobileNavSheet: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If the sheet was closed by tapping an item/overlay (not via back),
      // remove the extra history entry we pushed.
      if (window.history.state?.mobileNavSheet) {
        window.history.back();
      }
    };
  }, [otherOpen]);

  // Nilai key & tempo aktif, dilaporkan oleh halaman lagu lewat event.
  const [perfState, setPerfState] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      setPerfState(e?.detail || null);
    };
    window.addEventListener('performance-state', handler);
    return () => window.removeEventListener('performance-state', handler);
  }, []);

  // Saat mode performance aktif, nav bawah diganti kontrol performance:
  // atur key (transpose) dan tempo (metronom/autoscroll) — dikirim sebagai
  // event yang didengarkan halaman lagu (SongChordsPage), karena state
  // kontrol itu dimiliki halaman. Nilai key/tempo aktif dilaporkan balik
  // oleh halaman via event performance-state agar bisa ditampilkan di sini.
  // Di halaman non-lagu, kontrol tetap tampil tapi nonaktif.
  if (performanceMode) {
    const isOnSongPage = /^\/setlists\/[^/]+\/songs\//.test(window.location?.pathname || '')
      || /^\/songs\/view\//.test(window.location?.pathname || '');

    const emitPerformanceAction = (action, payload = {}) => {
      if (!isOnSongPage) return;
      window.dispatchEvent(new CustomEvent('performance-action', { detail: { action, ...payload } }));
    };

    return (
      <nav className="performance-nav" aria-label="Kontrol performance">
        {/* Key: turun / tampil nilai / naik */}
        <button
          type="button"
          className="performance-nav-btn performance-nav-step"
          disabled={!isOnSongPage}
          onClick={() => emitPerformanceAction('transpose', { delta: -1 })}
          title="Turunkan key 1 semitone"
          aria-label="Turunkan key 1 semitone"
        >
          ♭
        </button>
        <button
          type="button"
          className="performance-nav-btn performance-nav-value"
          disabled={!isOnSongPage}
          onClick={() => emitPerformanceAction('transpose-reset')}
          title="Reset key ke asli"
          aria-label={`Key aktif: ${perfState?.key || '-'}. Tap untuk reset.`}
        >
          <span className="performance-nav-value-label">Key</span>
          <span className="performance-nav-value-text">{perfState?.key || '-'}</span>
        </button>
        <button
          type="button"
          className="performance-nav-btn performance-nav-step"
          disabled={!isOnSongPage}
          onClick={() => emitPerformanceAction('transpose', { delta: 1 })}
          title="Naikkan key 1 semitone"
          aria-label="Naikkan key 1 semitone"
        >
          ♯
        </button>

        {/* Tempo: turun / tampil nilai / naik */}
        <button
          type="button"
          className="performance-nav-btn performance-nav-step"
          disabled={!isOnSongPage}
          onClick={() => emitPerformanceAction('tempo', { delta: -5 })}
          title="Kurangi tempo 5 BPM"
          aria-label="Kurangi tempo 5 BPM"
        >
          −
        </button>
        <button
          type="button"
          className="performance-nav-btn performance-nav-value"
          disabled={!isOnSongPage}
          onClick={() => emitPerformanceAction('metronome-toggle')}
          title={`Tempo ${perfState?.tempo || '-'} BPM. Tap untuk nyalakan/metronom.`}
          aria-label={`Tempo ${perfState?.tempo || '-'} BPM`}
        >
          <span className="performance-nav-value-label">Tempo</span>
          <span className="performance-nav-value-text">{perfState?.tempo || '-'}</span>
        </button>
        <button
          type="button"
          className="performance-nav-btn performance-nav-step"
          disabled={!isOnSongPage}
          onClick={() => emitPerformanceAction('tempo', { delta: 5 })}
          title="Naikkan tempo 5 BPM"
          aria-label="Naikkan tempo 5 BPM"
        >
          +
        </button>

        {/* Exit */}
        <button
          type="button"
          className="performance-nav-btn performance-nav-exit"
          onClick={() => {
            try {
              localStorage.setItem('setlistSongs.performanceMode', 'false');
            } catch {
              /* ignore */
            }
            window.dispatchEvent(new CustomEvent('performance-mode-change', { detail: false }));
          }}
          title="Keluar dari mode performance"
          aria-label="Keluar dari mode performance"
        >
          ✕
          <span className="performance-nav-exit-label">Exit</span>
        </button>
      </nav>
    );
  }

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
