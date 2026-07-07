import React, { useMemo, useState } from "react";

const METADATA_HELP_ITEMS = [
  {
    title: "Struktur Lagu",
    description: "Penanda bagian lagu yang akan ditampilkan sebagai section.",
    examples: ["[Intro]", "Verse:", "Chorus:", "Bridge:", "Outro:"],
  },
  {
    title: "Label Instrumen",
    description: "Baris nama instrumen untuk panduan pemain.",
    examples: ["[Piano]", "Guitar:", "Brass:", "Vokal:"],
  },
  {
    title: "Patch Instrumen",
    description: "Metadata patch/layer keyboard dalam satu baris.",
    examples: [
      "Patch: Stage Piano | Layer: Warm Pad (Volume 30%)",
      "Patch: EP Soft | Split: Bass",
      "Preset: Ballad Keys | Scene: Verse",
    ],
  },
  {
    title: "Metadata Aransemen",
    description: "Catatan perform berbasis key:value.",
    examples: [
      "Intensitas: 1",
      "Cue: Drum masuk di bar 9",
      "Notes: Main tipis di verse",
      "FX: Hall Reverb",
      "Feel: Half-time",
    ],
  },
  {
    title: "Modulasi",
    description: "Perintah perubahan key di tengah lagu.",
    examples: ["Modulation: G", "Key change: A"],
  },
  {
    title: "Original Key",
    description: "Informasi key asli lagu (tidak ikut ditranspose).",
    examples: ["Original Key: C"],
  },
  {
    title: "Timestamp",
    description: "Penanda waktu yang bisa diklik di tampilan chord.",
    examples: ["[01:23]", "[1:02:03]"],
  },
];

export default function SongLyricsEditActions({
  disabled,
  barsPerLine,
  setBarsPerLine,
  handleAlignSelectedBarlines,
  handleWrap4BarsPerLine,
  handleWrapBarsPerLine,
  showMetadataHelpButton = true,
  showSaveCancelButtons = false,
  savingLyrics = false,
  handleSaveLyrics,
  handleCancelEditLyrics,
  barsPerLineSelectId = "bars-per-line",
  showPianoControls = false,
  onOpenPiano,
  insertNotesEnabled = false,
  onToggleInsertNotes,
  insertNoteFormat = "bracket",
  onChangeInsertNoteFormat,
  insertTrailingSpace = false,
  onToggleInsertTrailingSpace,
}) {
  const [showMetadataHelp, setShowMetadataHelp] = useState(false);
  const metadataSections = useMemo(() => METADATA_HELP_ITEMS, []);

  return (
    <>
      <div className="song-lyrics-edit-actions">
        <button
          type="button"
          onClick={handleAlignSelectedBarlines}
          disabled={disabled}
          className="btn btn-secondary"
          title="Sejajarkan garis bar (|) pada teks yang dipilih"
        >
          ∥ Sejajarkan Bar
        </button>
        <button
          type="button"
          onClick={handleWrap4BarsPerLine}
          disabled={disabled}
          className="btn btn-secondary"
          title="Pecah otomatis menjadi 4 bar per baris pada teks yang dipilih"
        >
          ↩ 4 Bar/Baris
        </button>
        <div className="song-lyrics-bar-wrap-controls">
          <label htmlFor={barsPerLineSelectId} className="song-lyrics-bar-wrap-label">Bar/Baris</label>
          <select
            id={barsPerLineSelectId}
            className="song-lyrics-bar-wrap-select"
            value={barsPerLine}
            onChange={(e) => setBarsPerLine(Number(e.target.value))}
            disabled={disabled}
            aria-label="Pilih jumlah bar per baris"
          >
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={6}>6</option>
          </select>
          <button
            type="button"
            onClick={() => handleWrapBarsPerLine(barsPerLine)}
            disabled={disabled}
            className="btn btn-secondary"
            title="Terapkan jumlah bar per baris pada teks yang dipilih"
          >
            Terapkan
          </button>
        </div>
        {showPianoControls && (
          <div className="song-lyrics-piano-controls">
            <button
              type="button"
              onClick={onOpenPiano}
              disabled={disabled}
              className="btn btn-secondary"
              title="Buka Virtual Piano"
            >
              🎹 Piano
            </button>
            <label className="song-lyrics-insert-toggle" htmlFor="lyrics-insert-notes-toggle">
              <input
                id="lyrics-insert-notes-toggle"
                type="checkbox"
                checked={insertNotesEnabled}
                onChange={(e) => onToggleInsertNotes?.(e.target.checked)}
                disabled={disabled}
              />
              Insert not ke lirik
            </label>
            <label className="song-lyrics-insert-format" htmlFor="lyrics-insert-format-select">
              Format
              <select
                id="lyrics-insert-format-select"
                className="song-lyrics-bar-wrap-select"
                value={insertNoteFormat}
                onChange={(e) => onChangeInsertNoteFormat?.(e.target.value)}
                disabled={disabled || !insertNotesEnabled}
              >
                <option value="bracket">[C]</option>
                <option value="plain">C</option>
              </select>
            </label>
            <label className="song-lyrics-insert-toggle" htmlFor="lyrics-insert-space-toggle">
              <input
                id="lyrics-insert-space-toggle"
                type="checkbox"
                checked={insertTrailingSpace}
                onChange={(e) => onToggleInsertTrailingSpace?.(e.target.checked)}
                disabled={disabled || !insertNotesEnabled}
              />
              Tambah spasi otomatis
            </label>
          </div>
        )}
        {showMetadataHelpButton && (
          <button
            type="button"
            onClick={() => setShowMetadataHelp(true)}
            disabled={disabled}
            className="btn btn-secondary"
            title="Lihat daftar metadata yang didukung"
          >
            ❓ Help Metadata
          </button>
        )}
        {showSaveCancelButtons && (
          <>
            <button
              type="button"
              onClick={handleSaveLyrics}
              disabled={disabled}
              className="btn"
              title={savingLyrics ? "Menyimpan..." : "Simpan"}
              aria-label={savingLyrics ? "Menyimpan" : "Simpan"}
            >
              {savingLyrics ? "⏳" : "✓"}
            </button>
            <button
              type="button"
              onClick={handleCancelEditLyrics}
              disabled={disabled}
              className="btn btn-secondary"
              title="Batal"
              aria-label="Batal"
            >
              ✕
            </button>
          </>
        )}
      </div>

      {showMetadataHelp && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Panduan metadata lirik"
          onClick={() => setShowMetadataHelp(false)}
        >
          <div
            className="modal song-lyrics-metadata-help-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="song-lyrics-metadata-help-header">
              <h3>Panduan Metadata Lirik</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowMetadataHelp(false)}
                aria-label="Tutup panduan metadata"
                title="Tutup"
              >
                ✕
              </button>
            </div>
            <p className="song-lyrics-metadata-help-desc">
              Gunakan format metadata berikut langsung di area lirik/chord.
            </p>
            <div className="song-lyrics-metadata-help-list">
              {metadataSections.map((item) => (
                <section key={item.title} className="song-lyrics-metadata-help-item">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <ul>
                    {item.examples.map((example) => (
                      <li key={`${item.title}-${example}`}>
                        <code>{example}</code>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
