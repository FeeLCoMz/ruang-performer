import ToolsPage from "./pages/ToolsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import PracticeSessionDetailPage from "./pages/PracticeSessionDetailPage.jsx";
import GigDetailPage from "./pages/GigDetailPage.jsx";
import KaraokeSongSearch from "./components/KaraokeSongSearch.jsx";
import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
// import PerformanceModePage from './pages/PerformanceModePage.jsx';
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";

// Eager load critical pages
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import TwoFactorSetupPage from "./pages/TwoFactorSetupPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import NotFound from "./components/NotFound.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Toast from "./components/Toast.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import * as apiClient from "./apiClient.js";

// Lazy load non-critical pages for code splitting
const SongListPage = lazy(() => import("./pages/SongListPage.jsx"));
const SongChordsPage = lazy(() => import("./pages/SongChordsPage.jsx"));
const SongAddEditPage = lazy(() => import("./pages/SongAddEditPage.jsx"));
const SetlistPage = lazy(() => import("./pages/SetlistPage.jsx"));
const SetlistSongsPage = lazy(() => import("./pages/SetlistSongsPage.jsx"));
const BandDetailPage = lazy(() => import("./pages/BandDetailPage.jsx"));
const BandManagementPage = lazy(() => import("./pages/BandManagementPage.jsx"));
const PracticeSessionPage = lazy(() => import("./pages/PracticeSessionPage.jsx"));
const GigPage = lazy(() => import("./pages/GigPage.jsx"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage.jsx"));
const SongLyricsPage = lazy(() => import("./pages/SongLyricsPage.jsx"));

// Loading fallback component
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--primary-bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3em", marginBottom: "16px" }}>⏳</div>
        <p style={{ color: "var(--text-muted)", fontSize: "1em" }}>Memuat...</p>
      </div>
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
  // Notifikasi toast global
  const { isAuthenticated, isLoading } = useAuth();
  const [toastMessage, setToastMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [createSetlistName, setCreateSetlistName] = useState("");
  const [createSetlistError, setCreateSetlistError] = useState("");
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadingSetlists, setLoadingSetlists] = useState(false);
  const [errorSongs, setErrorSongs] = useState(null);
  const [errorSetlists, setErrorSetlists] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ruangperformer_theme") || "dark";
    }
    return "dark";
  });

  const [activeSetlist, setActiveSetlist] = useState(null);
  const [addSongSearch, setAddSongSearch] = useState("");

  // Performance Mode state
  const [performanceMode, setPerformanceMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ruangperformer_performance_mode") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("ruangperformer_performance_mode", performanceMode ? "true" : "false");
    if (performanceMode) {
      document.body.classList.add("performance-mode");
    } else {
      document.body.classList.remove("performance-mode");
    }
  }, [performanceMode]);

  // ALL HOOKS MUST BE HERE - BEFORE ANY CONDITIONAL LOGIC
  useEffect(() => {
    document.body.classList.remove("dark-mode", "light-mode");
    document.body.classList.add(theme === "dark" ? "dark-mode" : "light-mode");
    localStorage.setItem("ruangperformer_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    setLoadingSongs(true);
    apiClient
      .fetchSongs()
      .then((data) => {
        setSongs(Array.isArray(data) ? data : []);
        setLoadingSongs(false);
      })
      .catch((err) => {
        setErrorSongs(err.message || "Gagal mengambil data");
        setLoadingSongs(false);
      });
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (location.pathname.startsWith("/setlists")) {
      setLoadingSetlists(true);
      apiClient
        .fetchSetLists()
        .then((data) => {
          setSetlists(Array.isArray(data) ? data : []);
          setLoadingSetlists(false);
        })
        .catch((err) => {
          setErrorSetlists(err.message || "Gagal mengambil data setlist");
          setLoadingSetlists(false);
        });
    }
  }, [location.pathname, isLoading, isAuthenticated]);

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        Loading...
      </div>
    );
  }

  // Allow public pages even without auth
  const publicPages = ["/login", "/reset-password"];
  const isPublicPage = publicPages.some((page) => location.pathname.startsWith(page));

  if (!isAuthenticated && !isPublicPage) {
    return <LoginPage />;
  }

  // Show public pages without sidebar/header
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
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
      (song.title || "").toLowerCase().includes(addSongSearch.toLowerCase()) ||
      (song.artist || "").toLowerCase().includes(addSongSearch.toLowerCase()),
  );

  const filteredSongs = songs.filter(
    (song) =>
      (song.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (song.artist || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ErrorBoundary>
      <>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          setTheme={setTheme}
          performanceMode={performanceMode}
          setPerformanceMode={setPerformanceMode}
        />
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        <div className="app-container">
          {/* Mobile Header dengan Hamburger */}
          <header className="app-header-mobile">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle sidebar"
            >
              ☰
            </button>
            <h1 className="header-title">Ruang Performer</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                className={`btn btn-secondary ${theme === "dark" ? "dark" : "light"}`}
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                title="Ganti mode gelap/terang"
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </button>
              <button
                className={`btn btn-secondary ${performanceMode ? " active" : ""}`}
                onClick={() => setPerformanceMode((v) => !v)}
                title={
                  performanceMode ? "Nonaktifkan Performance Mode" : "Aktifkan Performance Mode"
                }
              >
                {performanceMode ? "🎤 Performance" : "🎶 Normal"}
              </button>
            </div>
          </header>
        </div>

        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/songs"
                element={
                  loadingSongs ? (
                    <div>Memuat data lagu...</div>
                  ) : errorSongs ? (
                    <div className="error-text">{errorSongs}</div>
                  ) : (
                    <SongListPage
                      songs={filteredSongs}
                      loading={loadingSongs}
                      error={errorSongs}
                      search={search}
                      setSearch={setSearch}
                      onSongClick={(action, id) => {
                        const from = location.pathname;
                        if (action === "add") navigate("/songs/add", { state: { from } });
                        else if (action === "edit" && id)
                          navigate(`/songs/edit/${id}`, { state: { from } });
                        else if (action === "delete" && id) {
                          if (confirm("Yakin ingin menghapus lagu ini?")) {
                            apiClient
                              .deleteSong(id)
                              .then(() => {
                                setSongs(songs.filter((s) => s.id !== id));
                              })
                              .catch((err) => alert("Gagal menghapus lagu: " + err.message));
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
                      navigate("/songs");
                      setLoadingSongs(true);
                      apiClient
                        .fetchSongs()
                        .then((data) => {
                          setSongs(Array.isArray(data) ? data : []);
                          setLoadingSongs(false);
                        })
                        .catch((err) => {
                          setErrorSongs(err.message || "Gagal mengambil data");
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
                          setErrorSongs(err.message || "Gagal mengambil data");
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
                path="/karaoke/:id"
                element={
                  <>
                    <div
                      style={{ display: "flex", justifyContent: "center", margin: "24px 0 0 0" }}
                    >
                      <KaraokeSongSearch songs={songs} />
                    </div>
                    <SongLyricsPage />
                  </>
                }
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
                          setErrorSetlists(err.message || "Gagal mengambil data");
                          setLoadingSetlists(false);
                        });
                    }}
                    onSetlistClick={(setlist) => {
                      setActiveSetlist(setlist);
                      navigate(`/setlists/${setlist.id}`);
                    }}
                    isPerformanceMode={performanceMode}
                  />
                }
              />
              <Route path="/practice" element={<PracticeSessionPage />} />
              <Route path="/practice/:id" element={<PracticeSessionDetailPage />} />
              <Route path="/gigs" element={<GigPage />} />
              <Route path="/gigs/:id" element={<GigDetailPage />} />
              <Route path="/bands/manage" element={<BandManagementPage />} />
              <Route path="/bands" element={<Navigate to="/bands/manage" replace />} />
              <Route path="/bands/:id" element={<BandDetailPage />} />
              {/* Performance Mode routes */}
              {/* Performance Mode routes removed */}
              {/* InvitationPage and PendingInvitationsPage removed */}
              <Route path="/settings/2fa" element={<TwoFactorSetupPage />} />
              <Route path="/audit-logs" element={<AuditLogPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </>
    </ErrorBoundary>
  );
}

// AddSongRoute component
function AddSongRoute({ onSongUpdated }) {
  return <SongAddEditPage onSongUpdated={onSongUpdated} />;
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
  return <SongChordsPage song={song} activeSetlist={activeSetlist} />;
}

export default App;
