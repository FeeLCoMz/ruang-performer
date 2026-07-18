import ToolsPage from "./pages/ToolsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import GigDetailPage from "./pages/GigDetailPage.jsx";
import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";

// Eager load critical pages
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
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
const GigPage = lazy(() => import("./pages/GigPage.jsx"));
const YouTubeTrendingPage = lazy(() => import("./pages/YouTubeTrendingPage.jsx"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage.jsx"));
const SongLyricsPage = lazy(() => import("./pages/SongLyricsPage.jsx"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage.jsx"));

// Loading fallback component
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  // State for userBandInfo (array of user's bands with role)
  const [userBandInfo, setUserBandInfo] = useState([]);
  const [addSongSearch, setAddSongSearch] = useState("");
  // Only call useAuth ONCE and destructure all needed values
  const { user, isAuthenticated, isLoading } = useAuth();
  // Fetch user bands on mount (or when authenticated)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      apiClient.fetchBands()
        .then((bands) => {
          // Map to array of { bandId, role }
          if (Array.isArray(bands)) {
            setUserBandInfo(bands.map(b => ({ bandId: b.id, role: b.userRole || (b.isOwner ? 'owner' : 'member') })));
          } else {
            setUserBandInfo([]);
          }
        })
        .catch(() => setUserBandInfo([]));
    }
  }, [isLoading, isAuthenticated]);
  const [toastMessage, setToastMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [createSetlistName, setCreateSetlistName] = useState("");
  const [createSetlistError, setCreateSetlistError] = useState("");
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
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

  // Performance Mode state
  const [performanceMode, setPerformanceMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ruangperformer_performance_mode") === "true";
    }
    return false;
  });
  const [vocalMode, setVocalMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ruangperformer_vocal_mode") === "true";
    }
    return false;
  });
  const hasPrefetchedPerformanceDataRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("ruangperformer_performance_mode", performanceMode ? "true" : "false");
    if (performanceMode) {
      document.body.classList.add("performance-mode");
    } else {
      document.body.classList.remove("performance-mode");
    }
  }, [performanceMode]);

  useEffect(() => {
    localStorage.setItem("ruangperformer_vocal_mode", vocalMode ? "true" : "false");
    if (vocalMode) {
      document.body.classList.add("vocal-mode");
    } else {
      document.body.classList.remove("vocal-mode");
    }
  }, [vocalMode]);

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
      const isSetlistListPage = location.pathname === "/setlists";
      apiClient
        .fetchSetLists({ summary: isSetlistListPage })
        .then((data) => {
          setSetlists(Array.isArray(data) ? data : []);
          setLoadingSetlists(false);
        })
        .catch((err) => {
          setErrorSetlists(err.message || "Gagal mengambil data setlist");

    useEffect(() => {
      if (isLoading || !isAuthenticated || !performanceMode) {
        return;
      }

      if (hasPrefetchedPerformanceDataRef.current) {
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }

      hasPrefetchedPerformanceDataRef.current = true;
      apiClient.prefetchPerformanceData()
        .then(({ setlists: totalSetlists = 0, songs: totalSongs = 0 } = {}) => {
          setToastMessage(`Mode perform siap offline: ${totalSetlists} setlist, ${totalSongs} lagu disimpan.`);
        })
        .catch(() => {
          hasPrefetchedPerformanceDataRef.current = false;
        });
    }, [isLoading, isAuthenticated, performanceMode]);
          setLoadingSetlists(false);
        });
    }
  }, [location.pathname, isLoading, isAuthenticated]);

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  if (isLoading) {
    return (
      <div className="main-loading">Loading...</div>
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
          vocalMode={vocalMode}
          setVocalMode={setVocalMode}
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
            <div className="header-actions">
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
              <button
                className={`btn btn-secondary ${vocalMode ? " active" : ""}`}
                onClick={() => setVocalMode((v) => !v)}
                title={vocalMode ? "Nonaktifkan Vocal Mode" : "Aktifkan Vocal Mode"}
              >
                {vocalMode ? "🗣️ Vocal" : "🎙️ Vocal"}
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
                      songs={songs}
                      loading={loadingSongs}
                      error={errorSongs}
                      performanceMode={performanceMode}
                      onSongMasteryUpdated={(songId, payload) => {
                        setSongs((prevSongs) => (prevSongs || []).map((song) => {
                          if (String(song.id) !== String(songId)) return song;
                          return {
                            ...song,
                            masteredBy: Array.isArray(payload?.masteredBy) ? payload.masteredBy : [],
                            isMasteredByCurrentUser: Boolean(payload?.isMasteredByCurrentUser),
                          };
                        }));
                      }}
                      onSongClick={(action, id) => {
                        const from = location.pathname;
                        if (action === "add") navigate("/songs/add", { state: { from } });
                        else if (action === "edit" && id)
                          navigate(`/songs/edit/${id}`, { state: { from } });
                        else if (action === "newVersion" && id)
                          navigate(`/songs/new-version/${id}`, { state: { from } });
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
                path="/songs/new-version/:id"
                element={
                  <NewVersionSongRoute
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
                element={<SongLyricsRoute songs={songs} activeSetlist={activeSetlist} performanceMode={performanceMode} vocalMode={vocalMode} />}
              />
              <Route
                path="/karaoke/:id"
                element={<SongLyricsPage />}
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
                    performanceMode={performanceMode}
                  />
                }
              />
              <Route
                path="/setlists/:setlistId/songs/:id"
                element={<SongLyricsRoute songs={songs} activeSetlist={activeSetlist} performanceMode={performanceMode} vocalMode={vocalMode} />}
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
              <Route path="/gigs" element={<GigPage />} />
              <Route path="/gigs/:id" element={<GigDetailPage />} />
              <Route path="/youtube-trending" element={<YouTubeTrendingPage performanceMode={performanceMode} />} />
              <Route path="/bands/manage" element={<BandManagementPage />} />
              <Route path="/bands" element={<Navigate to="/bands/manage" replace />} />
              <Route path="/bands/:id" element={<BandDetailPage />} />
              {/* Performance Mode routes */}
              {/* Performance Mode routes removed */}
              {/* InvitationPage and PendingInvitationsPage removed */}
              <Route path="/audit-logs" element={<AuditLogPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/user-management" element={<UserManagementPage />} />
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

function NewVersionSongRoute({ onSongUpdated }) {
  return <SongAddEditPage onSongUpdated={onSongUpdated} newVersionMode />;
}

// EditSongRoute component
function EditSongRoute({ onSongUpdated }) {
  const { id } = useParams();
  return <SongAddEditPage songId={id} onSongUpdated={onSongUpdated} />;
}

// SongLyricsRoute component
function SongLyricsRoute({ songs, activeSetlist, performanceMode, vocalMode }) {
  const { id } = useParams();
  const song = Array.isArray(songs) ? songs.find((s) => String(s.id) === String(id)) : null;
  return <SongChordsPage song={song} activeSetlist={activeSetlist} performanceMode={performanceMode} vocalMode={vocalMode} />;
}

export default App;
