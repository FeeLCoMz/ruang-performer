import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChordDisplay from '../components/ChordDisplay';
import TransposeBar from '../components/TransposeBar';
import AutoScrollBar from '../components/AutoScrollBar';
import YouTubeViewer from '../components/YouTubeViewer';
import TimeMarkers from '../components/TimeMarkers';
import SetlistSongNavigator from '../components/SetlistSongNavigator';

export default function SongLyricsPage({ song: songProp }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get metadata from location state (setlist context)
  const setlistSongData = location.state?.setlistSong || {};
  const setlistData = location.state?.setlist || {};
  const setlistId = location.state?.setlistId;
  
  // Merge song data: prioritize setlist metadata > location state > song prop
  const song = songProp || location.state?.song;
  const artist = setlistSongData.artist || song?.artist || '';
  const key = setlistSongData.key || song?.key || '';
  const tempo = setlistSongData.tempo || song?.tempo || '';
  const genre = setlistSongData.genre || song?.genre || '';
  const capo = setlistSongData.capo || song?.capo || '';
  const youtubeId = song?.youtubeId || song?.youtube_url || '';
  const timeMarkers = song?.time_markers || [];

  // Transpose state
  const [transpose, setTranspose] = useState(0);
  const [zoom, setZoom] = useState(1);
  const highlightChords = false;

  // Auto-calculate transpose if setlist has different key
  useEffect(() => {
    if (setlistSongData.key && song?.key && setlistSongData.key !== song.key) {
      const keyMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const originalIdx = keyMap.indexOf(song.key);
      const targetIdx = keyMap.indexOf(setlistSongData.key);
      if (originalIdx >= 0 && targetIdx >= 0) {
        let steps = targetIdx - originalIdx;
        if (steps < 0) steps += 12;
        setTranspose(steps);
      }
    }
  }, [setlistSongData.key, song?.key]);

  if (!song) {
    return (
      <div className="page-container">
        <div className="not-found-container">
          <div className="not-found-icon">🎵</div>
          <h2 className="not-found-title">Lagu Tidak Ditemukan</h2>
          <p className="not-found-message">
            Lagu yang Anda cari tidak tersedia
          </p>
          <button
            onClick={() => navigate(-1)}
            className="btn-submit"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (setlistId) {
      navigate(`/setlists/${setlistId}`);
    } else {
      navigate('/songs');
    }
  };

  const handleEdit = () => {
    navigate(`/songs/edit/${song.id}`);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="song-detail-header">
        <button
          onClick={handleBack}
          className="song-detail-back"
          aria-label="Kembali"
        >
          ←
        </button>
        <div className="song-detail-info">
          <h1 className="song-detail-title">
            {song.title}
          </h1>
          {artist && (
            <div className="song-detail-artist">
              {artist}
            </div>
          )}
        </div>
        <button
          onClick={handleEdit}
          className="song-detail-edit"
        >
          ✏️ Edit
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Left Column: Song Info & Controls */}
        <div className="form-section">
          {/* Song Details Card */}
          <div className="song-section-card">
            <h3 className="song-section-title">
              📋 Detail Lagu
            </h3>
            <div className="form-section" style={{ gap: '10px' }}>
              {artist && (
                <div className="song-info-row">
                  <span className="song-info-label">👤 Artist:</span>
                  <span className="song-info-value">{artist}</span>
                </div>
              )}
              {key && (
                <div className="song-info-row">
                  <span className="song-info-label">🎹 Key:</span>
                  <span className="song-info-value">{key}</span>
                </div>
              )}
              {tempo && (
                <div className="song-info-row">
                  <span className="song-info-label">⏱️ Tempo:</span>
                  <span className="song-info-value">{tempo} BPM</span>
                </div>
              )}
              {genre && (
                <div className="song-info-row">
                  <span className="song-info-label">🎸 Genre:</span>
                  <span className="song-info-value">{genre}</span>
                </div>
              )}
              {capo && (
                <div className="song-info-row">
                  <span className="song-info-label">📌 Capo:</span>
                  <span className="song-info-value">Fret {capo}</span>
                </div>
              )}
              {!artist && !key && !tempo && !genre && !capo && (
                <div className="not-found-message" style={{ marginBottom: 0 }}>
                  Tidak ada detail metadata
                </div>
              )}
            </div>
          </div>

          {/* Playback Controls Card */}
          <div className="song-section-card">
            <h3 className="song-section-title">
              🎚️ Kontrol Playback
            </h3>
            <div className="form-section">
              <TransposeBar
                transpose={transpose}
                setTranspose={setTranspose}
              />
              <AutoScrollBar tempo={tempo || 120} />
            </div>
          </div>
        </div>

        {/* Right Column: YouTube & Time Markers */}
        <div className="form-section">
          <YouTubeViewer videoId={youtubeId || ''} />
          
          <TimeMarkers
            timeMarkers={timeMarkers}
            readonly={true}
          />
        </div>
      </div>

      {/* Lyrics Section */}
      <div className="song-section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="song-section-title">
            🎤 Lirik & Chord
          </h3>
          <div className="zoom-controls">
            <button
              onClick={() => setZoom(Math.max(0.7, zoom - 0.1))}
              className="btn-base zoom-btn"
              title="Perkecil"
            >
              −
            </button>
            <span className="zoom-display">{(zoom * 100).toFixed(0)}%</span>
            <button
              onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
              className="btn-base zoom-btn"
              title="Perbesar"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="btn-base zoom-btn"
              title="Reset"
            >
              ⟲
            </button>
          </div>
        </div>
        <ChordDisplay
          song={song}
          transpose={transpose}
          highlightChords={highlightChords}
          zoom={zoom}
        />
      </div>

      {/* Setlist Navigation (if in setlist context) */}
      {setlistId && setlistData.songs && (
        <SetlistSongNavigator
          setlistId={setlistId}
          currentSongId={song.id}
          songs={setlistData.songs}
        />
      )}
    </div>
  );
}
