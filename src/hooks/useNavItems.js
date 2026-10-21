import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { isAppAdmin } from '../utils/adminAccess.js';

/**
 * Definisi menu navigasi utama aplikasi.
 *
 * Dipakai bersama oleh Sidebar (desktop/drawer) dan MobileBottomNav agar isi
 * menu selalu sinkron di semua tempat.
 *
 * `bottomNav: true` menandai menu penting yang tampil langsung di bottom nav
 * mobile; sisanya masuk ke tombol "Other".
 */
export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '🏠', bottomNav: true },
  { path: '/songs', label: 'Lagu', icon: '🎵', bottomNav: true },
  { path: '/setlists', label: 'Setlist', icon: '📋', bottomNav: true },
  { path: '/gigs', label: 'Gigs', icon: '🎤', bottomNav: true },
  { path: '/bands/manage', label: 'Band', icon: '🎸' },
  { path: '/modules', label: 'Modul', icon: '🧩' },
];

export function useNavItems() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const items = [
    ...NAV_ITEMS,
    // Halaman khusus Administrator (role akun owner/admin).
    ...(isAppAdmin(user) ? [{ path: '/admin', label: 'Admin', icon: '🛡️' }] : []),
    { path: 'logout', label: 'Logout', icon: '🚪' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    // Exact match untuk /bands agar tidak konflik dengan /bands/manage
    if (path === '/bands') return location.pathname === '/bands';
    return location.pathname.startsWith(path);
  };

  const goTo = (path) => navigate(path);

  return { items, isActive, goTo };
}

export default useNavItems;
