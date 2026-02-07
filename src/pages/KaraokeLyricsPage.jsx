import React, { useState, useEffect, useRef } from 'react';
import '../styles/karaoke.css';
import AutoScrollBar from '../components/AutoScrollBar.jsx';
import { useParams } from 'react-router-dom';
import { getAuthHeader } from '../utils/auth.js';
import { parseChordLine, parseSection } from '../utils/chordUtils.js';

// KaraokeLyricsPage: Penampil lirik fullscreen untuk penyanyi/karaoke
export default function KaraokeLyricsPage() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  

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

  // Split lyrics into lines
  const lyricLines = song && song.lyrics ? song.lyrics.split(/\r?\n/) : [];
  // Sembunyikan baris chord (hanya tampilkan lirik dan struktur)
  const lyricOnlyLines = lyricLines.filter(line => !parseChordLine(line));





  // Render loading/error/null after all hooks

  if (loading) return <div className="page-container"><div className="card">Memuat lirik...</div></div>;
  if (error) return <div className="page-container"><div className="card">{error}</div></div>;
  if (!song) return null;

  return (
    <div className="karaoke-lyrics-page">
      <div className="karaoke-header">
        <h1 className="karaoke-title">Lirik</h1>
        <div className="karaoke-card">
          <div className="karaoke-song-title">
            <span role="img" aria-label="music" style={{fontSize: '2rem', marginRight: 8}}>🎵</span>
            {song.title}
          </div>
          <div className="karaoke-song-artist">
            <span role="img" aria-label="artist" style={{fontSize: '1.5rem', marginRight: 6}}>👤</span>
            {song.artist}
          </div>
        </div>
      </div>
      <div className="karaoke-lyrics-container">
        <AutoScrollBar tempo={80} />
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
