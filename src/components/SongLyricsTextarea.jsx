import React from "react";

export default function SongLyricsTextarea({
  lyricsDisplayRef,
  editedLyrics,
  setEditedLyrics,
  autoFocus = true
}) {
  return (
    <textarea
      ref={lyricsDisplayRef}
      value={editedLyrics}
      onChange={(e) => setEditedLyrics(e.target.value)}
      className="song-lyrics-textarea"
      autoFocus={autoFocus}
      placeholder={
        "Masukkan lirik dan chord...\nContoh:\n[C]Amazing grace how [F]sweet the [C]sound"
      }
    />
  );
}
