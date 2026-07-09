import React, { useState, useEffect, useRef } from "react";
// import { usePermission } from "../hooks/usePermission.js";
// import { PERMISSIONS } from "../utils/permissionUtils.js";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import YouTubeViewer from "../components/YouTubeViewer";
import TimeMarkers from "../components/TimeMarkers";
import TapTempo from "../components/TapTempo";
import VirtualPiano from "../components/VirtualPiano";
import AIAutofillModal from "../components/AIAutofillModal";
import ChordLinks from "../components/ChordLinks";
import SongLyricsEditorPanel from "../components/SongLyricsEditorPanel.jsx";
import { getAuthHeader } from "../utils/auth";
import { extractYouTubeId } from "../utils/youtubeUtils";
import { alignSelectedBarlines, wrapBarsPerLine } from '../utils/chordUtils.js';
import { getNumericNotationKey } from '../utils/notationUtils.js';
import { buildInsertNoteToken, replaceSelectionWithToken } from '../utils/lyricsEditorUtils.js';

function buildNewVersionTitle(sourceTitle) {
  const baseTitle = (sourceTitle || "").trim() || "Tanpa Judul";
  const versionMatch = baseTitle.match(/^(.*)\s+\(Versi\s+(\d+)\)$/i);
  if (versionMatch) {
    const versionNumber = parseInt(versionMatch[2], 10);
    if (!Number.isNaN(versionNumber)) {
      return `${versionMatch[1]} (Versi ${versionNumber + 1})`;
    }
  }
  return `${baseTitle} (Versi 2)`;
}

export default function SongAddEditPage({ onSongUpdated, newVersionMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id && !newVersionMode;

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
  const [loadingData, setLoadingData] = useState(!!id);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiConfirmFields, setAiConfirmFields] = useState({});
  const [mediaPanelExpanded, setMediaPanelExpanded] = useState(false);
  const [chordLinksExpanded, setChordLinksExpanded] = useState(false);
  const [partiturExpanded, setPartiturExpanded] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  const [showLyricsPiano, setShowLyricsPiano] = useState(false);
  const [insertNotesToLyrics, setInsertNotesToLyrics] = useState(true);
  const [insertNoteFormat, setInsertNoteFormat] = useState('bracket');
  const [insertTrailingSpace, setInsertTrailingSpace] = useState(true);
  const [barsPerLine, setBarsPerLine] = useState(4);
  const [lyricsEditError, setLyricsEditError] = useState("");

  // YouTube ref
  const ytRef = useRef(null);
  const formRef = useRef(null);
  const lyricsTextareaRef = useRef(null);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const textarea = lyricsTextareaRef.current;
      if (!textarea || document.activeElement !== textarea) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleAlignSelectedBarlines();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "4") {
        e.preventDefault();
        handleWrap4BarsPerLine();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyrics, barsPerLine]);

  // Load source song for edit or duplicate mode
  useEffect(() => {
    if (id) {
      setLoadingData(true);
      setError("");
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
          setTitle(newVersionMode ? buildNewVersionTitle(data.title) : (data.title || ""));
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
    } else {
      setLoadingData(false);
    }
  }, [newVersionMode, id]);

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

      // Navigate based on mode: list for new-version/new song, detail for edit
      if (isEditMode) {
        // Navigate with fromEdit flag to force SongChordsPage to fetch fresh data
        navigate(`/songs/view/${savedSong.id || id}`, {
          replace: true,
          state: { fromEdit: true },
        });
      } else {
        navigate(location.state?.from || "/songs");
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
      navigate(location.state?.from || "/songs");
    }
  };

  const handleAlignSelectedBarlines = () => {
    const textarea = lyricsTextareaRef.current;
    if (!textarea || typeof textarea.selectionStart !== "number" || typeof textarea.selectionEnd !== "number") {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    if (selectionStart === selectionEnd) {
      setLyricsEditError("Blok teks lirik terlebih dahulu.");
      return;
    }

    const selectedText = lyrics.slice(selectionStart, selectionEnd);
    const alignedText = alignSelectedBarlines(selectedText);
    if (alignedText === selectedText) {
      setLyricsEditError("");
      return;
    }

    const nextLyrics = `${lyrics.slice(0, selectionStart)}${alignedText}${lyrics.slice(selectionEnd)}`;
    setLyrics(nextLyrics);
    setLyricsEditError("");

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionStart + alignedText.length);
    });
  };

  const handleWrapBarsPerLine = (targetBarsPerLine = barsPerLine) => {
    const textarea = lyricsTextareaRef.current;
    if (!textarea) return;

    const hasSelection = typeof textarea.selectionStart === "number"
      && typeof textarea.selectionEnd === "number"
      && textarea.selectionStart !== textarea.selectionEnd;

    if (!hasSelection) {
      setLyricsEditError("Blok teks lirik terlebih dahulu.");
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = lyrics.slice(selectionStart, selectionEnd);
    if (!selectedText) return;

    const wrappedText = wrapBarsPerLine(selectedText, targetBarsPerLine);
    const alignedText = alignSelectedBarlines(wrappedText);
    if (alignedText === selectedText) {
      setLyricsEditError("");
      return;
    }

    const nextLyrics = `${lyrics.slice(0, selectionStart)}${alignedText}${lyrics.slice(selectionEnd)}`;
    setLyrics(nextLyrics);
    setLyricsEditError("");

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionStart + alignedText.length);
    });
  };

  const handleWrap4BarsPerLine = () => handleWrapBarsPerLine(4);

  const handleLyricsPianoKeySelect = (note) => {
    if (!insertNotesToLyrics) return;

    const textarea = lyricsTextareaRef.current;
    const token = buildInsertNoteToken({
      note,
      keySignature: songKey || 'C',
      insertNoteFormat,
      insertTrailingSpace,
    });
    const selectionStart = textarea?.selectionStart;
    const selectionEnd = textarea?.selectionEnd;

    setLyrics((prev) => replaceSelectionWithToken({
      text: prev,
      selectionStart,
      selectionEnd,
      token,
    }).nextText);

    requestAnimationFrame(() => {
      if (!textarea || typeof textarea.selectionStart !== 'number' || typeof textarea.selectionEnd !== 'number') {
        return;
      }
      textarea.focus();
      const cursor = selectionStart + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  if (loadingData) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>{newVersionMode ? "Buat Versi Baru Lagu" : "Memuat Lagu"}</h1>
        </div>
        <div className="card">Memuat data lagu...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{isEditMode ? "Edit Lagu" : newVersionMode ? "Buat Versi Baru Lagu" : "Tambah Lagu Baru"}</h1>
        {error && (
          <div className="error-message" style={{marginTop: 12, marginBottom: 0, fontWeight: 'bold', color: '#c00', fontSize: 16}}>{error}</div>
        )}
      </div>
      {newVersionMode && (
        <div className="card" style={{ marginBottom: 16 }}>
          Form ini membuat versi baru dari lagu yang sudah ada. Ubah judul, aransemen, atau detail lain seperlunya sebelum menyimpan.
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit}>
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
          <SongLyricsEditorPanel
            lyricsRef={lyricsTextareaRef}
            lyricsValue={lyrics}
            setLyricsValue={setLyrics}
            error={lyricsEditError}
            disabled={loading}
            barsPerLine={barsPerLine}
            setBarsPerLine={setBarsPerLine}
            handleAlignSelectedBarlines={handleAlignSelectedBarlines}
            handleWrap4BarsPerLine={handleWrap4BarsPerLine}
            handleWrapBarsPerLine={handleWrapBarsPerLine}
            showMetadataHelpButton={true}
            showSaveCancelButtons={false}
            barsPerLineSelectId="bars-per-line-add-edit"
            showPianoControls={true}
            onOpenPiano={() => setShowLyricsPiano(true)}
            insertNotesEnabled={insertNotesToLyrics}
            onToggleInsertNotes={setInsertNotesToLyrics}
            insertNoteFormat={insertNoteFormat}
            onChangeInsertNoteFormat={setInsertNoteFormat}
            insertTrailingSpace={insertTrailingSpace}
            onToggleInsertTrailingSpace={setInsertTrailingSpace}
            keySignature={getNumericNotationKey(songKey || 'C')}
            autoFocus={false}
            showTips={true}
            tipsText={
              <>
                💡 Tips: Blok teks dulu. Pilih <b>2/4/6 Bar/Baris</b> lalu klik <b>Terapkan</b> (atau <kbd>Ctrl+Shift+4</kbd> untuk cepat 4 bar), gunakan <b>Sejajarkan Bar</b> atau <kbd>Ctrl+Shift+B</kbd>, tekan <kbd>Ctrl+S</kbd> untuk simpan form.
              </>
            }
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
            {loading ? "⏳ Menyimpan..." : isEditMode ? "💾 Simpan Perubahan" : newVersionMode ? "🧬 Simpan Versi Baru" : "➕ Tambah Lagu"}
          </button>
        </div>
      </form>

      {/* Virtual Piano Popup */}
      <VirtualPiano
        isOpen={showPiano}
        onClose={() => setShowPiano(false)}
        onKeySelect={(key) => setSongKey(key)}
      />

      <VirtualPiano
        isOpen={showLyricsPiano}
        onClose={() => setShowLyricsPiano(false)}
        onKeySelect={handleLyricsPianoKeySelect}
        helperText={insertNotesToLyrics ? `Klik not untuk menyisipkan ${insertNoteFormat === 'plain' ? 'not' : insertNoteFormat === 'number' ? `angka (key ${getNumericNotationKey(songKey || 'C')})` : 'chord'} ke lirik${insertTrailingSpace ? ' + spasi' : ''}` : 'Klik not untuk mendengar nada tanpa insert ke lirik'}
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
