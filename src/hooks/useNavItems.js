import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from './usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';

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
  { path: '/gigs', label: 'Konser', icon: '🎤', bottomNav: true },
  { path: '/bands/manage', label: 'Band', icon: '🎸' },
  { path: '/youtube-trending', label: 'Trending', icon: '📺' },
];

export function useNavItems() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userBandInfo = user && user.role ? { role: user.role } : null;
  const { can } = usePermission(null, userBandInfo);

  const items = [
    ...NAV_ITEMS,
    ...(can(PERMISSIONS.ADMIN_VIEW_LOGS) ? [{ path: '/audit', label: 'Audit Log', icon: '📝' }] : []),
    ...(user && user.role === 'owner' ? [{ path: '/tools', label: 'Tools', icon: '🛠️' }] : []),
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
