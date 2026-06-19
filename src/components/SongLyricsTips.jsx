import React from "react";

export default function SongLyricsTips({ isEditing }) {
  if (!isEditing) return null;
  return (
    <div className="song-lyrics-tips">
      💡 Tips: Blok teks lalu klik <b>Sejajarkan Bar</b> atau <kbd>Ctrl+Shift+B</kbd>, tekan <kbd>Ctrl+S</kbd> untuk simpan, <kbd>Esc</kbd> untuk batal
    </div>
  );
}
