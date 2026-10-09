import React, { useState, useEffect, useMemo, useRef } from "react";
// import { usePermission } from "../hooks/usePermission.js";
// import { PERMISSIONS } from "../utils/permissionUtils.js";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import YouTubeViewer from "../components/YouTubeViewer";
import TapTempo from "../components/TapTempo";
import VirtualPiano from "../components/VirtualPiano";
import AIAutofillModal from "../components/AIAutofillModal";
import SongLyricsEditorPanel from "../components/SongLyricsEditorPanel.jsx";
import SongFormSection from "../components/SongFormSection.jsx";
import FloatingYouTubePlayer from "../components/FloatingYouTubePlayer.jsx";
import { getAuthHeader } from "../utils/auth";
import { extractYouTubeId } from "../utils/youtubeUtils";
import { alignSelectedBarlines, wrapBarsPerLine, mergeDetectedTimestampsIntoMarkers } from '../utils/chordUtils.js';
import { getNumericNotationKey } from '../utils/notationUtils.js';
import { buildInsertNoteToken, formatWholeLyricsDocument, replaceSelectionWithToken, transposeLyricsText } from '../utils/lyricsEditorUtils.js';
import { buildAddEditEditorActions } from '../utils/editorActionsUtils.js';
import { analyseLyrics, computeSongCompleteness, extractSectionOverview } from '../utils/songFormUtils.js';

const SONG_KEY_OPTIONS = [
  'C', 'C#', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm',
];

const TIME_SIGNATURE_OPTIONS = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '7/8'];

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Jazz', 'Blues', 'Country', 'Reggae', 'Funk', 'Soul', 'R&B',
  'Dangdut', 'Keroncong', 'Campursari', 'Pop Indonesia', 'Metal', 'Punk',
  'Folk', 'Acoustic', 'Gospel', 'Worship', 'Latin', 'Electronic',
];

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

const completenessScoreLevel = (score) => {
  if (score >= 85) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

function buildNewVersionTitle(sourceTitle) {  const baseTitle = (sourceTitle || "").trim() || "Tanpa Judul";
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
  const [showLyricsPiano, setShowLyricsPiano] = useState(false);
  const [insertNotesToLyrics, setInsertNotesToLyrics] = useState(false);
  const [insertNoteFormat, setInsertNoteFormat] = useState('number');
  const [insertNumberKeySignature, setInsertNumberKeySignature] = useState(() => getNumericNotationKey('C'));
  const [insertTrailingSpace, setInsertTrailingSpace] = useState(true);
  const [barsPerLine, setBarsPerLine] = useState(4);
  const [lyricsEditError, setLyricsEditError] = useState("");
  const [showFloatingYouTubePlayer, setShowFloatingYouTubePlayer] = useState(false);

  // Restructured editor state: collapsible sections + honest dirty tracking.
  const [openSections, setOpenSections] = useState({
    identity: true,
    musical: true,
    lyrics: true,
    media: false,
    partitur: false,
    derived: false,
  });
  const [savedBaseline, setSavedBaseline] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  // YouTube ref
  const ytRef = useRef(null);
  const formRef = useRef(null);
  const lyricsTextareaRef = useRef(null);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const normalizedYoutubeId = extractYouTubeId(youtubeId);

  const areMarkersEqual = (first = [], second = []) => JSON.stringify(first) === JSON.stringify(second);

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
          setInsertNumberKeySignature(getNumericNotationKey(data.key || 'C'));
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

          // Establish the dirty-tracking baseline from the freshly loaded server data.
          setSavedBaseline(
            JSON.stringify({
              title: (data.title || "").trim(),
              artist: (data.artist || "").trim(),
              key: data.key || "",
              tempo: data.tempo || "",
              timeSignature: data.time_signature || "4/4",
              genre: (data.genre || "").trim(),
              lyrics: (data.lyrics || "").trim(),
              youtubeId: extractYouTubeId(data.youtubeId || data.youtube_url || ""),
              arrangementStyle: (data.arrangementStyle || "").trim(),
              keyboardPatch: (
                Array.isArray(data.keyboardPatch)
                  ? data.keyboardPatch.join(", ")
                  : data.keyboardPatch || ""
              ).trim(),
              sheetMusicXml: data.sheetMusicXml || "",
            }),
          );
        })
        .catch((err) => {
          setError(err.message);
          setLoadingData(false);
        });
    } else {
      setLoadingData(false);
    }
  }, [newVersionMode, id]);

  useEffect(() => {
    const mergedMarkers = mergeDetectedTimestampsIntoMarkers(lyrics, timeMarkers);
    if (!areMarkersEqual(mergedMarkers, timeMarkers)) {
      setTimeMarkers(mergedMarkers);
    }
  }, [lyrics, timeMarkers]);

  useEffect(() => {
    if (!normalizedYoutubeId) {
      setShowFloatingYouTubePlayer(false);
    }
  }, [normalizedYoutubeId]);

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
    if (aiConfirmFields.key && aiResult.key) {
      setSongKey(aiResult.key);
      setInsertNumberKeySignature(getNumericNotationKey(aiResult.key || 'C'));
    }
    if (aiConfirmFields.tempo && aiResult.tempo) setTempo(aiResult.tempo.toString());
    if (aiConfirmFields.genre && aiResult.genre) setGenre(aiResult.genre);
    if (aiConfirmFields.youtubeId && aiResult.youtubeId) setYoutubeId(aiResult.youtubeId);
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

    const mergedMarkers = mergeDetectedTimestampsIntoMarkers(lyrics.trim(), timeMarkers);

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
      time_markers: mergedMarkers,
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

      // The form now matches the server, so clear the unsaved-changes state.
      setSavedBaseline(serializedForm);

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

  // Whole-document tidy-up: clean copy-paste noise, tag sections, standardise chords.
  const handleFormatWholeDocument = () => {
    setLyrics((prev) => formatWholeLyricsDocument(prev));
  };

  const handleLyricsPianoKeySelect = (note) => {
    if (!insertNotesToLyrics) return;

    const textarea = lyricsTextareaRef.current;
    const token = buildInsertNoteToken({
      note,
      keySignature: insertNumberKeySignature || songKey || 'C',
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

  // ---- Derived editor state -------------------------------------------------

  const lyricsAnalysis = useMemo(() => analyseLyrics(lyrics), [lyrics]);
  const sectionOverview = useMemo(() => extractSectionOverview(lyrics), [lyrics]);

  const formSnapshot = useMemo(
    () => ({
      title: title.trim(),
      artist: artist.trim(),
      key: songKey,
      tempo,
      timeSignature,
      genre: genre.trim(),
      lyrics: lyrics.trim(),
      youtubeId: extractYouTubeId(youtubeId),
      arrangementStyle: arrangementStyle.trim(),
      keyboardPatch: keyboardPatch.trim(),
      sheetMusicXml,
    }),
    [title, artist, songKey, tempo, timeSignature, genre, lyrics, youtubeId, arrangementStyle, keyboardPatch, sheetMusicXml]
  );

  const completeness = useMemo(
    () => computeSongCompleteness({ ...formSnapshot, lyrics }, lyricsAnalysis),
    [formSnapshot, lyrics, lyricsAnalysis]
  );

  const serializedForm = useMemo(() => JSON.stringify(formSnapshot), [formSnapshot]);
  const hasUnsavedChanges = savedBaseline === null ? false : serializedForm !== savedBaseline;

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleQuickTranspose = (steps) => {
    setLyrics((prev) => transposeLyricsText(prev, steps));
  };

  const handleCopyLyrics = async () => {
    if (!lyrics.trim()) {
      setCopyFeedback("Lirik masih kosong");
      setTimeout(() => setCopyFeedback(""), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopyFeedback("Lirik disalin");
    } catch {
      setCopyFeedback("Gagal menyalin");
    }
    setTimeout(() => setCopyFeedback(""), 2000);
  };

  const handleJumpToSection = (lineIndex) => {
    const view = lyricsTextareaRef.current;
    if (!view?.dispatch || !view?.state) return;
    const targetLine = Math.min((lineIndex ?? 0) + 1, view.state.doc.lines);
    const line = view.state.doc.line(targetLine);
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
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
          <div className="error-message song-edit-error-banner">{error}</div>
        )}
      </div>
      {newVersionMode && (
        <div className="card song-new-version-note">
          Form ini membuat versi baru dari lagu yang sudah ada. Ubah judul, aransemen, atau detail lain seperlunya sebelum menyimpan.
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="song-editor-form">
        <div className="song-editor-layout">
          <div className="song-editor-main">
            <SongFormSection
              id="song-identity"
              icon="🎵"
              title="Identitas Lagu"
              subtitle="Judul dan artist"
              isOpen={openSections.identity}
              onToggle={() => toggleSection('identity')}
              incomplete={!title.trim() || !artist.trim()}
              actions={
                <button
                  type="button"
                  onClick={handleAIAutofill}
                  disabled={aiLoading}
                  className="btn btn-secondary song-ai-autofill-btn"
                  title="Isi otomatis data lagu dari AI (judul wajib diisi)"
                >
                  🤖 {aiLoading ? 'Mencari…' : 'AI Autofill'}
                </button>
              }
            >
              <div className="form-grid-2col">
                <div>
                  <label className="form-label-required" htmlFor="song-title">
                    Judul Lagu <span className="required-asterisk">*</span>
                  </label>
                  <input
                    id="song-title"
                    name="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Masukkan judul lagu"
                    className="form-input-field"
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="song-artist">Artist / Band</label>
                  <input
                    id="song-artist"
                    name="artist"
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Nama artist atau band"
                    className="form-input-field"
                  />
                </div>
              </div>
            </SongFormSection>


            <SongFormSection
              id="song-musical"
              icon="🎼"
              title="Detail Musikal"
              subtitle="Key, tempo, birama, dan genre"
              badge={
                <span className="song-form-section-badge">
                  {songKey || '—'} · {tempo || '—'} BPM
                </span>
              }
              isOpen={openSections.musical}
              onToggle={() => toggleSection('musical')}
              incomplete={!songKey || !tempo}
            >
              <div className="form-grid-3col">
                <div>
                  <label className="form-label" htmlFor="song-key">Key</label>
                  <select
                    id="song-key"
                    name="key"
                    className="form-input-field"
                    value={songKey}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      setSongKey(nextKey);
                      setInsertNumberKeySignature(getNumericNotationKey(nextKey || 'C'));
                    }}
                  >
                    <option value="">— pilih key —</option>
                    {SONG_KEY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="song-tempo">Tempo (BPM)</label>
                  <div className="song-field-inline">
                    <input
                      id="song-tempo"
                      name="tempo"
                      type="number"
                      value={tempo}
                      onChange={(e) => setTempo(e.target.value)}
                      placeholder="120"
                      min="40"
                      max="240"
                      className="form-input-field"
                    />
                    <TapTempo onTempo={setTempo} initialTempo={tempo} label="Tap" />
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="song-time-signature">Time Signature</label>
                  <select
                    id="song-time-signature"
                    name="time_signature"
                    className="form-input-field"
                    value={timeSignature}
                    onChange={(e) => setTimeSignature(e.target.value)}
                  >
                    {TIME_SIGNATURE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2col song-musical-secondary">
                <div>
                  <label className="form-label" htmlFor="song-genre">Genre</label>
                  <input
                    id="song-genre"
                    name="genre"
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Pop, Rock, Jazz, dll"
                    className="form-input-field"
                    list="song-genre-options"
                  />
                  <datalist id="song-genre-options">
                    {GENRE_OPTIONS.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="form-label" htmlFor="song-arrangement">Gaya Aransemen</label>
                  <input
                    id="song-arrangement"
                    name="arrangementStyle"
                    type="text"
                    value={arrangementStyle}
                    onChange={(e) => setArrangementStyle(e.target.value)}
                    placeholder="Contoh: full band, akustik, unplugged"
                    className="form-input-field"
                  />
                </div>
              </div>
           </SongFormSection>

            {/* ---------- 3. Lirik & chord (fokus utama) ---------- */}
            <SongFormSection
              id="song-lyrics"
              icon="🎤"
              title="Lirik & Chord"
              subtitle="Editor utama dengan preview langsung"
              badge={
                <span className="song-form-section-badge">
                  {lyricsAnalysis.lineCount} baris · {sectionOverview.length} bagian
                </span>
              }
              isOpen={openSections.lyrics}
              onToggle={() => toggleSection('lyrics')}
              incomplete={!lyricsAnalysis.hasLyrics}
              actions={
                <div className="song-lyrics-quick-transpose" role="group" aria-label="Transpose cepat">
                  <span className="song-lyrics-quick-transpose-label">Transpose</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleQuickTranspose(-1)}
                    title="Turunkan semua chord 1 semitone"
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleQuickTranspose(1)}
                    title="Naikkan semua chord 1 semitone"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopyLyrics}
                    title="Salin seluruh lirik ke clipboard"
                  >
                    {copyFeedback || '⧉ Salin'}
                  </button>
                  {normalizedYoutubeId && (
                    <button
                      type="button"
                      className={`btn ${showFloatingYouTubePlayer ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setShowFloatingYouTubePlayer((prev) => !prev)}
                      title={showFloatingYouTubePlayer ? 'Tutup YouTube floating' : 'Buka YouTube floating'}
                    >
                      {showFloatingYouTubePlayer ? '🗗' : '🗖'} Video
                    </button>
                  )}
                </div>
              }
            >
              <SongLyricsEditorPanel
                lyricsRef={lyricsTextareaRef}
                lyricsValue={lyrics}
                setLyricsValue={setLyrics}
                error={lyricsEditError}
                disabled={loading}
                editorActions={buildAddEditEditorActions({
                  barsPerLine,
                  setBarsPerLine,
                  handleAlignSelectedBarlines,
                  handleWrap4BarsPerLine,
                  handleFormatWholeDocument,
                  handleWrapBarsPerLine,
                  onOpenPiano: () => setShowLyricsPiano(true),
                  insertNotesToLyrics,
                  setInsertNotesToLyrics,
                  insertNoteFormat,
                  setInsertNoteFormat,
                  insertTrailingSpace,
                  setInsertTrailingSpace,
                  insertNumberKeySignature,
                  setInsertNumberKeySignature,
                })}
                autoFocus={false}
                showTips={true}
                previewSong={{ key: songKey, tempo }}
                previewProps={{ showChords: true, keySignature: songKey || 'C' }}
              />
            </SongFormSection>

            {/* ---------- 4. Media & referensi ---------- */}
            <SongFormSection
              id="song-media"
              icon="📺"
              title="Video & Referensi"
              subtitle="YouTube, patch keyboard, dan partitur"
              badge={
                <span className="song-form-section-badge">
                  {[normalizedYoutubeId && '🎬', keyboardPatch.trim() && '🎹', sheetMusicXml.trim() && '🎼']
                    .filter(Boolean)
                    .join(' ') || 'kosong'}
                </span>
              }
              isOpen={openSections.media}
              onToggle={() => toggleSection('media')}
            >
              <div className="song-field-stack">
                <div>
                  <label className="form-label" htmlFor="song-youtube">YouTube URL atau ID</label>
                  <input
                    id="song-youtube"
                    name="youtubeId"
                    type="text"
                    value={youtubeId}
                    onChange={(e) => setYoutubeId(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... atau dQw4w9WgXcQ"
                    className="form-input-field"
                  />
                  {normalizedYoutubeId && (
                    <div className="form-hint">Video terdeteksi: <code>{normalizedYoutubeId}</code></div>
                  )}
                </div>

                <div>
                  <label className="form-label" htmlFor="song-keyboard-patch">Keyboard Patch</label>
                  <textarea
                    id="song-keyboard-patch"
                    name="keyboardPatch"
                    value={keyboardPatch}
                    onChange={(e) => setKeyboardPatch(e.target.value)}
                    placeholder="Contoh: EP Mark I, Pad, Strings"
                    rows={3}
                    className="form-input-field"
                  />
                  <div className="form-hint">
                    Daftar patch/sound yang dipakai. Bisa juga ditulis langsung di lirik sebagai cue{' '}
                    <code>[Keys: Stage Piano | PC: 0 | CH: 1]</code>.
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="song-sheet-music">Partitur (MusicXML)</label>
                  <textarea
                    id="song-sheet-music"
                    name="sheetMusicXml"
                    value={sheetMusicXml}
                    onChange={(e) => setSheetMusicXml(e.target.value)}
                    placeholder="Paste MusicXML di sini..."
                    rows={8}
                    className="form-input-field song-sheetmusic-textarea"
                  />
                  <div className="form-hint">Hanya format MusicXML. Gunakan software notasi musik untuk ekspor MusicXML.</div>
                </div>
              </div>

              {normalizedYoutubeId && (
                <div className="song-media-preview">
                  <div className="song-media-preview-header">
                    <span>🎥 Pratinjau Video</span>
                    {ytDuration > 0 && (
                      <span className="song-media-preview-time">
                        {formatDuration(ytCurrentTime)} / {formatDuration(ytDuration)}
                      </span>
                    )}
                  </div>
                  {!showFloatingYouTubePlayer ? (
                    <YouTubeViewer
                      videoId={normalizedYoutubeId}
                      ref={ytRef}
                      onTimeUpdate={(t, d) => {
                        setYtCurrentTime(t);
                        if (typeof d === "number") setYtDuration(d);
                      }}
                    />
                  ) : (
                    <div className="media-empty-state">
                      <span className="media-empty-icon">🪟</span>
                      <p className="media-empty-text">YouTube sedang dibuka dalam mode floating.</p>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowFloatingYouTubePlayer(false)}
                      >
                        Kembalikan ke panel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </SongFormSection>

            {/* ---------- 5. Turunan otomatis (read-only) ---------- */}
            <SongFormSection
              id="song-derived"
              icon="⏱️"
              title="Time Markers (Otomatis)"
              subtitle="Terbentuk dari penanda waktu di lirik"
              badge={<span className="song-form-section-badge">{timeMarkers.length} marker</span>}
              isOpen={openSections.derived}
              onToggle={() => toggleSection('derived')}
            >
              {timeMarkers.length > 0 ? (
                <ul className="song-derived-marker-list">
                  {timeMarkers.map((marker, index) => (
                    <li key={marker.time ?? index} className="song-derived-marker-item">
                      <button
                        type="button"
                        className="song-derived-marker-seek"
                        onClick={() => {
                          if (ytRef.current && ytRef.current.handleSeek) {
                            ytRef.current.handleSeek(marker.time);
                          }
                        }}
                        disabled={!normalizedYoutubeId}
                        title={normalizedYoutubeId ? 'Lompat ke waktu ini di video' : 'Tambahkan YouTube untuk seek'}
                      >
                        ▶
                      </button>
                      <code className="song-derived-marker-time">{formatDuration(marker.time)}</code>
                      <span className="song-derived-marker-label">{marker.label || 'Tanpa label'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="song-derived-empty">
                  Belum ada marker. Tulis <code>[01:23]</code> atau <code>[1:02:03]</code> di dalam editor lirik,
                  dan marker akan muncul di sini otomatis.
                </div>
              )}
            </SongFormSection>


          </div>

          {/* ---------- Sidebar: kelengkapan & struktur ---------- */}
          <aside className="song-editor-sidebar">
            <div className="song-editor-sidebar-card">
              <div className="song-completeness-head">
                <span className="song-completeness-title">Kelengkapan Data</span>
                <span className={`song-completeness-score level-${completenessScoreLevel(completeness.score)}`}>
                  {completeness.score}%
                </span>
              </div>
              <div className="song-completeness-bar">
                <div
                  className={`song-completeness-bar-fill level-${completenessScoreLevel(completeness.score)}`}
                  style={{ width: `${completeness.score}%` }}
                />
              </div>
              {completeness.missing.length > 0 ? (
                <ul className="song-completeness-list">
                  {completeness.missing.map((item) => (
                    <li key={item} className="song-completeness-item">
                      <span className="song-completeness-dot" aria-hidden="true">○</span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="song-completeness-done">✓ Semua data penting sudah lengkap</p>
              )}
            </div>

            <div className="song-editor-sidebar-card">
              <div className="song-completeness-head">
                <span className="song-completeness-title">Struktur Lagu</span>
                <span className="song-form-section-badge">{sectionOverview.length}</span>
              </div>
              {sectionOverview.length > 0 ? (
                <ol className="song-section-nav-list">
                  {sectionOverview.map((section) => (
                    <li key={section.key}>
                      <button
                        type="button"
                        className="song-section-nav-item"
                        onClick={() => handleJumpToSection(section.lineIndex)}
                        title={`Lompat ke baris ${section.lineNumber}`}
                      >
                        <span className="song-section-nav-label">{section.label}</span>
                        <span className="song-section-nav-line">L{section.lineNumber}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="song-derived-empty">
                  Belum ada tag bagian. Gunakan tombol Section Builder di editor lirik,
                  atau tombol <b>Tag Bagian</b> untuk mendeteksi otomatis.
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="song-editor-actionbar">
          <div className="song-editor-actionbar-status">
            {loading ? (
              <span className="song-editor-status is-saving">⏳ Menyimpan…</span>
            ) : hasUnsavedChanges ? (
              <span className="song-editor-status is-dirty">● Ada perubahan belum disimpan</span>
            ) : (
              <span className="song-editor-status is-clean">✓ Tersimpan</span>
            )}
            <span className="song-editor-status-hint"><kbd>Ctrl</kbd>+<kbd>S</kbd> simpan</span>
          </div>
          <div className="song-editor-actionbar-buttons">
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Batal
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading
                ? "⏳ Menyimpan..."
                : isEditMode
                  ? "💾 Simpan Perubahan"
                  : newVersionMode
                    ? "🧬 Simpan Versi Baru"
                    : "➕ Tambah Lagu"}
            </button>
          </div>
        </div>
      </form>

      {/* Virtual Piano Popup */}
      <VirtualPiano
        isOpen={showLyricsPiano}
        onClose={() => setShowLyricsPiano(false)}
        onKeySelect={handleLyricsPianoKeySelect}
        helperText={insertNotesToLyrics ? `Klik not untuk menyisipkan ${insertNoteFormat === 'plain' ? 'not' : insertNoteFormat === 'number' ? `angka (key ${insertNumberKeySignature || getNumericNotationKey(songKey || 'C')})` : 'chord'} ke lirik${insertTrailingSpace ? ' + spasi' : ''}` : 'Klik not untuk mendengar nada tanpa insert ke lirik'}
      />

      <FloatingYouTubePlayer
        isOpen={showFloatingYouTubePlayer}
        videoId={normalizedYoutubeId}
        youtubeRef={ytRef}
        title="YouTube Floating"
        timeMarkers={timeMarkers}
        readonlyTimeMarkers={true}
        onTimeUpdate={(t, d) => {
          setYtCurrentTime(t);
          if (typeof d === "number") setYtDuration(d);
        }}
        onClose={() => {
          if (ytRef.current && typeof ytRef.current.handlePause === 'function') {
            ytRef.current.handlePause();
          }
          setShowFloatingYouTubePlayer(false);
        }}
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
