import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import ChordDisplay from "../components/ChordDisplay";
import YouTubeViewer from "../components/YouTubeViewer";
import TimeMarkers from "../components/TimeMarkers";
import SetlistSongNavigator from "../components/SetlistSongNavigator";
import TransposeKeyControl from "../components/TransposeKeyControl";
import { getAuthHeader } from "../utils/auth.js";
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
// (getTempoTerm dipindahkan ke utils/musicNotationUtils.js)
import { getTempoTerm } from "../utils/musicNotationUtils.js";

/**
 * SongLyricsPage
 * Halaman utama untuk menampilkan lirik, chord, dan kontrol lagu.
 * Mendukung konteks setlist, navigasi antar lagu, transpose, autoscroll, dan fitur media.
 *
 * Props:
 *   - song: (optional) data lagu yang diterima dari parent
 */
export default function SongLyricsPage({ song: songProp }) {
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
  // 3. State: Data Lagu
  // =========================
  const [fetchedSong, setFetchedSong] = useState(null); // Data lagu hasil fetch
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
  const song = fetchedSong || {};
  const artist = setlistSongData.artist || song?.artist || "";
  const key = setlistSongData.key || song?.key || "";
  const tempo = setlistSongData.tempo || song?.tempo || "";
  const genre = setlistSongData.genre || song?.genre || "";
  const capo = setlistSongData.capo || song?.capo || "";
  const timeSignature = setlistSongData.time_signature || song?.time_signature || "4/4";
  const youtubeId = song?.youtubeId || song?.youtube_url || "";
  const timeMarkers = song?.time_markers || [];
     
  // Transpose state
  const [transpose, setTranspose] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  // In-place editing state
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [editedLyrics, setEditedLyrics] = useState("");
  const [savingLyrics, setSavingLyrics] = useState(false);
  const [editError, setEditError] = useState(null);

  // Chord Analyzer state
  const [showChordAnalyzer, setShowChordAnalyzer] = useState(false);
  const [chordStats, setChordStats] = useState({ chords: [], count: 0 });

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // State untuk menampilkan/menyembunyikan info lagu
  const [showSongInfo, setShowSongInfo] = useState(true);

  // Share state
  const [shareMessage, setShareMessage] = useState("");

  // Media panel collapse state
  const [mediaPanelExpanded, setMediaPanelExpanded] = useState(true);

  // State untuk menampilkan/menyembunyikan time marker panel
  const [showTimeMarkers, setShowTimeMarkers] = useState(true);

  // Metronome state for quick access
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const audioContextRef = useRef(null);
  const youtubeRef = useRef(null);

  // Initialize AudioContext lazily (only when needed)
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        console.error("Failed to create AudioContext:", err);
        return null;
      }
    }
    return audioContextRef.current;
  };

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

  // Auto Scroll effect
  useEffect(() => {
    if (!autoScrollActive) {
      setCurrentBeat(0);
      return;
    }

    const beatInterval = (60 / scrollSpeed) * 1000; // Convert BPM to milliseconds
    const fourBeatInterval = beatInterval * 4; // Every 4 beats
    const lineHeight = 24; // pixels per line (approximately)
    let beatCounter = 0;

    const scrollInterval = setInterval(() => {
      beatCounter++;
      setCurrentBeat((beatCounter - 1) % 4);

      // Scroll every 4 beats
      if (beatCounter % 4 === 0) {
        if (lyricsDisplayRef.current) {
          lyricsDisplayRef.current.scrollBy({
            top: lineHeight,
            behavior: "smooth",
          });
        }
      }
    }, beatInterval);

    return () => clearInterval(scrollInterval);
  }, [autoScrollActive, scrollSpeed]);

  // Metronome effect - Web Audio API
  useEffect(() => {
    if (!isMetronomeActive || !tempo) return;

    const audioContext = getAudioContext();
    if (!audioContext) {
      setIsMetronomeActive(false);
      return;
    }

    // Resume AudioContext if suspended (required by browsers)
    if (audioContext.state === "suspended") {
      audioContext.resume().catch((err) => console.error("Failed to resume AudioContext:", err));
    }

    const currentTempo = parseInt(tempo) || 120;
    const beatDuration = 60 / currentTempo;
    const noteLength = 0.1;
    let nextNoteTime = audioContext.currentTime;
    let beatCount = 0;

    const playBeat = () => {
      const osc = audioContext.createOscillator();
      const env = audioContext.createGain();
      osc.frequency.value = beatCount % 4 === 0 ? 800 : 400;
      osc.connect(env);
      env.connect(audioContext.destination);
      env.gain.setValueAtTime(0.3, audioContext.currentTime);
      env.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + noteLength);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + noteLength);
      beatCount++;
    };

    const scheduler = setInterval(() => {
      if (nextNoteTime <= audioContext.currentTime + 0.1) {
        playBeat();
        nextNoteTime += beatDuration;
      }
    }, 10);

    return () => clearInterval(scheduler);
  }, [isMetronomeActive, tempo]);

  // Always fetch song data from API when ID changes
  useEffect(() => {
    if (!id) return;
    setFetchedSong(null);
    setLoading(true);
    setError(null);
    fetch(`/api/songs/${id}`, {
      headers: getAuthHeader(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat lagu");
        return res.json();
      })
      .then((data) => {
        setFetchedSong(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

    // Analyze chords when lyrics change
  useEffect(() => {
    if (!song?.lyrics) {
      setChordStats({ chords: [], count: 0 });
      return;
    }

    // Regex untuk mendeteksi chord dengan atau tanpa braket
    // 1. [C], [Am7], dst (bracketed)
    // 2. C, Am7, F#m, Bbmaj7, dst (tanpa braket, di baris chord)
    // Deteksi baris chord: minimal 2-3 token yang cocok pola chord
    const bracketed = /\[([A-G][b#]?(?:m|maj|min|dim|aug)?(?:7|9|11|13)?(?:sus\d)?(?:\/[A-G][b#]?)?)\]/g;
    const plain = /\b([A-G][b#]?(?:m|maj|min|dim|aug)?(?:7|9|11|13)?(?:sus\d)?(?:\/[A-G][b#]?)?)\b/g;

    // Ambil semua chord dalam braket
    const matchesBracketed = Array.from(song.lyrics.matchAll(bracketed)).map(m => m[1]);

    // Ambil juga baris yang kemungkinan baris chord (bukan lirik)
    const lines = song.lyrics.split(/\r?\n/);
    let matchesPlain = [];
    for (const line of lines) {
      // Skip jika baris sudah mengandung braket
      if (bracketed.test(line)) continue;
      // Ambil semua token yang cocok pola chord
      const tokens = Array.from(line.matchAll(plain)).map(m => m[1]);
      // Jika baris punya >=2 token chord, anggap baris chord
      if (tokens.length >= 2) {
        matchesPlain.push(...tokens);
      }
    }
    const chordArray = [...matchesBracketed, ...matchesPlain];
    const uniqueChords = [...new Set(chordArray)].sort();

    setChordStats({
      chords: uniqueChords,
      count: chordArray.length,
    });
  }, [song?.lyrics]);

  // Handle export to text
  const handleExportText = () => {
    if (!song) return;

    const content = `${song.title}\nArtist: ${artist}\nKey: ${key}\nTempo: ${tempo} BPM\nCapo: ${capo || "None"}\n\n${song.lyrics || ""}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Handle export to PDF (simple version)
  const handleExportPDF = () => {
    if (!song) return;

    const content = `
<html>
<head>
  <title>${song.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .meta { color: #666; margin: 20px 0; }
    .lyrics { white-space: pre-wrap; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${song.title}</h1>
  <div class="meta">
    <p><strong>Artist:</strong> ${artist}</p>
    <p><strong>Key:</strong> ${key}</p>
    <p><strong>Tempo:</strong> ${tempo} BPM</p>
    <p><strong>Capo:</strong> ${capo || "None"}</p>
  </div>
  <div class="lyrics">${song.lyrics || ""}</div>
</body>
</html>
    `;

    const printWindow = window.open("", "", "height=400,width=600");
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
    setShowExportMenu(false);
  };

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
  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: song.title,
        text: `Check out this song: ${song.title} by ${artist}`,
        url: shareUrl,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      setShareMessage("Link copied to clipboard!");
      setTimeout(() => setShareMessage(""), 2000);
    }
  };

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
            className="btn-submit"
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
            className="btn-submit"
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
    <div className="page-container">
      {/* Enhanced Header Section */}
      <div className="song-lyrics-header">
        <button
          onClick={handleBack}
          className="song-lyrics-back-btn"
          aria-label="Kembali"
          title="Kembali"
        >
          ←
        </button>
        <div className="song-lyrics-info">
          <h1 className="song-lyrics-title">{song.title}</h1>
          {artist && <p className="song-lyrics-artist">{artist}</p>}
          {song.contributor && (
            <p className="song-lyrics-owner">
              Kontributor: <span className="song-lyrics-owner-name">{song.contributor}</span>
            </p>
          )}
        </div>
        <div className="song-lyrics-header-actions">
          {can(PERMISSIONS.SONG_EDIT) && (
            <button onClick={handleEdit} className="song-lyrics-edit-btn" title="Edit lagu">
              ✏️ Edit
            </button>
          )}
          <button onClick={handleShare} className="song-lyrics-share-btn" title="Bagikan lagu">
            🔗 Bagikan
          </button>
        </div>
      </div>

      {shareMessage && (
        <div className="info-text" style={{ marginBottom: "16px" }}>
          {shareMessage}
        </div>
      )}

      {/* 1. Media Panel - YouTube & Time Markers (First Priority) */}
      <div className="media-panel">
        <div className="media-panel-header">
          <div className="media-panel-header-content">
            <div>
              <h3 className="media-panel-title">
                <span className="media-panel-icon">📺</span>
                Video Referensi
              </h3>
              <p className="media-panel-subtitle">Dengarkan referensi lagu sebelum berlatih</p>
            </div>
            <button
              className="media-panel-toggle"
              onClick={() => setMediaPanelExpanded(!mediaPanelExpanded)}
              aria-label={mediaPanelExpanded ? "Sembunyikan panel" : "Tampilkan panel"}
            >
              {mediaPanelExpanded ? '▲' : '▶'}
            </button>
          </div>
        </div>

        {mediaPanelExpanded && (
          <div className="media-panel-content media-panel-grid">
            {/* YouTube Video Section - Left */}
            <div className="media-section media-video-section">
              <div className="media-section-header">
                <span className="media-section-icon">🎥</span>
                <span className="media-section-label">YouTube Video</span>
              </div>
              <div className="media-section-body">
                {youtubeId ? (
                  <YouTubeViewer ref={youtubeRef} videoId={youtubeId} />
                ) : (
                  <div className="media-empty-state">
                    <span className="media-empty-icon">📹</span>
                    <p className="media-empty-text">Tidak ada video YouTube</p>
                    <p className="media-empty-hint">Tambahkan YouTube URL di edit song</p>
                  </div>
                )}
              </div>
            </div>

            {/* Time Markers Section - Right */}
            <div className="media-section media-markers-section">
              <div className="media-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span className="media-section-icon">⏱️</span>
                  <span className="media-section-label">Time Markers</span>
                  {timeMarkers.length > 0 && (
                    <span className="media-section-badge">{timeMarkers.length}</span>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.9em' }}
                  onClick={() => setShowTimeMarkers(!showTimeMarkers)}
                  aria-label={showTimeMarkers ? 'Sembunyikan time marker' : 'Tampilkan time marker'}
                  title={showTimeMarkers ? 'Sembunyikan time marker' : 'Tampilkan time marker'}
                >
                  {showTimeMarkers ? '▼' : '▶' }
                </button>
              </div>
              {showTimeMarkers && (
                <div className="media-section-body">
                  <TimeMarkers
                    timeMarkers={timeMarkers}
                    readonly={!can(PERMISSIONS.SONG_EDIT)}
                    onUpdate={handleTimeMarkerUpdate}
                    onSeek={(time) => {
                      if (youtubeRef.current && youtubeRef.current.handleSeek) {
                        youtubeRef.current.handleSeek(time);
                      }
                    }}
                    getCurrentYouTubeTime={() => {
                      if (youtubeRef.current && typeof youtubeRef.current.currentTime === "number") {
                        return youtubeRef.current.currentTime;
                      }
                      return 0;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Song Info - Compact Horizontal Layout */}
      <div className="song-info-compact">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="song-info-compact-title">📋 Info Lagu</h3>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.9em' }}
            onClick={() => setShowSongInfo(!showSongInfo)}
            aria-label={showSongInfo ? 'Sembunyikan info lagu' : 'Tampilkan info lagu'}
            title={showSongInfo ? 'Sembunyikan info lagu' : 'Tampilkan info lagu'}
          >
            {showSongInfo ? '▼' : '▶'}
          </button>
        </div>
        {showSongInfo && (
          <div className="song-info-compact-grid">
            {/* 1. Key - Most Important */}
            {key && (
              <div className="song-info-item song-info-priority song-info-key">
                <span className="song-info-label">🎹 Key</span>
                <TransposeKeyControl
                  originalKey={song?.key || key}
                  targetKey={setlistSongData.key || song?.key || key}
                  transpose={transpose}
                  onTransposeChange={setTranspose}
                />
              </div>
            )}
            {/* 2. Capo - Setup Info */}
            {capo && (
              <div className="song-info-item song-info-priority">
                <span className="song-info-label">📌 Capo</span>
                <span className="song-info-value">Fret {capo}</span>
              </div>
            )}
            {/* 3. Time Signature - Rhythm Structure */}
            {timeSignature && (
              <div className="song-info-item">
                <span className="song-info-label">🎼 Time</span>
                <span className="song-info-value">{timeSignature}</span>
              </div>
            )}
            {/* 4. Tempo - Timing */}
            {tempo && (
              <div className="song-info-item song-info-tempo">
                <span className="song-info-label">⏱️ Tempo</span>
                <div className="song-info-tempo-controls">
                  <button
                    onClick={() => setScrollSpeed(Math.max(40, scrollSpeed - 5))}
                    className="tempo-adjust-btn"
                    title="Tempo down"
                    aria-label="Tempo down"
                  >
                    −
                  </button>
                  <div className="song-info-tempo-display">
                    <span className="song-info-value">{scrollSpeed}</span>
                    <span className="song-info-tempo-unit">BPM</span>                  
                  </div>
                  <button
                    onClick={() => setScrollSpeed(Math.min(240, scrollSpeed + 5))}
                    className="tempo-adjust-btn"
                    title="Tempo up"
                    aria-label="Tempo up"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                    className={`tempo-metronome-btn ${isMetronomeActive ? "active" : ""}`}
                    title={isMetronomeActive ? "Stop metronome" : "Start metronome"}
                    aria-label={isMetronomeActive ? "Stop metronome" : "Start metronome"}
                  >
                    {isMetronomeActive ? "⏹️" : "▶️"}
                  </button>
                </div>
                    <span
                      className="song-info-tempo-term"
                      style={{ fontStyle: "italic", color: "var(--text-secondary)" }}
                    >
                      {getTempoTerm(scrollSpeed)}
                    </span>

                {isMetronomeActive && <div className="song-info-tempo-status">♪ Playing...</div>}

              </div>
            )}

            {/* 5. Genre - Style Context */}
            {genre && (
              <div className="song-info-item">
                <span className="song-info-label">🎸 Genre</span>
                <span className="song-info-value">{genre}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chord Analyzer Panel - Selalu tampil */}
      <div className="song-lyrics-analyzer">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          <h3 className="song-lyrics-analyzer-title">🎵 Analisis Chord</h3>
          <button
            onClick={() => setShowChordAnalyzer(!showChordAnalyzer)}
            className="btn btn-secondary"
            style={{ fontSize: "0.85em" }}
          >
            {showChordAnalyzer ? "▼" : "▶"}
          </button>
        </div>
        {showChordAnalyzer && (
          <>
            <div className="song-lyrics-analyzer-grid">
              <div className="song-lyrics-analyzer-stat">
                <div className="song-lyrics-analyzer-stat-label">Total Chord</div>
                <div className="song-lyrics-analyzer-stat-value">{chordStats.count}</div>
              </div>
              <div className="song-lyrics-analyzer-stat">
                <div className="song-lyrics-analyzer-stat-label">Unique Chord</div>
                <div className="song-lyrics-analyzer-stat-value">{chordStats.chords.length}</div>
              </div>
            </div>
            <div className="song-lyrics-analyzer-chords">
              <label className="song-lyrics-analyzer-chords-label">Chord yang Digunakan:</label>
              <div className="song-lyrics-analyzer-chords-list">
                {chordStats.chords.length > 0 ? (
                  chordStats.chords.map((chord) => (
                    <span key={chord} className="song-lyrics-analyzer-chord-tag">
                      {chord}
                    </span>
                  ))
                ) : (
                  <span className="song-lyrics-analyzer-chord-tag song-lyrics-analyzer-chord-empty">Tidak ada chord ditemukan</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lyrics Main Section */}
      <div className="song-lyrics-main">
        <div className="song-lyrics-main-header">
          <h3 className="song-lyrics-main-title">🎤 Lirik & Chord</h3>
          <div className="song-lyrics-toolbar">
            {/* 1. Auto Scroll - PRIORITY (LEFT) */}
            {!isEditingLyrics && (
              <div
                className="autoscroll-controls"
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <button
                  onClick={() => setAutoScrollActive(!autoScrollActive)}
                  className={`autoscroll-toggle ${autoScrollActive ? "active" : ""}`}
                  title={autoScrollActive ? "Stop auto scroll" : "Start auto scroll"}
                >
                  {autoScrollActive ? (
                    <>
                      <span>⏹️</span>
                      <span>Stop Scroll</span>
                    </>
                  ) : (
                    <>
                      <span>📜</span>
                      <span>Auto Scroll</span>
                    </>
                  )}
                </button>
                {autoScrollActive && (
                  <>
                    <div className="autoscroll-speed">
                      <label htmlFor="scroll-speed" className="autoscroll-speed-label">
                        BPM:
                      </label>
                      <input
                        id="scroll-speed"
                        type="number"
                        min="40"
                        max="240"
                        value={scrollSpeed}
                        onChange={(e) => setScrollSpeed(parseInt(e.target.value) || 120)}
                        className="autoscroll-speed-input"
                      />
                    </div>
                    <div className="autoscroll-beats">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={`beat-dot ${currentBeat === i ? "active" : ""}`}>
                          ●
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Fullscreen Button */}
            <button
              className="btn btn-secondary"
              title="Tampilkan lirik layar penuh"
              onClick={() => {
                const el = document.querySelector(".song-lyrics-display");
                if (el && el.requestFullscreen) {
                  el.requestFullscreen();
                } else if (el && el.webkitRequestFullscreen) {
                  el.webkitRequestFullscreen();
                } else if (el && el.msRequestFullscreen) {
                  el.msRequestFullscreen();
                }
              }}
            >
              🖥️ Fullscreen
            </button>

            {/* 2. Zoom Controls */}
            <div className="song-lyrics-zoom-controls">
              <button
                onClick={() => setZoom(Math.max(0.7, zoom - 0.1))}
                className="song-lyrics-zoom-btn"
                title="Perkecil"
              >
                −
              </button>
              <span className="song-lyrics-zoom-display">{(zoom * 100).toFixed(0)}%</span>
              <button
                onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                className="song-lyrics-zoom-btn"
                title="Perbesar"
              >
                +
              </button>
              <button onClick={() => setZoom(1)} className="song-lyrics-zoom-btn" title="Reset">
                ⟲
              </button>
            </div>

            {/* 3. Edit Lirik */}
            {!isEditingLyrics ? (
              <>
                {can(PERMISSIONS.SONG_EDIT) && (
                  <button
                    type="button"
                    onClick={handleEditLyrics}
                    className="btn btn-primary"
                    style={{ fontSize: "0.9em" }}
                  >
                    ✏️ Edit Lirik
                  </button>
                )}
                {/* 4. Export Menu (RIGHT) */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.9em" }}
                  >
                    📥 Export
                  </button>
                  {showExportMenu && (
                    <div className="song-lyrics-export-menu">
                      <div className="song-lyrics-export-item" onClick={handleExportText}>
                        📄 Export ke Text
                      </div>
                      <div className="song-lyrics-export-item" onClick={handleExportPDF}>
                        📑 Print / PDF
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="song-lyrics-edit-actions">
                <button
                  type="button"
                  onClick={handleSaveLyrics}
                  disabled={savingLyrics}
                  className="song-lyrics-edit-btn-save"
                >
                  {savingLyrics ? "⏳ Menyimpan..." : "✓ Simpan"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditLyrics}
                  disabled={savingLyrics}
                  className="song-lyrics-edit-btn-cancel"
                >
                  ✕ Batal
                </button>
              </div>
            )}
          </div>
        </div>

        {editError && <div className="song-lyrics-error">{editError}</div>}

        {isEditingLyrics && (
          <div className="song-lyrics-tips">
            💡 Tips: Tekan <kbd>Ctrl+S</kbd> untuk simpan, <kbd>Esc</kbd> untuk batal
          </div>
        )}

        {isEditingLyrics ? (
          <textarea
            ref={lyricsDisplayRef}
            value={editedLyrics}
            onChange={(e) => setEditedLyrics(e.target.value)}
            className="song-lyrics-textarea"
            autoFocus
            placeholder="Masukkan lirik dan chord...&#10;Contoh:&#10;[C]Amazing grace how [F]sweet the [C]sound"
          />
        ) : (
          <div
            ref={lyricsDisplayRef}
            className="song-lyrics-display"
            style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', maxWidth: '100%' }}
          >
            {/* Toolbar autoscroll tetap tampil di fullscreen */}
            <div className="autoscroll-toolbar-fullscreen" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <button
                onClick={() => setAutoScrollActive(!autoScrollActive)}
                className={`autoscroll-toggle ${autoScrollActive ? 'active' : ''}`}
                title={autoScrollActive ? 'Stop auto scroll' : 'Start auto scroll'}
              >
                {autoScrollActive ? (
                  <>
                    <span>⏹️</span>
                    <span>Stop Scroll</span>
                  </>
                ) : (
                  <>
                    <span>📜</span>
                    <span>Auto Scroll</span>
                  </>
                )}
              </button>
              {autoScrollActive && (
                <>
                  <div className="autoscroll-speed">
                    <label htmlFor="scroll-speed-fullscreen" className="autoscroll-speed-label">BPM:</label>
                    <input
                      id="scroll-speed-fullscreen"
                      type="number"
                      min="40"
                      max="240"
                      value={scrollSpeed}
                      onChange={(e) => setScrollSpeed(parseInt(e.target.value) || 120)}
                      className="autoscroll-speed-input"
                    />
                  </div>
                  <div className="autoscroll-beats">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`beat-dot ${currentBeat === i ? 'active' : ''}`}>●</span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <ChordDisplay
              song={song}
              transpose={transpose}
              zoom={zoom}
              onTimestampClick={(seconds) => {
                if (youtubeRef.current && typeof youtubeRef.current.handleSeek === 'function') {
                  youtubeRef.current.handleSeek(seconds);
                }
              }}
            />
          </div>
        )}
      </div>

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
              navigate(`/songs/view/${navPrev.id || navPrev._id}`, {
                state: { setlistId, setlist: setlistData, setlistSong: navPrev },
              });
            }
          };
          const handleNext = () => {
            if (navNext) {
              navigate(`/songs/view/${navNext.id || navNext._id}`, {
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
