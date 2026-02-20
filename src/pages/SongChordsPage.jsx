import React, { useState, useEffect, useRef } from "react";
import SongChordsLyricsDisplay from '../components/SongChordsLyricsDisplay.jsx';
import SongChordsAnalyzer from '../components/SongChordsAnalyzer.jsx';
import SongChordsLyricsToolbar from '../components/SongChordsLyricsToolbar.jsx';
import { useNavigate, useLocation, useParams } from "react-router-dom";
import SetlistSongNavigator from "../components/SetlistSongNavigator.jsx";
import SongChordsHeader from '../components/SongChordsHeader.jsx';
import SongChordsMediaPanel from '../components/SongChordsMediaPanel.jsx';
import SongChordsInfo from '../components/SongChordsInfo.jsx';
import { getAuthHeader } from "../utils/auth.js";
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import { cacheSong, getSong as getSongOffline } from '../utils/offlineCache.js';

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
  // Deteksi metadata "Original Key: X" di lirik
  let song = fetchedSong || {};
  let originalKey = '';
  let lyricsClean = song.lyrics || '';
  if (lyricsClean) {
    const metaMatch = lyricsClean.match(/^Original Key:\s*([A-G][#b]?m?(?:aj|min|dim|aug)?\b)/im);
    if (metaMatch) {
      originalKey = metaMatch[1];
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
  // (Efek autoscroll dipindah ke komponen AutoScrollBar)

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
        // Simpan ke cache offline
        cacheSong(data).catch(() => {});
      })
      .catch(async (err) => {
        // Jika offline, coba ambil dari cache
        try {
          const offlineSong = await getSongOffline(id);
          if (offlineSong) {
            setFetchedSong(offlineSong);
            setError("[Offline] Data dari cache");
          } else {
            setError("Gagal memuat lagu: " + err.message);
          }
        } catch (e) {
          setError("Gagal memuat lagu: " + err.message);
        }
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

    const content = `${song.title}\nArtist: ${artist}\nKey: ${key}\n${originalKey ? `Original Key: ${originalKey}\n` : ''}Tempo: ${tempo} BPM\n\n${lyricsClean}`;
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
  </div>
  <div class="lyrics">${lyricsClean}</div>
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
        artist={artist}
        performanceMode={performanceMode}
        canEdit={can(PERMISSIONS.SONG_EDIT)}
        onEdit={handleEdit}
        onShare={handleShare}
        shareMessage={shareMessage}
        onBack={handleBack}
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

      <SongChordsInfo
        originalKey={originalKey || song?.key || ''}
        targetKey={key || originalKey || song?.key || ''}
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
      />

      <SongChordsAnalyzer
        showChordAnalyzer={showChordAnalyzer}
        setShowChordAnalyzer={setShowChordAnalyzer}
        chordStats={chordStats}
        transpose={transpose}
      />

      {/* Lyrics Main Section */}
      <div className="song-lyrics-main">
        <div className="song-lyrics-main-header">
          <h3 className="song-lyrics-main-title">🎤 Lirik & Chord</h3>
            <SongChordsLyricsToolbar
              isEditingLyrics={isEditingLyrics}
              performanceMode={performanceMode}
              canEdit={can(PERMISSIONS.SONG_EDIT)}
              tempo={tempo}
              autoScrollActive={autoScrollActive}
              scrollSpeed={scrollSpeed}
              setAutoScrollActive={setAutoScrollActive}
              setScrollSpeed={setScrollSpeed}
              lyricsDisplayRef={lyricsDisplayRef}
              currentBeat={currentBeat}
              setCurrentBeat={setCurrentBeat}
              zoom={zoom}
              setZoom={setZoom}
              handleEditLyrics={handleEditLyrics}
              savingLyrics={savingLyrics}
              handleSaveLyrics={handleSaveLyrics}
              handleCancelEditLyrics={handleCancelEditLyrics}
              showExportMenu={showExportMenu}
              setShowExportMenu={setShowExportMenu}
              handleExportText={handleExportText}
              handleExportPDF={handleExportPDF}
            />
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
            placeholder="Masukkan lirik dan chord...\nContoh:\n[C]Amazing grace how [F]sweet the [C]sound"
          />
        ) : (
          <SongChordsLyricsDisplay
            isEditingLyrics={isEditingLyrics}
            lyricsDisplayRef={lyricsDisplayRef}
            song={song}
            transpose={transpose}
            zoom={zoom}
            autoScrollActive={autoScrollActive}
            scrollSpeed={scrollSpeed}
            setAutoScrollActive={setAutoScrollActive}
            setScrollSpeed={setScrollSpeed}
            currentBeat={currentBeat}
            setCurrentBeat={setCurrentBeat}
            showSheetMusic={showSheetMusic}
            setShowSheetMusic={setShowSheetMusic}
            youtubeRef={youtubeRef}
          />
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
