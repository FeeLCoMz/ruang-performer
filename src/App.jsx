import ModulesPage from './pages/ModulesPage.jsx';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';

// Eager load critical pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NotFound from './components/NotFound.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Sidebar from './components/Sidebar.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import Toast from './components/Toast.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import * as apiClient from './apiClient.js';
import { STORAGE_KEYS } from './utils/storageKeys.js';
import { isAppAdmin } from './utils/adminAccess.js';
import StageModeButton from './modules/stage-mode/StageModeButton.jsx';
// Stage Mode dimuat terpisah (chunk sendiri, termasuk CSS-nya) dan hanya
// di-mount saat dipakai — pengguna HP/latihan tidak menanggung bundelnya.
const StageModePage = lazy(() => import('./modules/stage-mode/StageModePage.jsx'));

// Lazy load non-critical pages for code splitting
const SongListPage = lazy(() => import('./pages/SongListPage.jsx'));
const SongChordsPage = lazy(() => import('./pages/SongChordsPage.jsx'));
const SongAddEditPage = lazy(() => import('./pages/SongAddEditPage.jsx'));
const SetlistPage = lazy(() => import('./pages/SetlistPage.jsx'));
const SetlistSongsPage = lazy(() => import('./pages/SetlistSongsPage.jsx'));
const BandDetailPage = lazy(() => import('./pages/BandDetailPage.jsx'));
const BandManagementPage = lazy(() => import('./pages/BandManagementPage.jsx'));
const GigPage = lazy(() => import('./pages/GigPage.jsx'));
const YouTubeTrendingPage = lazy(() => import('./pages/YouTubeTrendingPage.jsx'));

const AdminPage = lazy(() => import('./pages/admin/AdminPage.jsx'));
const ChordTranscriberPage = lazy(() => import('./modules/chord-transcriber/ChordTranscriberPage.jsx'));
const BulkLyricsPage = lazy(() => import('./modules/bulk-lyrics/BulkLyricsPage.jsx'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage.jsx'));

// Loading fallback component
import { SongListSkeleton } from './components/LoadingSkeleton.jsx';

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-center">
        <div className="page-loader-icon">⏳</div>
        <p className="page-loader-text">Memuat...</p>
      </div>
    </div>
  );
}

/**
 * Fallback saat Stage Mode diaktifkan: tampilan panggung gelap dengan spinner,
 * supaya tidak ada kilatan UI terang di panggung selama chunk dimuat.
 */
function StageModeLoading() {
  return (
    <div
      className="stage-mode-loading"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff',
        fontSize: '1.1rem',
      }}
    >
      Memuat Stage Mode...
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  // State for userBandInfo (array of user's bands with role)
  const [userBandInfo, setUserBandInfo] = useState([]);
  const [addSongSearch, setAddSongSearch] = useState('');
  // Only call useAuth ONCE and destructure all needed values
  const { user, isAuthenticated, isLoading } = useAuth();
  // Fetch user bands on mount (or when authenticated)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      apiClient.fetchBands()
        .then((bands) => {
          // Map to array of { bandId, role, joinedAt, ... }
          if (Array.isArray(bands)) {
            setUserBandInfo(bands.map((band) => ({
              bandId: band.id,
              role: band.role || band.userRole || (band.isOwner ? 'owner' : 'member'),
              joinedAt: band.joinedAt,
              id: band.id,
              name: band.name,
              ...band
            })));
          } else {
            setUserBandInfo([]);
          }
        })
        .catch(() => setUserBandInfo([]));
    }
  }, [isLoading, isAuthenticated]);
  const [toastMessage, setToastMessage] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  // Stage Mode: tema kontras tinggi untuk layar saat tampil di panggung.
  // Preferensi dipersist di localStorage lintas sesi.
  const [stageMode, setStageModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.STAGE_MODE) === '1';
    } catch {
      return false;
    }
  });
  const setStageMode = (next) => {
    setStageModeState(Boolean(next));
    try {
      localStorage.setItem(STORAGE_KEYS.STAGE_MODE, next ? '1' : '0');
    } catch { /* ignore */ }
  };
  useEffect(() => {
    document.body.classList.toggle('stage-mode', stageMode);
    return () => document.body.classList.remove('stage-mode');
  }, [stageMode]);
  const [createSetlistName, setCreateSetlistName] = useState('');
  const [createSetlistError, setCreateSetlistError] = useState('');
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadingSetlists, setLoadingSetlists] = useState(false);
  const [errorSongs, setErrorSongs] = useState(null);
  const [errorSetlists, setErrorSetlists] = useState(null);
  const [activeSetlist, setActiveSetlist] = useState(null);

  // ALL HOOKS MUST BE HERE - BEFORE ANY CONDITIONAL LOGIC
  useEffect(() => {
    // Aplikasi selalu memakai mode gelap.
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    setLoadingSongs(true);
    apiClient
      .fetchSongs()
      .then((data) => {
        const fetchedSongs = Array.isArray(data) ? data : Array.isArray(data?.songs) ? data.songs : [];
        setSongs(fetchedSongs);
        setLoadingSongs(false);
      })
      .catch((err) => {
        setErrorSongs(err.message || 'Gagal mengambil data');
        setLoadingSongs(false);
      });
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (location.pathname.startsWith('/setlists')) {
      setLoadingSetlists(true);
      const isSetlistListPage = location.pathname === '/setlists';
      apiClient
        .fetchSetLists({ summary: isSetlistListPage })
        .then((data) => {
          setSetlists(Array.isArray(data) ? data : []);
          setLoadingSetlists(false);
        })
        .catch((err) => {
          setErrorSetlists(err.message || 'Gagal mengambil data setlist');
          setLoadingSetlists(false);
        });
    }
  }, [location.pathname, isLoading, isAuthenticated]);

  // Keluar dari mode setlist: saat menu berpindah ke halaman di luar setlist
  // (mis. halaman Lagu, Gigs, dsb.), setlist aktif direset agar Info lagu
  // kembali membaca data lagu master, bukan setlistSongMeta setlist sebelumnya.
  const activeSetlistRef = useRef(null);
  activeSetlistRef.current = activeSetlist;
  useEffect(() => {
    if (!location.pathname.startsWith('/setlists') && activeSetlistRef.current) {
      setActiveSetlist(null);
    }
  }, [location.pathname]);

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  if (isLoading) {
    return (
      <div className="main-loading">Loading...</div>
    );
  }

  // Allow public pages even without auth
  const publicPages = ['/landing', '/login', '/reset-password'];
  const isPublicPage = publicPages.some((page) => location.pathname.startsWith(page));

  // Jika belum login dan mengakses root "/", tampilkan Landing Page publik untuk pengunjung & Googlebot
  if (!isAuthenticated && location.pathname === '/') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <LandingPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated && !isPublicPage) {
    return <Navigate to="/login" replace />;
  }

  // Show public pages without sidebar/header
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  const availableSongsForSetlist = activeSetlist
    ? songs.filter((song) => !(activeSetlist.songs || []).includes(song.id))
    : [];
  const filteredAvailableSongs = availableSongsForSetlist.filter(
    (song) =>
      (song.title || '').toLowerCase().includes(addSongSearch.toLowerCase()) ||
      (song.artist || '').toLowerCase().includes(addSongSearch.toLowerCase()),
  );

  return (
    <ErrorBoundary>
      <>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          stageMode={stageMode}
          onToggleStageMode={setStageMode}
        />
        <MobileBottomNav />
        <Toast message={toastMessage} onClose={() => setToastMessage('')} />

        <div className="app-container">
          {/* Header mobile/tablet. Di smartphone drawer sidebar tidak dipakai,
              jadi hamburger disembunyikan dan header hanya menampilkan branding. */}
          <header className="app-header-mobile">
            <div className="header-brand">
              <img
                className="header-brand-icon"
                src="/icon-192x192.png"
                alt=""
                width="28"
                height="28"
                aria-hidden="true"
              />
              <h1 className="header-title">Ruang Performer</h1>
            </div>
            <StageModeButton stageMode={stageMode} onToggle={() => setStageMode(!stageMode)} />
          </header>
        </div>

        {/* Halaman khusus Stage Mode: fullscreen di atas seluruh UI saat aktif.
            Di-mount hanya setelah diaktifkan supaya chunk-nya tidak diunduh
            bagi pengguna yang tidak memakai Stage Mode. */}
        {stageMode && (
          <Suspense fallback={<StageModeLoading />}>
            <StageModePage
              stageMode={stageMode}
              onExit={() => setStageMode(false)}
              songs={songs}
              bands={userBandInfo}
              setlists={setlists}
              activeSetlist={activeSetlist}
            />
          </Suspense>
        )}

        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/songs"
                element={
                  loadingSongs ? (
                    /* Lazy load: skeleton, bukan teks polos */
                    <div className="page-container">
                      <SongListSkeleton count={8} />
                    </div>
                  ) : errorSongs ? (
                    <div className="error-text">{errorSongs}</div>
                  ) : (
                    <SongListPage
                      songs={songs}
                      loading={loadingSongs}
                      error={errorSongs}
                      onSongClick={(action, id) => {
                        const from = location.pathname;
                        if (action === 'add') navigate('/songs/add', { state: { from } });
                        else if (action === 'edit' && id)
                          navigate(`/songs/edit/${id}`, { state: { from } });
                        else if (action === 'newVersion' && id)
                          navigate(`/songs/new-version/${id}`, { state: { from } });
                        else if (action === 'bulk') navigate('/bulk-lyrics', { state: { from } });
                        else if (action === 'delete' && id) {
                          if (confirm('Yakin ingin menghapus lagu ini?')) {
                            apiClient
                              .deleteSong(id)
                              .then(() => {
                                setSongs(songs.filter((s) => s.id !== id));
                              })
                              .catch((err) => setToastMessage('Gagal menghapus lagu: ' + err.message));
                          }
                        }
                      }}
                    />
                  )
                }
              />
              <Route
                path="/songs/add"
                element={
                  <AddSongRoute
                    onSongUpdated={() => {
                      navigate('/songs');
                      setLoadingSongs(true);
                      apiClient
                        .fetchSongs()
                        .then((data) => {
                          setSongs(Array.isArray(data) ? data : []);
                          setLoadingSongs(false);
                        })
                        .catch((err) => {
                          setErrorSongs(err.message || 'Gagal mengambil data');
                          setLoadingSongs(false);
                        });
                    }}
                  />
                }
              />
              <Route
                path="/songs/new-version/:id"
                element={
                  <NewVersionSongRoute
                    onSongUpdated={() => {
                      navigate('/songs');
                      setLoadingSongs(true);
                      apiClient
                        .fetchSongs()
                        .then((data) => {
                          setSongs(Array.isArray(data) ? data : []);
                          setLoadingSongs(false);
                        })
                        .catch((err) => {
                          setErrorSongs(err.message || 'Gagal mengambil data');
                          setLoadingSongs(false);
                        });
                    }}
                  />
                }
              />
              <Route
                path="/songs/edit/:id"
                element={
                  <EditSongRoute
                    onSongUpdated={(id) => {
                      navigate(`/songs/view/${id}`);
                      setLoadingSongs(true);
                      apiClient
                        .fetchSongs()
                        .then((data) => {
                          setSongs(Array.isArray(data) ? data : []);
                          setLoadingSongs(false);
                        })
                        .catch((err) => {
                          setErrorSongs(err.message || 'Gagal mengambil data');
                          setLoadingSongs(false);
                        });
                    }}
                  />
                }
              />
              <Route
                path="/songs/view/:id"
                element={<SongLyricsRoute songs={songs} activeSetlist={activeSetlist} />}
              />
              <Route
                path="/setlists/:id"
                element={
                  <SetlistSongsPage
                    activeSetlist={activeSetlist}
                    setActiveSetlist={setActiveSetlist}
                    songs={songs}
                    setlists={setlists}
                    setSetlists={setSetlists}
                    setLoadingSetlists={setLoadingSetlists}
                    userBandInfo={userBandInfo}
                  />
                }
              />
              <Route
                path="/setlists/:setlistId/songs/:id"
                element={<SongLyricsRoute songs={songs} activeSetlist={activeSetlist} />}
              />
              <Route
                path="/setlists/:id"
                element={
                  <SetlistSongsPage
                    activeSetlist={activeSetlist}
                    setActiveSetlist={setActiveSetlist}
                    songs={songs}
                    setlists={setlists}
                    setSetlists={setSetlists}
                    setLoadingSetlists={setLoadingSetlists}
                    userBandInfo={userBandInfo}
                  />
                }
              />
              <Route
                path="/setlists/:setlistId/songs/:id"
                element={<SongLyricsRoute songs={songs} activeSetlist={activeSetlist} />}
              />
              <Route
                path="/setlists"
                element={
                  <SetlistPage
                    setlists={setlists}
                    setSetlists={setSetlists}
                    loadingSetlists={loadingSetlists}
                    errorSetlists={errorSetlists}
                    userBandInfo={userBandInfo}
                    songs={songs}
                    showCreateSetlist={showCreateSetlist}
                    setShowCreateSetlist={setShowCreateSetlist}
                    createSetlistName={createSetlistName}
                    setCreateSetlistName={setCreateSetlistName}
                    createSetlistError={createSetlistError}
                    setCreateSetlistError={setCreateSetlistError}
                    onSetlistCreated={() => {
                      setShowCreateSetlist(false);
                      setLoadingSetlists(true);
                      apiClient
                        .fetchSetLists()
                        .then((data) => {
                          setSetlists(Array.isArray(data) ? data : []);
                          setLoadingSetlists(false);
                        })
                        .catch((err) => {
                          setErrorSetlists(err.message || 'Gagal mengambil data');
                          setLoadingSetlists(false);
                        });
                    }}
                    onSetlistClick={(setlist) => {
                      setActiveSetlist(setlist);
                      navigate(`/setlists/${setlist.id}`);
                    }}
                  />
                }
              />
              <Route path="/gigs" element={<GigPage />} />
              <Route path="/youtube-trending" element={<YouTubeTrendingPage />} />
              <Route path="/bands/manage" element={<BandManagementPage />} />
              <Route path="/bands" element={<Navigate to="/bands/manage" replace />} />
              <Route path="/bands/:id" element={<BandDetailPage />} />
              {/* InvitationPage and PendingInvitationsPage removed */}
              <Route path="/tools" element={<Navigate to="/admin" replace />} />
              <Route path="/modules" element={<ModulesPage />} />
              <Route path="/chord-transcriber" element={<ChordTranscriberPage />} />
              <Route path="/bulk-lyrics" element={<BulkLyricsPage />} />
              <Route path="/backup-restore" element={<Navigate to="/admin#backup" replace />} />
              <Route path="/audit-logs" element={<AuditLogPage />} />
              <Route path="/user-management" element={<Navigate to="/admin" replace />} />
              {/* Halaman khusus Administrator: hanya role akun owner/admin. */}
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </>
    </ErrorBoundary>
  );
}

// AdminRoute — penjaga akses halaman /admin sebelum halaman dimuat.
function AdminRoute() {
  const { user } = useAuth();
  if (!isAppAdmin(user)) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Administrator</h1></div>
        <div className="card">Hanya Administrator aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }
  return <AdminPage />;
}

// Komponen route menerima props dari konfigurasi <Route element> di file ini
// sendiri; proyek tidak memakai prop-types (lihat catatan di AdminPage).
/* eslint-disable react/prop-types */

// AddSongRoute component
function AddSongRoute({ onSongUpdated }) {
  return <SongAddEditPage onSongUpdated={onSongUpdated} />;
}

function NewVersionSongRoute({ onSongUpdated }) {
  return <SongAddEditPage onSongUpdated={onSongUpdated} newVersionMode />;
}

// EditSongRoute component
function EditSongRoute({ onSongUpdated }) {
  const { id } = useParams();
  return <SongAddEditPage songId={id} onSongUpdated={onSongUpdated} />;
}

// SongLyricsRoute component
function SongLyricsRoute({ songs, activeSetlist }) {
  const { id } = useParams();
  const song = Array.isArray(songs) ? songs.find((s) => String(s.id) === String(id)) : null;
  return <SongChordsPage song={song} activeSetlist={activeSetlist} songs={songs} />;
}

/* eslint-enable react/prop-types */

export default App;
