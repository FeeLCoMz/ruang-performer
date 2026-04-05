import React, { useState, useEffect, useRef } from "react";
import SongChordsAnalyzer from '../components/SongChordsAnalyzer.jsx';
import SongLyricsMainSection from '../components/SongLyricsMainSection.jsx';
import { useNavigate, useLocation, useParams } from "react-router-dom";
import SetlistSongNavigator from "../components/SetlistSongNavigator.jsx";
import SongChordsHeader from '../components/SongChordsHeader.jsx';
import SongChordsMediaPanel from '../components/SongChordsMediaPanel.jsx';
import SongChordsInfo from '../components/SongChordsInfo.jsx';
import { getAuthHeader } from "../utils/auth.js";
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import { useSongFetch } from '../hooks/useSongFetch.js';
import { handleExportText, handleExportPDF, handleShare } from '../utils/songHandlers.js';
import useMetronome from '../hooks/useMetronome.js';
import useChordStats from '../hooks/useChordStats.js';

/**
 * SongChordsPage
 * Halaman utama untuk menampilkan lirik, chord, dan kontrol lagu.
 * Mendukung konteks setlist, navigasi antar lagu, transpose, autoscroll, dan fitur media.
 *
 * Props:
 *   - song: (optional) data lagu yang diterima dari parent
 */
export default function SongChordsPage({ song: songProp, performanceMode = false }) {
  // State untuk toggle tampilan partitur
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  // =========================
  // 1. Routing & Context
  // =========================
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();

  // =========================
  // 2. Permission Handling
  // =========================
  // Dapatkan bandId dan info role user
  const bandId = songProp?.bandId || songProp?.band_id || undefined;
  const userBandInfo = user && bandId
    ? { role: user?.bandRoles?.[bandId] || user?.role || 'member', bandId }
    : user ? { role: user?.role || 'member' } : null;
  const { can } = usePermission(bandId, userBandInfo);

  // =========================
  // 3. State: Data Lagu (via custom hook)
  // =========================
  const { song: fetchedSong, loading, error, setSong: setFetchedSong } = useSongFetch(id);

  // =========================
  // 4. State: Setlist Context
  // =========================
  // Metadata lagu dalam setlist (jika ada)
  const setlistSongData = location.state?.setlistSong || {};
  const setlistData = location.state?.setlist || {};
  const setlistId = location.state?.setlistId;

   // =========================
  // 6. Data Lagu & Metadata
  // =========================
  // Gunakan fetchedSong jika sudah ada, fallback ke object kosong
  // Deteksi metadata "Original Key: X" di lirik (hanya sebagai informasi, tidak mempengaruhi transpose)
  let song = fetchedSong || {};
  let lyricsMetaKey = ''; // Kunci asli dari metadata lirik — hanya informasi
  let lyricsClean = song.lyrics || '';
  if (lyricsClean) {
    const metaMatch = lyricsClean.match(/^Original Key:\s*([A-G][#b]?m?(?:aj|min|dim|aug)?\b)/im);
    if (metaMatch) {
      lyricsMetaKey = metaMatch[1];
      // Hapus baris metadata dari lirik
      lyricsClean = lyricsClean.replace(/^Original Key:.*$/im, '').replace(/^\s*\n/, '');
    }
  }
  const artist = setlistSongData.artist || song?.artist || "";
  const key = setlistSongData.key || song?.key || "";
  const tempo = setlistSongData.tempo || song?.tempo || "";
  const genre = setlistSongData.genre || song?.genre || "";
  const arrangementStyle = setlistSongData.arrangementStyle || song?.arrangementStyle || song?.arrangement_style || "";
  const keyboardPatch = setlistSongData.keyboardPatch || song?.keyboardPatch || song?.keyboard_patch || "";
  const timeSignature = setlistSongData.time_signature || song?.time_signature || "4/4";
  const youtubeId = song?.youtubeId || song?.youtube_url || "";
  const timeMarkers = song?.time_markers || [];
     
  // Transpose state
  const [transpose, setTranspose] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showChordNumbers, setShowChordNumbers] = useState(false);
  
  // In-place editing state
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [editedLyrics, setEditedLyrics] = useState("");
  const [savingLyrics, setSavingLyrics] = useState(false);
  const [editError, setEditError] = useState(null);

  // Chord Analyzer state
  const [showChordAnalyzer, setShowChordAnalyzer] = useState(false);
  const chordStats = useChordStats(song?.lyrics);

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // State untuk menampilkan/menyembunyikan info lagu
  const [showSongInfo, setShowSongInfo] = useState(true);

  // Share state
  const [shareMessage, setShareMessage] = useState("");


  // Media panel collapse state (default: collapsed)
  const [mediaPanelExpanded, setMediaPanelExpanded] = useState(false);

  // State untuk menampilkan/menyembunyikan time marker panel (default: hidden)
  const [showTimeMarkers, setShowTimeMarkers] = useState(false);

  // Metronome state for quick access
  const [isMetronomeActive, setIsMetronomeActive] = useMetronome(false, tempo);
  const audioContextRef = useRef(null); // (optional: can be removed if not used elsewhere)
  const youtubeRef = useRef(null);

  // AudioContext logic now handled by useMetronome

  // Auto Scroll state
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(parseInt(tempo) || 120);
  const [currentBeat, setCurrentBeat] = useState(0);
  const lyricsDisplayRef = useRef(null);

  // Update scroll speed when tempo changes
  useEffect(() => {
    if (tempo) {
      setScrollSpeed(parseInt(tempo) || 120);
    }
  }, [tempo]);
  // (Efek autoscroll dipindah ke komponen AutoScrollBar)

  // Metronome effect now handled by useMetronome hook

  // ...existing code...

    // Analyze chords when lyrics change
  // ChordStats logic now handled by useChordStats hook

  // Handler export & share di utils/songHandlers.js

  // Handle time marker updates
  const handleTimeMarkerUpdate = async (updatedMarkers) => {
    if (!song.id || !can(PERMISSIONS.SONG_EDIT)) return;

    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          ...song,
          time_markers: JSON.stringify(updatedMarkers),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan time marker");
      }

      // Fetch fresh data
      const fetchRes = await fetch(`/api/songs/${song.id}`, {
        headers: getAuthHeader(),
      });

      if (!fetchRes.ok) {
        throw new Error("Gagal memuat data terbaru");
      }

      const updatedSong = await fetchRes.json();
      setFetchedSong(updatedSong);
    } catch (err) {
      console.error("Error updating time markers:", err);
    }
  };

  // Handle lyrics save
  // Handler export & share di utils/songHandlers.js

  // Keyboard shortcut for saving lyrics (Ctrl+S / Cmd+S)
  // MUST be before any conditional returns
  useEffect(() => {
    if (!isEditingLyrics) {
      // Don't set up listeners if not editing
      return;
    }

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveLyrics();
      }
      if (e.key === "Escape") {
        handleCancelEditLyrics();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingLyrics, editedLyrics, song?.id]);

  const handleBack = () => {
    if (setlistId) {
      navigate(`/setlists/${setlistId}`);
    } else {
      navigate("/songs");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <div className="not-found-icon">⏳</div>
          <h2 className="not-found-title">Memuat Lagu...</h2>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <div className="not-found-icon">⚠️</div>
          <h2 className="not-found-title">Error</h2>
          <p className="not-found-message">{error}</p>
          <button
            onClick={handleBack}
            className="btn"
            aria-label="Kembali ke halaman sebelumnya"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <div className="not-found-icon">🎵</div>
          <h2 className="not-found-title">Lagu Tidak Ditemukan</h2>
          <p className="not-found-message">Lagu yang Anda cari tidak tersedia</p>
          <button
            onClick={handleBack}
            className="btn"
            aria-label="Kembali ke halaman sebelumnya"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/songs/edit/${song.id}`);
  };

  const handleEditLyrics = () => {
    setEditedLyrics(song.lyrics || "");
    setIsEditingLyrics(true);
    setEditError(null);
  };

  const handleCancelEditLyrics = () => {
    setIsEditingLyrics(false);
    setEditedLyrics("");
    setEditError(null);
  };

  const handleSaveLyrics = async () => {
    if (!song.id) return;

    setSavingLyrics(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          ...song,
          lyrics: editedLyrics,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan lirik");
      }

      // API returns only { id }, so fetch fresh data
      const fetchRes = await fetch(`/api/songs/${song.id}`, {
        headers: getAuthHeader(),
      });

      if (!fetchRes.ok) {
        throw new Error("Gagal memuat data terbaru");
      }

      const updatedSong = await fetchRes.json();
      setFetchedSong(updatedSong);
      setIsEditingLyrics(false);
      setEditedLyrics("");

      // Jika ada setlist context, navigate ulang dengan state setlist agar navigator tetap muncul
      if (setlistId && setlistData && setlistData.songs) {
        navigate(`/songs/view/${song.id}`, {
          state: {
            setlistId,
            setlist: setlistData,
            setlistSong: setlistSongData,
          },
          replace: true,
        });
      }
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingLyrics(false);
    }
  };

  return (
    <div className={`page-container${performanceMode ? ' performance-mode' : ''}`}> {/* Tambah class jika performanceMode */}
      <SongChordsHeader
        song={song}
        performanceMode={performanceMode}
        canEdit={can(PERMISSIONS.SONG_EDIT)}
        onEdit={handleEdit}
        onShare={() => handleShare(song, artist, setShareMessage)}
        shareMessage={shareMessage}
        onBack={handleBack}
      />

      <SongChordsInfo
        originalKey={song?.key || key || ''}
        targetKey={key || song?.key || ''}
        lyricsOriginalKey={lyricsMetaKey}
        transpose={transpose}
        setTranspose={setTranspose}
        timeSignature={timeSignature}
        tempo={tempo}
        scrollSpeed={scrollSpeed}
        setScrollSpeed={setScrollSpeed}
        isMetronomeActive={isMetronomeActive}
        setIsMetronomeActive={setIsMetronomeActive}
        genre={genre}
        arrangementStyle={arrangementStyle}
        keyboardPatch={keyboardPatch}
        showSongInfo={showSongInfo}
        setShowSongInfo={setShowSongInfo}
        title={song.title}
        artist={artist}
        contributor={song.contributor}
        performanceMode={performanceMode}
      />

      <SongChordsMediaPanel
        mediaPanelExpanded={mediaPanelExpanded}
        setMediaPanelExpanded={setMediaPanelExpanded}
        youtubeId={youtubeId}
        youtubeRef={youtubeRef}
        timeMarkers={timeMarkers}
        showTimeMarkers={showTimeMarkers}
        setShowTimeMarkers={setShowTimeMarkers}
        performanceMode={performanceMode}
        canEdit={can(PERMISSIONS.SONG_EDIT)}
        handleTimeMarkerUpdate={handleTimeMarkerUpdate}
      />

      <SongChordsAnalyzer
        showChordAnalyzer={showChordAnalyzer}
        setShowChordAnalyzer={setShowChordAnalyzer}
        chordStats={chordStats}
        transpose={transpose}
      />

      {/* Lyrics Main Section */}
      <SongLyricsMainSection
        isEditingLyrics={isEditingLyrics}
        lyricsDisplayRef={lyricsDisplayRef}
        editedLyrics={editedLyrics}
        setEditedLyrics={setEditedLyrics}
        editError={editError}
        handleEditLyrics={handleEditLyrics}
        savingLyrics={savingLyrics}
        handleSaveLyrics={handleSaveLyrics}
        handleCancelEditLyrics={handleCancelEditLyrics}
        showExportMenu={showExportMenu}
        setShowExportMenu={setShowExportMenu}
        handleExportText={() => handleExportText(song, artist, key, lyricsMetaKey, tempo, lyricsClean, setShowExportMenu)}
        handleExportPDF={() => handleExportPDF(song, artist, key, lyricsMetaKey, tempo, lyricsClean, setShowExportMenu)}
        tempo={tempo}
        autoScrollActive={autoScrollActive}
        scrollSpeed={scrollSpeed}
        setAutoScrollActive={setAutoScrollActive}
        setScrollSpeed={setScrollSpeed}
        currentBeat={currentBeat}
        setCurrentBeat={setCurrentBeat}
        zoom={zoom}
        setZoom={setZoom}
        performanceMode={performanceMode}
        canEdit={can(PERMISSIONS.SONG_EDIT)}
        song={song}
        transpose={transpose}
        showSheetMusic={showSheetMusic}
        setShowSheetMusic={setShowSheetMusic}
        youtubeRef={youtubeRef}
        loading={loading}
        showChordNumbers={showChordNumbers}
        setShowChordNumbers={setShowChordNumbers}
        keySignature={key || song?.key || ''}
      />

      {/* Setlist Navigation (if in setlist context) */}
      {setlistId &&
        setlistData.songs &&
        Array.isArray(setlistData.songs) &&
        (() => {
          const songsArr = setlistData.songs;
          const idx = songsArr.findIndex((s) => (s.id || s._id) === song.id);
          const totalSongs = songsArr.length;
          const songNumber = idx >= 0 ? idx + 1 : null;
          const navPrev = idx > 0 ? songsArr[idx - 1] : null;
          const navNext = idx < totalSongs - 1 && idx >= 0 ? songsArr[idx + 1] : null;
          const handlePrev = () => {
            if (navPrev) {
              navigate(`/setlists/${setlistId}/songs/${navPrev.id || navPrev._id}`, {
                state: { setlistId, setlist: setlistData, setlistSong: navPrev },
              });
            }
          };
          const handleNext = () => {
            if (navNext) {
              navigate(`/setlists/${setlistId}/songs/${navNext.id || navNext._id}`, {
                state: { setlistId, setlist: setlistData, setlistSong: navNext },
              });
            }
          };
          return (
            <SetlistSongNavigator
              navPrev={!!navPrev}
              navNext={!!navNext}
              songNumber={songNumber}
              totalSongs={totalSongs}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          );
        })()}
    </div>
  );
}
