import React, { useState, useEffect, useRef } from "react";
// import { usePermission } from "../hooks/usePermission.js";
// import { PERMISSIONS } from "../utils/permissionUtils.js";
import { useNavigate, useParams } from "react-router-dom";
import YouTubeViewer from "../components/YouTubeViewer";
import TimeMarkers from "../components/TimeMarkers";
import TapTempo from "../components/TapTempo";
import VirtualPiano from "../components/VirtualPiano";
import AIAutofillModal from "../components/AIAutofillModal";
import ChordLinks from "../components/ChordLinks";
import { getAuthHeader } from "../utils/auth";
import { extractYouTubeId } from "../utils/youtubeUtils";

export default function SongAddEditPage({ onSongUpdated }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Form states
  const [sheetMusicXml, setSheetMusicXml] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [songKey, setSongKey] = useState("C");
  const [tempo, setTempo] = useState("");
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [genre, setGenre] = useState("");  
  const [lyrics, setLyrics] = useState("");
  const [youtubeId, setYoutubeId] = useState("");
  const [arrangementStyle, setArrangementStyle] = useState("");
  const [keyboardPatch, setKeyboardPatch] = useState("");
  const [timeMarkers, setTimeMarkers] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiConfirmFields, setAiConfirmFields] = useState({});
  const [mediaPanelExpanded, setMediaPanelExpanded] = useState(false);
  const [chordLinksExpanded, setChordLinksExpanded] = useState(false);
  const [partiturExpanded, setPartiturExpanded] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  const [transpose, setTranspose] = useState(0);

  // YouTube ref
  const ytRef = useRef(null);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);

  // Load song data for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setLoadingData(true);
      fetch(`/api/songs/${id}`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Gagal memuat data lagu");
          return res.json();
        })
        .then((data) => {
          setTitle(data.title || "");
          setArtist(data.artist || "");
          setSongKey(data.key || "");
          setTempo(data.tempo || "");
          setTimeSignature(data.time_signature || "4/4");
          setGenre(data.genre || "");          
          setLyrics(data.lyrics || "");
          setYoutubeId(extractYouTubeId(data.youtubeId || data.youtube_url || ""));
          setArrangementStyle(data.arrangementStyle || "");
          setKeyboardPatch(
            Array.isArray(data.keyboardPatch)
              ? data.keyboardPatch.join(", ")
              : data.keyboardPatch || "",
          );
          setTimeMarkers(data.time_markers || []);
          setSheetMusicXml(data.sheetMusicXml || "");
          setLoadingData(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoadingData(false);
        });
    }
  }, [id, isEditMode]);

  const handleAIAutofill = async () => {
    if (!title.trim()) {
      setError("Isi judul lagu terlebih dahulu untuk AI autofill");
      return;
    }

    setAiLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/song-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
        }),
      });

      if (!res.ok) throw new Error("Gagal mendapatkan data AI");

      const data = await res.json();
      setAiResult(data);
      setAiConfirmFields({
        artist: !!data.artist,
        key: !!data.key,
        tempo: !!data.tempo,
        genre: !!data.genre,        
        youtubeId: !!data.youtubeId,
        lyrics: !!data.lyrics,
        arrangementStyle: !!data.arrangementStyle,
        keyboardPatch: !!data.keyboardPatch,
      });
      setShowAiModal(true);
    } catch (err) {
      setError(err.message || "Gagal autofill AI");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAI = () => {
    if (!aiResult) return;
    if (aiConfirmFields.artist && aiResult.artist) setArtist(aiResult.artist);
    if (aiConfirmFields.key && aiResult.key) setSongKey(aiResult.key);
    if (aiConfirmFields.tempo && aiResult.tempo) setTempo(aiResult.tempo.toString());
    if (aiConfirmFields.genre && aiResult.genre) setGenre(aiResult.genre);    
    if (aiConfirmFields.youtubeId && aiResult.youtubeId) setYoutubeId(aiResult.youtubeId);
    if (aiConfirmFields.lyrics && aiResult.lyrics) setLyrics(aiResult.lyrics);
    if (aiConfirmFields.arrangementStyle && aiResult.arrangementStyle)
      setArrangementStyle(aiResult.arrangementStyle);
    if (aiConfirmFields.keyboardPatch && aiResult.keyboardPatch)
      setKeyboardPatch(
        Array.isArray(aiResult.keyboardPatch)
          ? aiResult.keyboardPatch.join(", ")
          : aiResult.keyboardPatch,
      );
    setShowAiModal(false);
    setAiResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Judul lagu wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      title: title.trim(),
      artist: artist.trim(),
      key: songKey,
      tempo: tempo ? parseInt(tempo) : null,
      time_signature: timeSignature || "4/4",
      genre: genre.trim(),      
      lyrics: lyrics.trim(),
      youtubeId: extractYouTubeId(youtubeId),
      arrangementStyle: arrangementStyle.trim(),
      keyboardPatch: keyboardPatch.trim(),
      time_markers: timeMarkers,
      sheetMusicXml: sheetMusicXml,
    };

    try {
      const url = isEditMode ? `/api/songs/${id}` : "/api/songs";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan lagu");
      }

      const savedSong = await res.json();

      // Call callback to refresh list for both new and edited songs
      if (onSongUpdated) {
        onSongUpdated();
      }

      // Navigate based on mode: list for new song, detail for edit
      if (isEditMode) {
        // Navigate with fromEdit flag to force SongChordsPage to fetch fresh data
        navigate(`/songs/view/${savedSong.id || id}`, {
          replace: true,
          state: { fromEdit: true },
        });
      } else {
        navigate("/songs");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel handler
  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/songs/view/${id}`);
    } else {
      navigate("/songs");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{isEditMode ? "Edit Lagu" : "Tambah Lagu Baru"}</h1>
        {error && (
          <div className="error-message" style={{marginTop: 12, marginBottom: 0, fontWeight: 'bold', color: '#c00', fontSize: 16}}>{error}</div>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card song-section-card">
          <div className="form-grid-2col">
            <div>
              <label className="form-label-required">
                🎵 Judul Lagu <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Masukkan judul lagu"
                className="form-input-field"
              />
            </div>

            <div>
              <label className="form-label-required">👤 Artist</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Nama artist atau band"
                className="form-input-field"
              />
            </div>
          </div>

          {/* AI Autofill Button */}
          <div
            style={{
              marginTop: 12,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAIAutofill}
              disabled={aiLoading}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              🤖 AI Autofill
              {aiLoading && <span style={{ marginLeft: 6 }}>⏳</span>}
            </button>
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Otomatis isi data lagu dari AI (judul wajib diisi)
            </span>
          </div>

          <div className="form-grid-2col">
            <div>
              <label className="form-label-required">🎹 Key</label>
              <div style={{ display: "flex", gap: "var(--spacing-sm)", alignItems: "center" }}>
                <input
                  type="text"
                  value={songKey}
                  onChange={(e) => setSongKey(e.target.value)}
                  placeholder="C, D, E, dll"
                  className="form-input-field"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPiano(true)}
                  className="btn btn-secondary"
                  style={{ whiteSpace: "nowrap" }}
                  title="Buka Piano Virtual"
                >
                  🎹 Piano
                </button>
              </div>
            </div>

            <div>
              <label className="form-label-required">⏱️ Tempo (BPM)</label>
              <div className="form-section" style={{ flexDirection: "row" }}>
                <input
                  type="number"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="120"
                  min="40"
                  max="240"
                  className="form-input-field"
                  style={{ flex: 1 }}
                />
                <TapTempo onTempo={setTempo} initialTempo={tempo} label="Tap" />
              </div>
            </div>

            <div>
              <label className="form-label-required">𝄞 Time Signature</label>
              <input
                type="text"
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
                placeholder="4/4, 3/4, 6/8, dll"
                className="form-input-field"
              />
            </div>

            <div>
              <label className="form-label-required">🎶 Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Pop, Rock, Jazz, dll"
                className="form-input-field"
              />
            </div>
          </div>

          <div>
            <label className="form-label-required">🎼 Gaya Aransemen</label>
            <input
              type="text"
              value={arrangementStyle}
              onChange={(e) => setArrangementStyle(e.target.value)}
              placeholder="Contoh: full band, akustik, unplugged"
              className="form-input-field"
            />
          </div>
          <div>
            <label className="form-label-required">🎹 Keyboard Patch</label>
              <textarea
                id="keyboardPatch"
                name="keyboardPatch"
                className="modal-input"
                value={keyboardPatch}
                onChange={(e) => setKeyboardPatch(e.target.value)}
                placeholder="Contoh: EP Mark I, Pad, Strings"
                rows={3}
              />
          </div>
        </div>

        {/* YouTube & Time Markers Section - Collapsible */}
        <div className="media-panel">
          <div className="media-panel-header">
            <div
              className="media-panel-header-content"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <button
                type="button"
                className="media-panel-toggle"
                onClick={() => setMediaPanelExpanded(!mediaPanelExpanded)}
                aria-label={mediaPanelExpanded ? "Sembunyikan panel" : "Tampilkan panel"}
                style={{ marginRight: 16 }}
              >
                {mediaPanelExpanded ? "▼" : "▶"}
              </button>
              <div style={{ flex: 1 }}>
                <h3 className="media-panel-title">
                  <span className="media-panel-icon">📺</span>
                  Video & Time Markers
                </h3>
                <p className="media-panel-subtitle">Tambahkan video dan marker untuk referensi</p>
              </div>
            </div>
          </div>

          {mediaPanelExpanded && (
            <div className="media-panel-content">
              <div style={{ marginBottom: "var(--spacing-lg)" }}>
                <label className="form-label-required">YouTube URL atau ID</label>
                <input
                  type="text"
                  value={youtubeId}
                  onChange={(e) => setYoutubeId(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... atau dQw4w9WgXcQ"
                  className="form-input-field"
                />
              </div>

              {youtubeId && (
                <div className="media-panel-grid">
                  {/* YouTube Video Section - Left */}
                  <div className="media-section media-video-section">
                    <div className="media-section-header">
                      <span className="media-section-icon">🎥</span>
                      <span className="media-section-label">YouTube Video</span>
                    </div>
                    <div className="media-section-body">
                      <YouTubeViewer
                        videoId={extractYouTubeId(youtubeId)}
                        ref={ytRef}
                        onTimeUpdate={(t, d) => {
                          setYtCurrentTime(t);
                          if (typeof d === "number") setYtDuration(d);
                        }}
                      />
                    </div>
                  </div>

                  {/* Time Markers Section - Right */}
                  <div className="media-section media-markers-section">
                    <div className="media-section-header">
                      <span className="media-section-icon">⏱️</span>
                      <span className="media-section-label">Time Markers</span>
                      {timeMarkers.length > 0 && (
                        <span className="media-section-badge">{timeMarkers.length}</span>
                      )}
                    </div>
                    <div className="media-section-body">
                      <TimeMarkers
                        timeMarkers={timeMarkers}
                        onUpdate={setTimeMarkers}
                        onSeek={(time) => {
                          if (ytRef.current && ytRef.current.handleSeek) {
                            ytRef.current.handleSeek(time);
                          }
                        }}
                        currentTime={ytCurrentTime}
                        duration={ytDuration}
                        readonly={false}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Chord Links Panel - Collapsible */}
        <div className="song-section-card">
          <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => setChordLinksExpanded(v => !v)}>
            <h3 className="song-section-title" style={{ flex: 1, margin: 0 }}>🔗 Chord Links</h3>
            <button type="button" className="media-panel-toggle" style={{ marginLeft: 8 }} tabIndex={-1}>
              {chordLinksExpanded ? "▼" : "▶"}
            </button>
          </div>
          {chordLinksExpanded && (
            <div style={{ marginTop: 8 }}>
              <ChordLinks searchQuery={[title, artist].filter(Boolean).join(" - ")} />
            </div>
          )}
        </div>


        {/* Lyrics Section */}
        <div className="song-section-card">
          <h3 className="song-section-title">🎤 Lirik & Chord</h3>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Masukkan lirik dan chord di sini..."
            rows={15}
            className="form-input-field"
            style={{
              fontFamily: 'var(--font-mono, "Courier New", monospace)',
              lineHeight: "1.6",
              resize: "vertical",
            }}
          />
        </div>

        {/* Sheet Music Section - Collapsible */}
        <div className="song-section-card">
          <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => setPartiturExpanded(v => !v)}>
            <h3 className="song-section-title" style={{ flex: 1, margin: 0 }}>🎼 Partitur (MusicXML)</h3>
            <button type="button" className="media-panel-toggle" style={{ marginLeft: 8 }} tabIndex={-1}>
              {partiturExpanded ? "▼" : "▶"}
            </button>
          </div>
          {partiturExpanded && (
            <>
              <textarea
                value={sheetMusicXml}
                onChange={(e) => setSheetMusicXml(e.target.value)}
                placeholder="Paste MusicXML di sini..."
                rows={10}
                className="form-input-field"
                style={{ fontFamily: "monospace", resize: "vertical" }}
              />
              <div className="form-hint">
                Hanya format MusicXML. Gunakan software notasi musik untuk ekspor MusicXML.
              </div>
            </>
          )}
        </div>

        {/* Error Display */}
        {/* Error Display dipindahkan ke atas form */}

        {/* Action Buttons */}
        <div className="form-actions">
          <button type="button" onClick={handleCancel} className="btn">
            Batal
          </button>
          <button type="submit" disabled={loading} className="btn">
            {loading ? "⏳ Menyimpan..." : isEditMode ? "💾 Simpan Perubahan" : "➕ Tambah Lagu"}
          </button>
        </div>
      </form>

      {/* Virtual Piano Popup */}
      <VirtualPiano
        isOpen={showPiano}
        onClose={() => setShowPiano(false)}
        onKeySelect={(key) => setSongKey(key)}
      />

      {/* AI Autofill Modal */}
      {showAiModal && aiResult && (
        <AIAutofillModal
          aiResult={aiResult}
          aiConfirmFields={aiConfirmFields}
          setAiConfirmFields={setAiConfirmFields}
          onApply={handleApplyAI}
          onClose={() => {
            setShowAiModal(false);
            setAiResult(null);
          }}
        />
      )}
    </div>
  );
}
