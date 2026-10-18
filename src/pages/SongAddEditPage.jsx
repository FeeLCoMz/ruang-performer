import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// import { usePermission } from "../hooks/usePermission.js";
// import { PERMISSIONS } from "../utils/permissionUtils.js";
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TapTempo from '../components/TapTempo';
import VirtualPiano from '../components/VirtualPiano';
import AIAutofillModal from '../components/AIAutofillModal';
import SongLyricsEditorPanel from '../components/SongLyricsEditorPanel.jsx';
import SongStudioTopbar from '../components/SongStudioTopbar.jsx';
import SongMediaPanel from '../components/SongMediaPanel.jsx';
import { getAuthHeader } from '../utils/auth';
import { extractYouTubeId } from '../utils/youtubeUtils';
import {
  alignSelectedBarlines,
  wrapBarsPerLine,
  mergeDetectedTimestampsIntoMarkers,
} from '../utils/chordUtils.js';
import { getNumericNotationKey } from '../utils/notationUtils.js';
import {
  buildInsertNoteToken,
  formatWholeLyricsDocument,
  replaceSelectionWithToken,
  transposeLyricsText,
} from '../utils/lyricsEditorUtils.js';
import { buildAddEditEditorActions } from '../utils/editorActionsUtils.js';
import {
  analyseLyrics,
  computeSongCompleteness,
  extractSectionOverview,
  validateMusicalFields,
} from '../utils/songFormUtils.js';
import {
  GENRE_OPTIONS,
  NUMBER_NOTATION_KEY_OPTIONS,
  SONG_KEY_OPTIONS,
  TIME_SIGNATURE_OPTIONS,
} from '../utils/songOptions.js';

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

function buildNewVersionTitle(sourceTitle) {
  const baseTitle = (sourceTitle || '').trim() || 'Tanpa Judul';
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
  const [sheetMusicXml, setSheetMusicXml] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [songKey, setSongKey] = useState('C');
  const [tempo, setTempo] = useState('');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [genre, setGenre] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [keyboardPatch, setKeyboardPatch] = useState('');
  const [timeMarkers, setTimeMarkers] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiConfirmFields, setAiConfirmFields] = useState({});
  const [showLyricsPiano, setShowLyricsPiano] = useState(false);
  const [insertNotesToLyrics, setInsertNotesToLyrics] = useState(false);
  const [insertNoteFormat, setInsertNoteFormat] = useState('number');
  const [insertNumberKeySignature, setInsertNumberKeySignature] = useState(() =>
    getNumericNotationKey('C'),
  );
  const [insertTrailingSpace, setInsertTrailingSpace] = useState(true);
  const [barsPerLine, setBarsPerLine] = useState(4);
  const [lyricsEditError, setLyricsEditError] = useState('');

  // Single source of truth for video playback, shared by the practice panel and
  // the timestamp buttons inside the lyrics preview.
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);

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
  const [copyFeedback, setCopyFeedback] = useState('');

  // YouTube ref
  const ytRef = useRef(null);
  const formRef = useRef(null);
  const lyricsTextareaRef = useRef(null);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const normalizedYoutubeId = extractYouTubeId(youtubeId);

  // Poll the player so the play/pause icon always reflects reality instead of a
  // guess that drifts (which made the preview button seek when it should pause).
  // Declared after normalizedYoutubeId: referencing it earlier put the value in
  // its temporal dead zone and crashed the whole page on mount.
  useEffect(() => {
    if (!normalizedYoutubeId) {
      setIsYoutubePlaying(false);
      return undefined;
    }

    const interval = setInterval(() => {
      const player = ytRef.current;
      if (!player || typeof player.getPlayerState !== 'function') return;
      setIsYoutubePlaying(player.getPlayerState() === 1);
    }, 500);

    return () => clearInterval(interval);
  }, [normalizedYoutubeId]);

  const areMarkersEqual = (first = [], second = []) =>
    JSON.stringify(first) === JSON.stringify(second);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const textarea = lyricsTextareaRef.current;
      if (!textarea || document.activeElement !== textarea) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleAlignSelectedBarlines();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '4') {
        e.preventDefault();
        handleWrap4BarsPerLine();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyrics, barsPerLine]);

  // Load source song for edit or duplicate mode
  useEffect(() => {
    if (id) {
      setLoadingData(true);
      setError('');
      fetch(`/api/songs/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Gagal memuat data lagu');
          return res.json();
        })
        .then((data) => {
          setTitle(newVersionMode ? buildNewVersionTitle(data.title) : data.title || '');
          setArtist(data.artist || '');
          setSongKey(data.key || '');
          setInsertNumberKeySignature(getNumericNotationKey(data.key || 'C'));
          setTempo(data.tempo || '');
          setTimeSignature(data.time_signature || '4/4');
          setGenre(data.genre || '');
          setLyrics(data.lyrics || '');
          setYoutubeId(extractYouTubeId(data.youtubeId || data.youtube_url || ''));
          setKeyboardPatch(
            Array.isArray(data.keyboardPatch)
              ? data.keyboardPatch.join(', ')
              : data.keyboardPatch || '',
          );
          setTimeMarkers(data.time_markers || []);
          setSheetMusicXml(data.sheetMusicXml || '');
          setLoadingData(false);

          // Establish the dirty-tracking baseline from the freshly loaded server data.
          setSavedBaseline(
            JSON.stringify({
              title: (data.title || '').trim(),
              artist: (data.artist || '').trim(),
              key: data.key || '',
              tempo: data.tempo || '',
              timeSignature: data.time_signature || '4/4',
              genre: (data.genre || '').trim(),
              lyrics: (data.lyrics || '').trim(),
              youtubeId: extractYouTubeId(data.youtubeId || data.youtube_url || ''),
              keyboardPatch: (Array.isArray(data.keyboardPatch)
                ? data.keyboardPatch.join(', ')
                : data.keyboardPatch || ''
              ).trim(),
              sheetMusicXml: data.sheetMusicXml || '',
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

  const handleAIAutofill = async () => {
    if (!title.trim()) {
      setError('Isi judul lagu terlebih dahulu untuk AI autofill');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/song-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
        }),
      });

      if (!res.ok) throw new Error('Gagal mendapatkan data AI');

      const data = await res.json();
      setAiResult(data);
      setAiConfirmFields({
        artist: !!data.artist,
        key: !!data.key,
        tempo: !!data.tempo,
        genre: !!data.genre,
        youtubeId: !!data.youtubeId,
        keyboardPatch: !!data.keyboardPatch,
      });
      setShowAiModal(true);
    } catch (err) {
      setError(err.message || 'Gagal autofill AI');
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
    if (aiConfirmFields.keyboardPatch && aiResult.keyboardPatch)
      setKeyboardPatch(
        Array.isArray(aiResult.keyboardPatch)
          ? aiResult.keyboardPatch.join(', ')
          : aiResult.keyboardPatch,
      );
    setShowAiModal(false);
    setAiResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Judul lagu wajib diisi');
      return;
    }

    // Block submit on invalid musical fields rather than storing bad data.
    if (hasFieldErrors) {
      setError('Periksa kembali Key, Tempo, dan Time Signature.');
      setOpenSections((prev) => ({ ...prev, musical: true }));
      return;
    }

    setLoading(true);
    setError('');

    const mergedMarkers = mergeDetectedTimestampsIntoMarkers(lyrics.trim(), timeMarkers);

    const payload = {
      title: title.trim(),
      artist: artist.trim(),
      key: songKey,
      tempo: tempo ? parseInt(tempo) : null,
      time_signature: timeSignature || '4/4',
      genre: genre.trim(),
      lyrics: lyrics.trim(),
      youtubeId: extractYouTubeId(youtubeId),
      keyboardPatch: keyboardPatch.trim(),
      time_markers: mergedMarkers,
      sheetMusicXml: sheetMusicXml,
    };

    try {
      const url = isEditMode ? `/api/songs/${id}` : '/api/songs';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan lagu');
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
        navigate(location.state?.from || '/songs');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel handler
  const handleCancel = () => {
    if (!confirmDiscardChanges()) return;
    if (isEditMode) {
      navigate(`/songs/view/${id}`);
    } else {
      navigate(location.state?.from || '/songs');
    }
  };

  const handleAlignSelectedBarlines = () => {
    const textarea = lyricsTextareaRef.current;
    if (
      !textarea ||
      typeof textarea.selectionStart !== 'number' ||
      typeof textarea.selectionEnd !== 'number'
    ) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    if (selectionStart === selectionEnd) {
      setLyricsEditError('Blok teks lirik terlebih dahulu.');
      return;
    }

    const selectedText = lyrics.slice(selectionStart, selectionEnd);
    const alignedText = alignSelectedBarlines(selectedText);
    if (alignedText === selectedText) {
      setLyricsEditError('');
      return;
    }

    const nextLyrics = `${lyrics.slice(0, selectionStart)}${alignedText}${lyrics.slice(selectionEnd)}`;
    setLyrics(nextLyrics);
    setLyricsEditError('');

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionStart + alignedText.length);
    });
  };

  const handleWrapBarsPerLine = (targetBarsPerLine = barsPerLine) => {
    const textarea = lyricsTextareaRef.current;
    if (!textarea) return;

    const hasSelection =
      typeof textarea.selectionStart === 'number' &&
      typeof textarea.selectionEnd === 'number' &&
      textarea.selectionStart !== textarea.selectionEnd;

    if (!hasSelection) {
      setLyricsEditError('Blok teks lirik terlebih dahulu.');
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = lyrics.slice(selectionStart, selectionEnd);
    if (!selectedText) return;

    const wrappedText = wrapBarsPerLine(selectedText, targetBarsPerLine);
    const alignedText = alignSelectedBarlines(wrappedText);
    if (alignedText === selectedText) {
      setLyricsEditError('');
      return;
    }

    const nextLyrics = `${lyrics.slice(0, selectionStart)}${alignedText}${lyrics.slice(selectionEnd)}`;
    setLyrics(nextLyrics);
    setLyricsEditError('');

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

    setLyrics(
      (prev) =>
        replaceSelectionWithToken({
          text: prev,
          selectionStart,
          selectionEnd,
          token,
        }).nextText,
    );

    requestAnimationFrame(() => {
      if (
        !textarea ||
        typeof textarea.selectionStart !== 'number' ||
        typeof textarea.selectionEnd !== 'number'
      ) {
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
      keyboardPatch: keyboardPatch.trim(),
      sheetMusicXml,
    }),
    [
      title,
      artist,
      songKey,
      tempo,
      timeSignature,
      genre,
      lyrics,
      youtubeId,
      keyboardPatch,
      sheetMusicXml,
    ],
  );

  const completeness = useMemo(
    () => computeSongCompleteness({ ...formSnapshot, lyrics }, lyricsAnalysis),
    [formSnapshot, lyrics, lyricsAnalysis],
  );

  const serializedForm = useMemo(() => JSON.stringify(formSnapshot), [formSnapshot]);
  const hasUnsavedChanges = savedBaseline === null ? false : serializedForm !== savedBaseline;

  // Inline field validation so the user sees problems while typing instead of
  // only on submit (the previous behaviour accepted e.g. key "H" silently).
  const fieldErrors = useMemo(
    () => validateMusicalFields({ key: songKey, timeSignature, tempo }),
    [songKey, timeSignature, tempo],
  );
  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);

  // Keep the latest dirty flag reachable from handlers defined earlier
  // (handleCancel) and from window listeners without re-registering them.
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;

  /** Returns true when it is safe to leave the page, asking first if needed. */
  const confirmDiscardChanges = useCallback(() => {
    if (!hasUnsavedChangesRef.current) return true;
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
    return window.confirm('Ada perubahan yang belum disimpan. Keluar tanpa menyimpan?');
  }, []);

  // Warn on browser refresh/close while there are unsaved edits.
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChangesRef.current) return undefined;
      event.preventDefault();
      // Legacy browsers require returnValue to be set.
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Step navigator: reveal the target section, then scroll its header into view.
   * Opening first matters because a collapsed section has no rendered body to
   * scroll to.
   */
  const jumpToSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: true }));

    requestAnimationFrame(() => {
      const header = document.getElementById(`song-${key}-header`);
      const target = header?.closest('.song-form-section') || header;
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      // Move focus for keyboard users without stealing the caret from the editor.
      header?.focus?.({ preventScroll: true });
    });
  };

  const handleQuickTranspose = (steps) => {
    setLyrics((prev) => transposeLyricsText(prev, steps));
  };

  const handleCopyLyrics = async () => {
    if (!lyrics.trim()) {
      setCopyFeedback('Lirik masih kosong');
      setTimeout(() => setCopyFeedback(''), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopyFeedback('Lirik disalin');
    } catch {
      setCopyFeedback('Gagal menyalin');
    }
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  /** Play/pause from the lyrics preview, targeting the single player. */
  const handleToggleYoutubePlay = () => {
    const player = ytRef.current;
    if (!player) return;
    if (typeof player.handleTogglePlayPause === 'function') {
      player.handleTogglePlayPause();
      // Reflect the intent immediately; the poll corrects it if it disagrees.
      setIsYoutubePlaying((prev) => !prev);
    }
  };

  const handlePreviewSeek = (seconds) => {
    const player = ytRef.current;
    if (player && typeof player.handleSeek === 'function') {
      player.handleSeek(seconds);
      setIsYoutubePlaying(true);
    }
  };

  const handlePreviewPause = () => {
    const player = ytRef.current;
    if (player && typeof player.handlePause === 'function') {
      player.handlePause();
      setIsYoutubePlaying(false);
    }
  };

  const handleJumpToSection = (lineIndex) => {
    if (!view?.dispatch || !view?.state) return;
    const targetLine = Math.min((lineIndex ?? 0) + 1, view.state.doc.lines);
    const line = view.state.doc.line(targetLine);
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  };

  // Insert settings rendered inside the Virtual Piano modal, so configuring the
  // insert format happens where the notes are actually being entered.
  const pianoInsertControls = (
    <>
      <button
        type="button"
        className={`btn ${insertNotesToLyrics ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setInsertNotesToLyrics((prev) => !prev)}
        aria-pressed={insertNotesToLyrics}
        title="Tentukan apakah klik not disisipkan ke lirik atau hanya dibunyikan"
      >
        ✍ Insert {insertNotesToLyrics ? 'ON' : 'OFF'}
      </button>

      {insertNotesToLyrics && (
        <>
          <label className="song-lyrics-insert-format" htmlFor="lyrics-insert-format-select">
            Format
            <select
              id="lyrics-insert-format-select"
              className="song-lyrics-bar-wrap-select"
              value={insertNoteFormat}
              onChange={(e) => setInsertNoteFormat(e.target.value)}
            >
              <option value="bracket">[C]</option>
              <option value="plain">C</option>
              <option value="number">1-7</option>
            </select>
          </label>

          {insertNoteFormat === 'number' && (
            <label className="song-lyrics-insert-key" htmlFor="lyrics-insert-key-select">
              Key
              <select
                id="lyrics-insert-key-select"
                className="song-lyrics-bar-wrap-select"
                value={insertNumberKeySignature || getNumericNotationKey(songKey || 'C')}
                onChange={(e) => setInsertNumberKeySignature(e.target.value)}
                aria-label="Pilih key untuk angka chord"
              >
                {NUMBER_NOTATION_KEY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className={`btn ${insertTrailingSpace ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setInsertTrailingSpace((prev) => !prev)}
            aria-pressed={insertTrailingSpace}
            title="Tambahkan spasi otomatis setelah not yang disisipkan"
          >
            ␠ Spasi {insertTrailingSpace ? 'ON' : 'OFF'}
          </button>
        </>
      )}
    </>
  );

  /**
   * The studio arrangement: a sticky command bar, then two columns — the media
   * player on the left, and ONE editor workspace on the right that carries every
   * editable fact: song metadata, the lyrics/chord editor, and the extra info.
   * Keeping them in a single panel means the user never leaves the editor to
   * change a field that belongs to the same song.
   */
  const statusText = loading
    ? 'Menyimpan…'
    : hasUnsavedChanges
      ? 'Ada perubahan belum disimpan'
      : 'Tersimpan';

  const studioLayout = (
    <div className="studio-shell">
      <SongStudioTopbar
        modeLabel={
          isEditMode ? 'EDITOR LIRIK & CHORD' : newVersionMode ? 'VERSI BARU' : 'LAGU BARU'
        }
        eyebrowIcon={isEditMode ? '📝' : newVersionMode ? '🧬' : '➕'}
        title={
          title.trim() ||
          (isEditMode ? 'Edit Lagu' : newVersionMode ? 'Buat Versi Baru' : 'Tambah Lagu Baru')
        }
        isEditMode={isEditMode}
        newVersionMode={newVersionMode}
        loading={loading}
        hasFieldErrors={hasFieldErrors}
        hasUnsavedChanges={hasUnsavedChanges}
        statusText={statusText}
        onCancel={handleCancel}
        onFixFields={() => jumpToSection('musical')}
      />

      {newVersionMode && (
        <div className="studio-note">
          <span aria-hidden="true">🧬</span>
          Form ini membuat versi baru dari lagu yang sudah ada. Ubah judul, aransemen, atau detail
          lain seperlunya sebelum menyimpan.
        </div>
      )}

      {error && (
        <div className="error-message studio-error" role="alert">
          {error}
        </div>
      )}

      <div className="studio-columns">
        {/* INFORMASI UTAMA — the song's identity, full width above the split.
              Wide screens read as three columns: Judul | Artis | Genre, then
              Nada Dasar | Tempo | Time Signature. The long fields (YouTube,
              patch, score) span the full row so they never squeeze the grid. */}
        <div className="studio-editor-section studio-editor-info studio-info-full">
          <div className="studio-card-head">
            <span className="studio-card-title">INFORMASI UTAMA</span>
            <button
              type="button"
              onClick={handleAIAutofill}
              disabled={aiLoading}
              className="btn btn-secondary song-ai-autofill-btn"
              title="Isi otomatis data lagu dari AI (judul wajib diisi)"
            >
              🤖 {aiLoading ? 'Mencari…' : 'AI Autofill'}
            </button>
          </div>

          <div className="studio-fields">
              <label className="studio-field">
                <span className="studio-field-label">
                  Judul Lagu <span className="required-asterisk">*</span>
                </span>
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
              </label>

              <label className="studio-field">
                <span className="studio-field-label">Artis / Band</span>
                <input
                  id="song-artist"
                  name="artist"
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Nama artist atau band"
                  className="form-input-field"
                />
              </label>

              <label className="studio-field">
                <span className="studio-field-label">Genre / Mood</span>
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
              </label>

              <label className="studio-field">
                <span className="studio-field-label">Nada Dasar (Key)</span>
                <select
                  id="song-key"
                  name="key"
                  className={`form-input-field${fieldErrors.key ? ' field-has-error' : ''}`}
                  value={songKey}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    setSongKey(nextKey);
                    setInsertNumberKeySignature(getNumericNotationKey(nextKey || 'C'));
                  }}
                  aria-invalid={Boolean(fieldErrors.key)}
                >
                  <option value="">— pilih key —</option>
                  {SONG_KEY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors.key && <span className="song-field-error">{fieldErrors.key}</span>}
              </label>

              <label className="studio-field">
                <span className="studio-field-label">BPM / Tempo</span>
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
                    className={`form-input-field${fieldErrors.tempo ? ' field-has-error' : ''}`}
                    aria-invalid={Boolean(fieldErrors.tempo)}
                  />
                  <TapTempo onTempo={setTempo} initialTempo={tempo} label="Tap" />
                </div>
                {fieldErrors.tempo && <span className="song-field-error">{fieldErrors.tempo}</span>}
              </label>

              <label className="studio-field">
                <span className="studio-field-label">Time Signature</span>
                <select
                  id="song-time-signature"
                  name="time_signature"
                  className={`form-input-field${fieldErrors.timeSignature ? ' field-has-error' : ''}`}
                  value={timeSignature}
                  onChange={(e) => setTimeSignature(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.timeSignature)}
                >
                  {TIME_SIGNATURE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors.timeSignature && (
                  <span className="song-field-error">{fieldErrors.timeSignature}</span>
                )}
              </label>

              <label className="studio-field studio-field-span">
                <span className="studio-field-label">YouTube URL atau ID</span>
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
                  <span className="form-hint">
                    Video terdeteksi: <code>{normalizedYoutubeId}</code>
                  </span>
                )}
              </label>

              <label className="studio-field studio-field-span">
                <span className="studio-field-label">🎹 Keyboard Patch</span>
                <textarea
                  id="song-keyboard-patch"
                  name="keyboardPatch"
                  value={keyboardPatch}
                  onChange={(e) => setKeyboardPatch(e.target.value)}
                  placeholder="Contoh: EP Mark I untuk verse, Pad + Strings untuk chorus"
                  rows={2}
                  className="form-input-field studio-field-compact"
                />
              </label>

              <label className="studio-field studio-field-span">
                <span className="studio-field-label">Partitur (MusicXML)</span>
                <textarea
                  id="song-sheet-music"
                  name="sheetMusicXml"
                  value={sheetMusicXml}
                  onChange={(e) => setSheetMusicXml(e.target.value)}
                  placeholder="Paste MusicXML di sini..."
                  rows={3}
                  className="form-input-field song-sheetmusic-textarea studio-field-compact"
                />
              </label>
            </div>
        </div>

        <div className="studio-editor">
          <div className="studio-panel-head">
            <span className="studio-panel-title">🎤 Editor Lirik &amp; Chord</span>
          </div>

          <SongLyricsEditorPanel
            lyricsRef={lyricsTextareaRef}
            lyricsValue={lyrics}
            setLyricsValue={setLyrics}
            error={lyricsEditError}
            disabled={loading}
            editorActions={buildAddEditEditorActions({
              onOpenPiano: () => setShowLyricsPiano(true),
              insertNotesToLyrics,
              onToggleInsertNotes: () => setInsertNotesToLyrics((prev) => !prev),
              pianoOpen: showLyricsPiano,
              onTranspose: handleQuickTranspose,
              onCopyLyrics: handleCopyLyrics,
              copyFeedback,
            })}
            autoFocus={false}
            previewSong={{ key: songKey, tempo, lyrics }}
            previewProps={{
              showChords: true,
              keySignature: songKey || 'C',
              isPlaying: isYoutubePlaying,
              onTimestampClick: handlePreviewSeek,
              onTimestampPause: handlePreviewPause,
            }}
          />
        </div>

        <SongMediaPanel
          youtubeId={normalizedYoutubeId}
          youtubeRef={ytRef}
          timeMarkers={timeMarkers}
          secondsToLabel={formatDuration}
          isPlaying={isYoutubePlaying}
          onTogglePlay={handleToggleYoutubePlay}
          onSeek={handlePreviewSeek}
          onUpdateMarkers={setTimeMarkers}
          currentTime={ytCurrentTime}
          duration={ytDuration}
          getCurrentYouTubeTime={() =>
            typeof ytRef.current?.currentTime === 'number' ? ytRef.current.currentTime : 0
          }
          onTimeUpdate={(t, d) => {
            // Simpan posisi pemutaran agar tombol «5s / 5s» dan label waktu
            // menghitung dari posisi yang benar, bukan selalu dari 0.
            if (typeof t === 'number' && Number.isFinite(t)) setYtCurrentTime(t);
            if (typeof d === 'number' && Number.isFinite(d)) setYtDuration(d);
          }}
        />
      </div>
    </div>
  );

  if (loadingData) {
    return (
      <div className="page-container">
        <div className="song-editor-hero" data-mode={newVersionMode ? 'version' : 'loading'}>
          <div className="song-editor-hero-main">
            <span className="song-editor-hero-eyebrow">
              {newVersionMode ? '🧬 Versi Baru' : '⏳ Memuat'}
            </span>
            <h1 className="song-editor-hero-title">
              {newVersionMode ? 'Buat Versi Baru Lagu' : 'Memuat Lagu…'}
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const editorMode = isEditMode ? 'edit' : newVersionMode ? 'version' : 'create';

  // The studio arrangement is the only layout. The stepped flow was removed at
  // the user's request: maintaining two arrangements of the same form split
  // every change across both, and the studio view already covers the phone
  // case (the columns simply stack).
  return (
    <div className="page-container">
      <form ref={formRef} onSubmit={handleSubmit} className="studio-form">
        {studioLayout}
      </form>

      <VirtualPiano
        isOpen={showLyricsPiano}
        onClose={() => setShowLyricsPiano(false)}
        onKeySelect={handleLyricsPianoKeySelect}
        helperText={
          insertNotesToLyrics
            ? `Klik not untuk menyisipkan ${insertNoteFormat === 'plain' ? 'not' : insertNoteFormat === 'number' ? `angka (key ${insertNumberKeySignature || getNumericNotationKey(songKey || 'C')})` : 'chord'} ke lirik${insertTrailingSpace ? ' + spasi' : ''}`
            : 'Klik not untuk mendengar nada tanpa insert ke lirik'
        }
        insertControls={pianoInsertControls}
      />

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
