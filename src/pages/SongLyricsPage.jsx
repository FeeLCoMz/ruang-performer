import React, { useState, useEffect, useRef } from 'react';
import '../styles/karaoke.css';
import AutoScrollBar from '../components/AutoScrollBar.jsx';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getAuthHeader } from '../utils/auth.js';
import { isChordLine, isMetadataLine, parseInstrumentPatchLine, parseSection, splitSectionLabelWithChords } from '../utils/chordUtils.js';
import KaraokeSongSearch from '../components/KaraokeSongSearch.jsx';
import * as apiClient from '../apiClient.js';

// SongLyricsPage: Penampil lirik fullscreen untuk penyanyi/karaoke
export default function SongLyricsPage() {
  const { id } = useParams();
  const location = useLocation();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [setlistContext, setSetlistContext] = useState(null);

  const queryParams = new URLSearchParams(location.search || '');
  const setlistId = queryParams.get('setlistId') || location.state?.setlistId || null;

  const initialSetlistSongIds = Array.isArray(location.state?.setlistSongIds)
    ? location.state.setlistSongIds.filter(Boolean)
    : [];

  // Fetch song data by ID
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/songs/${id}`, { headers: getAuthHeader() })
      .then(res => res.ok ? res.json() : Promise.reject('Gagal memuat lagu'))
      .then(data => {
        setSong(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [id]);

  // Fetch all songs for search
  useEffect(() => {
    apiClient.fetchSongs()
      .then(data => {
        setSongs(Array.isArray(data) ? data : []);
        setLoadingSongs(false);
      })
      .catch(() => setLoadingSongs(false));
  }, []);

  useEffect(() => {
    if (!setlistId) {
      if (initialSetlistSongIds.length > 0) {
        setSetlistContext({
          id: null,
          name: location.state?.setlistName || '',
          songs: initialSetlistSongIds,
        });
      } else {
        setSetlistContext(null);
      }
      return;
    }

    if (initialSetlistSongIds.length > 0) {
      setSetlistContext({
        id: setlistId,
        name: location.state?.setlistName || '',
        songs: initialSetlistSongIds,
      });
    }

    fetch(`/api/setlists/${setlistId}`, { headers: getAuthHeader() })
      .then((res) => res.ok ? res.json() : Promise.reject('Gagal memuat setlist'))
      .then((data) => {
        setSetlistContext({
          id: setlistId,
          name: data?.name || location.state?.setlistName || '',
          songs: Array.isArray(data?.songs) ? data.songs.filter(Boolean) : initialSetlistSongIds,
        });
      })
      .catch(() => {
        if (initialSetlistSongIds.length > 0) {
          setSetlistContext((prev) => prev || {
            id: setlistId,
            name: location.state?.setlistName || '',
            songs: initialSetlistSongIds,
          });
        }
      });
  }, [setlistId, location.state?.setlistName, initialSetlistSongIds]);

  const setlistSongIds = Array.isArray(setlistContext?.songs) ? setlistContext.songs : [];
  const currentSongIndex = setlistSongIds.findIndex((songId) => String(songId) === String(id));
  const hasSetlistNavigation = Boolean(setlistId && setlistSongIds.length > 0 && currentSongIndex >= 0);
  const prevSongId = hasSetlistNavigation && currentSongIndex > 0 ? setlistSongIds[currentSongIndex - 1] : null;
  const nextSongId = hasSetlistNavigation && currentSongIndex < setlistSongIds.length - 1 ? setlistSongIds[currentSongIndex + 1] : null;

  function buildSetlistSongLink(targetSongId) {
    if (!targetSongId || !setlistId) return null;
    return {
      to: `/karaoke/${targetSongId}?setlistId=${encodeURIComponent(setlistId)}`,
      state: {
        ...(location.state || {}),
        setlistId,
        setlistName: setlistContext?.name || location.state?.setlistName || '',
        setlistSongIds,
        fromSetlist: true,
      },
    };
  }

  // Ref untuk root halaman
  const pageScrollRef = useRef(null);
  // Split lyrics into lines
  const lyricLines = song && song.lyrics ? song.lyrics.split(/\r?\n/).flatMap((line) => {
    const sectionChunks = splitSectionLabelWithChords(line);
    return sectionChunks || [line];
  }) : [];
  // Sembunyikan baris chord (hanya tampilkan lirik dan struktur)
  const lyricOnlyLines = lyricLines.filter(line => !isChordLine(line));
  // Render loading/error/null after all hooks
  if (loading) return <div className="page-container"><div className="card">Memuat lirik...</div></div>;
  if (error) return <div className="page-container"><div className="card">{error}</div></div>;
  if (!song) return null;

  return (
    <div className="karaoke-lyrics-page" ref={pageScrollRef}>
      {setlistId && (
        <div className="karaoke-setlist-nav">
          <Link
            className="btn btn-secondary"
            to={`/setlists/${setlistId}`}
            title="Kembali ke setlist aktif"
          >
            ← Kembali ke Setlist
          </Link>

          {hasSetlistNavigation && (
            <>
              {prevSongId ? (
                <Link
                  className="btn btn-secondary"
                  to={buildSetlistSongLink(prevSongId).to}
                  state={buildSetlistSongLink(prevSongId).state}
                  title="Lagu sebelumnya"
                >
                  ⏮ Prev
                </Link>
              ) : (
                <button
                  className="btn btn-secondary disabled"
                  disabled
                  title="Lagu sebelumnya"
                >
                  ⏮ Prev
                </button>
              )}
              <div className="karaoke-setlist-nav-info">
                {setlistContext?.name ? `${setlistContext.name} • ` : ''}
                Lagu {currentSongIndex + 1} / {setlistSongIds.length}
              </div>
              {nextSongId ? (
                <Link
                  className="btn btn-secondary"
                  to={buildSetlistSongLink(nextSongId).to}
                  state={buildSetlistSongLink(nextSongId).state}
                  title="Lagu selanjutnya"
                >
                  Next ⏭
                </Link>
              ) : (
                <button
                  className="btn btn-secondary disabled"
                  disabled
                  title="Lagu selanjutnya"
                >
                  Next ⏭
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* KaraokeSongSearch di paling atas */}
      <div className="karaoke-search-wrap">
        <KaraokeSongSearch
          songs={songs}
          setlistId={setlistId}
          setlistName={setlistContext?.name || location.state?.setlistName || ''}
          setlistSongIds={setlistSongIds}
        />
      </div>
      <div className="karaoke-header">
        <div className="karaoke-card">
          <div className="karaoke-title-row">
            <span
              role="img"
              aria-label="music"
              className="karaoke-title-icon"
            >
              🎵
            </span>
            <span className="karaoke-song-title karaoke-song-title-hero">
              {song.title}
            </span>
          </div>
          <div className="karaoke-artist-row">
            <span
              role="img"
              aria-label="artist"
              className="karaoke-artist-icon"
            >
              👤
            </span>
            <span className="karaoke-song-artist karaoke-song-artist-hero">
              {song.artist}
            </span>
          </div>
        </div>
      </div>
      <div className="karaoke-lyrics-container">
        <AutoScrollBar tempo={120} lyricsDisplayRef={pageScrollRef} />
        <div className="karaoke-lyrics-text">
          {lyricOnlyLines.map((line, idx) => {
            const section = parseSection(line);
            const patchLine = parseInstrumentPatchLine(line);
            const sectionType = section?.type || '';
            const isSection = sectionType === 'structure';
            const isInstrument = sectionType === 'instrument' || Boolean(patchLine);
            const isModulation = sectionType === 'modulation';
            const isMetadata = isMetadataLine(line) && !patchLine;
            const displayText = section
              ? section.label
              : patchLine
                ? Object.entries(patchLine.fields)
                    .map(([key, value]) => `${key.charAt(0).toUpperCase()}${key.slice(1)}: ${value}`)
                    .join(' | ')
                : line;
            return (
              <div
                key={idx}
                className={
                  'karaoke-line' +
                  (isSection ? ' karaoke-section' : '') +
                  (isInstrument ? ' karaoke-instrument' : '') +
                  (isModulation ? ' karaoke-modulation' : '') +
                  (isMetadata ? ' karaoke-metadata' : '')
                }
              >
                {displayText}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
