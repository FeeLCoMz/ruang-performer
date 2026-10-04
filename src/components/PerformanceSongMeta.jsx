/**
 * PerformanceSongMeta
 *
 * Meta info singkat & konsisten untuk halaman performance:
 * dipakai oleh daftar lagu (SongListPage) dan daftar lagu dalam setlist
 * (SetlistSongsPage) agar tampilannya identik.
 *
 * Info yang ditampilkan hanya yang relevan saat perform:
 * mood, artis, kunci, dan tempo.
 */

import React from 'react';
import { inferSongMood } from '../utils/songMoodUtils.js';

export default function PerformanceSongMeta({ song, showNumber = false, extra = null }) {
  const mood = inferSongMood(song);

  return (
    <>
      <span
        className={`song-mood-badge mood-${mood.tone}`}
        title={`Mood: ${mood.label} (${mood.sourceHint})`}
      >
        {mood.tone}
      </span>
      {showNumber && song.number != null && <span className="song-performance-number">#{song.number}</span>}
      {song.artist && <span>👤 {song.artist}</span>}
      {song.key && <span>🎹 {song.key}</span>}
      {song.tempo && <span>⏱️ {song.tempo} BPM</span>}
      {extra}
    </>
  );
}