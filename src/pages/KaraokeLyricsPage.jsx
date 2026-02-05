import React, { useState, useEffect, useRef } from 'react';
import '../styles/karaoke.css';
import { useParams } from 'react-router-dom';
import { getAuthHeader } from '../utils/auth.js';
import { parseChordLine, parseSection } from '../utils/chordUtils.js';

// KaraokeLyricsPage: Penampil lirik fullscreen untuk penyanyi/karaoke
export default function KaraokeLyricsPage() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const lyricsRef = useRef(null);
  const [activeLine, setActiveLine] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2500); // ms per line
  const [darkMode, setDarkMode] = useState(false);

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

  // Fullscreen handler
  const handleFullscreen = () => {
    setFullscreen(true);
    setTimeout(() => {
      if (lyricsRef.current) {
        if (lyricsRef.current.requestFullscreen) {
          lyricsRef.current.requestFullscreen();
        } else if (window.parent) {
          window.parent.document.body.requestFullscreen?.();
        }
      }
    }, 100);
  };

  // Exit fullscreen on ESC or fullscreenchange
  useEffect(() => {
    const exitHandler = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', exitHandler);
    return () => document.removeEventListener('fullscreenchange', exitHandler);
  }, []);

  // Split lyrics into lines
  const lyricLines = song && song.lyrics ? song.lyrics.split(/\r?\n/) : [];
  // Sembunyikan baris chord (hanya tampilkan lirik dan struktur)
  const lyricOnlyLines = lyricLines.filter(line => !parseChordLine(line));

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || lyricLines.length === 0) return;
    setActiveLine(0);
    let lineIdx = 0;
    const interval = setInterval(() => {
      lineIdx++;
      if (lineIdx < lyricLines.length) {
        setActiveLine(lineIdx);
        // Scroll to active line
        const el = document.getElementById(`karaoke-line-${lineIdx}`);
        if (el && fullscreen) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        clearInterval(interval);
        setAutoScroll(false);
      }
    }, scrollSpeed);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [autoScroll, fullscreen, song && song.lyrics, scrollSpeed]);

  // Render loading/error/null after all hooks
  if (loading) return <div className="page-container"><div className="card">Memuat lirik...</div></div>;
  if (error) return <div className="page-container"><div className="card">{error}</div></div>;
  if (!song) return null;

  return (
    <div className={`karaoke-lyrics-page${fullscreen ? ' fullscreen' : ''}${darkMode ? ' dark-mode' : ''}`} ref={lyricsRef}>
      <div className="karaoke-header">
        <h1 className="karaoke-title">{song.title}</h1>
        <p className="karaoke-artist">{song.artist}</p>
        <button className="btn btn-secondary" onClick={() => setAutoScroll(s => !s)}>
          {autoScroll ? 'Pause Auto-Scroll' : 'Mulai Auto-Scroll'}
        </button>
      </div>
      <div className="karaoke-lyrics-container">
        <div className="karaoke-lyrics-text">
          {lyricOnlyLines.map((line, idx) => {
            const section = parseSection(line);
            const isSection = section && section.type === 'structure';
            return (
              <div
                key={idx}
                id={`karaoke-line-${idx}`}
                className={
                  (idx === activeLine ? 'karaoke-line active ' : 'karaoke-line ') +
                  (isSection ? 'karaoke-section' : '')
                }
                style={{
                  padding: isSection ? '12px 0' : '8px 0',
                  fontWeight: idx === activeLine ? 'bold' : isSection ? 'bold' : 'normal',
                  color: idx === activeLine ? '#ffeb3b' : isSection ? '#3b82f6' : undefined,
                  fontSize: isSection ? '2.1rem' : '2rem',
                  letterSpacing: isSection ? '0.04em' : undefined,
                  textTransform: isSection ? 'uppercase' : undefined,
                  transition: 'color 0.2s, font-weight 0.2s',
                }}
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
