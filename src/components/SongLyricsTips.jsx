import React from "react";

export default function SongLyricsTips({ isEditing }) {
  if (!isEditing) return null;
  return (
    <div className="song-lyrics-tips">
      💡 Tips: Blok teks dulu. Pilih <b>2/4/6 Bar/Baris</b> lalu klik <b>Terapkan</b> (atau <kbd>Ctrl+Shift+4</kbd> untuk cepat 4 bar), gunakan <b>Sejajarkan Bar</b> atau <kbd>Ctrl+Shift+B</kbd>, tekan <kbd>Ctrl+S</kbd> untuk simpan, <kbd>Esc</kbd> untuk batal
    </div>
  );
}
