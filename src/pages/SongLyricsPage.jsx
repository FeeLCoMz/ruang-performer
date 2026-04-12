import React, { useState, useEffect, useRef } from 'react';
import '../styles/karaoke.css';
import AutoScrollBar from '../components/AutoScrollBar.jsx';
import { useParams } from 'react-router-dom';
import { getAuthHeader } from '../utils/auth.js';
import { isChordLine, parseSection, splitSectionLabelWithChords } from '../utils/chordUtils.js';
import KaraokeSongSearch from '../components/KaraokeSongSearch.jsx';
import * as apiClient from '../apiClient.js';

// SongLyricsPage: Penampil lirik fullscreen untuk penyanyi/karaoke
export default function SongLyricsPage() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(true);

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
      {/* KaraokeSongSearch di paling atas */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <KaraokeSongSearch songs={songs} />
      </div>
      <div className="karaoke-header">
        <div className="karaoke-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <span
              role="img"
              aria-label="music"
              style={{ fontSize: '2.2rem' }}
            >
              🎵
            </span>
            <span className="karaoke-song-title" style={{ fontWeight: 'bold', fontSize: '2rem' }}>
              {song.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span
              role="img"
              aria-label="artist"
              style={{ fontSize: '1.5rem' }}
            >
              👤
            </span>
            <span className="karaoke-song-artist" style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
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
            const isSection = section && section.type === 'structure';
            return (
              <div
                key={idx}
                className={
                  'karaoke-line' +
                  (isSection ? ' karaoke-section' : '')
                }
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
