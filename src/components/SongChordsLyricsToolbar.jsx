import React, { useEffect, useMemo, useRef, useState } from "react";
import AutoScrollBar from "./AutoScrollBar.jsx";
import SongChordsExportMenu from "./SongChordsExportMenu.jsx";

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

/**
 * SongChordsLyricsToolbar
 * Toolbar untuk kontrol lirik/chord: autoscroll, fullscreen, zoom, edit, export.
 * Props:
 *   - isEditingLyrics
 *   - performanceMode
 *   - canEdit
 *   - tempo
 *   - autoScrollActive
 *   - scrollSpeed
 *   - setAutoScrollActive
 *   - setScrollSpeed
 *   - lyricsDisplayRef
 *   - currentBeat
 *   - setCurrentBeat
 *   - zoom
 *   - setZoom
 *   - handleEditLyrics
 *   - savingLyrics
 *   - handleSaveLyrics
 *   - handleCancelEditLyrics
 *   - showExportMenu
 *   - setShowExportMenu
 *   - handleExportText
 *   - handleExportPDF
 */
export default function SongChordsLyricsToolbar({
  isEditingLyrics,
  performanceMode,
  canEdit,
  tempo,
  timeSignature,
  autoScrollActive,
  scrollSpeed,
  setAutoScrollActive,
  setScrollSpeed,
  lyricsDisplayRef,
  currentBeat,
  setCurrentBeat,
  transpose,
  setTranspose,
  zoom,
  setZoom,
  showChordNumbers,
  setShowChordNumbers,
  showJazzChords,
  setShowJazzChords,
  showSimpleChords,
  setShowSimpleChords,
  keySignature,
  handleEditLyrics,
  savingLyrics,
  handleSaveLyrics,
  handleAlignSelectedBarlines,
  handleWrap4BarsPerLine,
  barsPerLine,
  setBarsPerLine,
  handleWrapBarsPerLine,
  handleCancelEditLyrics,
  showExportMenu,
  setShowExportMenu,
  handleExportText,
  handleExportPDF,
}) {
  const [showMetadataHelp, setShowMetadataHelp] = useState(false);
  const [showChordStyleMenu, setShowChordStyleMenu] = useState(false);
  const chordStyleMenuRef = useRef(null);
  const metadataSections = useMemo(() => METADATA_HELP_ITEMS, []);
  const currentChordStyleLabel = showJazzChords ? 'Jazz' : showSimpleChords ? 'Simple' : 'Default';

  useEffect(() => {
    if (!showChordStyleMenu) return undefined;

    const handlePointerDown = (event) => {
      if (!chordStyleMenuRef.current?.contains(event.target)) {
        setShowChordStyleMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showChordStyleMenu]);

  const applyChordStyle = (style) => {
    setShowChordNumbers(false);
    setShowJazzChords(style === 'jazz');
    setShowSimpleChords(style === 'simple');
    setShowChordStyleMenu(false);
  };

  return (
    <>
      <div className="song-lyrics-toolbar">
        {!isEditingLyrics && (
          <>
          {/* Fullscreen Button */}
          <button
            className="btn btn-secondary"
            title="Tampilkan lirik layar penuh"
            onClick={() => {
              const el = document.querySelector(".song-lyrics-display");
              if (el && el.requestFullscreen) {
                el.requestFullscreen();
              } else if (el && el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
              } else if (el && el.msRequestFullscreen) {
                el.msRequestFullscreen();
              }
            }}
          >
            🖥️
          </button>

          <AutoScrollBar
            tempo={parseInt(tempo) || 120}
            timeSignature={timeSignature || '4/4'}
            active={autoScrollActive}
            speed={scrollSpeed}
            onToggle={() => setAutoScrollActive(!autoScrollActive)}
            onSpeedChange={setScrollSpeed}
            lyricsDisplayRef={lyricsDisplayRef}
            currentBeat={currentBeat}
            setCurrentBeat={setCurrentBeat}
          />

          <div className="song-lyrics-transpose-controls" title="Transpose lirik/chord">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTranspose((prev) => prev - 1)}
              title="Transpose turun 1 semitone"
              aria-label="Transpose turun"
            >
              -
            </button>
            <span className="song-lyrics-transpose-value" aria-live="polite">
              Tr {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTranspose((prev) => prev + 1)}
              title="Transpose naik 1 semitone"
              aria-label="Transpose naik"
            >
              +
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTranspose(0)}
              title="Reset transpose"
              aria-label="Reset transpose"
              disabled={transpose === 0}
            >
              0
            </button>
          </div>

          {!performanceMode && (
            <>
              <button
                className={`btn ${showChordNumbers ? 'btn-primary' : 'btn-secondary'}`}
                title={showChordNumbers ? 'Chord (angka) — aktif' : 'Toggle angka chord'}
                onClick={() => {
                  setShowChordNumbers((prev) => {
                    const next = !prev;
                    if (next) {
                      setShowJazzChords(false);
                      setShowSimpleChords(false);
                    }
                    return next;
                  });
                }}
              >
                🔢
              </button>

              <div className="song-lyrics-chord-style-menu-container" ref={chordStyleMenuRef}>
                <button
                  className={`btn ${showJazzChords || showSimpleChords ? 'btn-primary' : 'btn-secondary'}`}
                  title={`Style chord: ${currentChordStyleLabel}`}
                  onClick={() => setShowChordStyleMenu((prev) => !prev)}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={showChordStyleMenu}
                >
                  🎼
                </button>
                <span className="song-lyrics-chord-style-badge" title={`Style chord aktif: ${currentChordStyleLabel}`}>
                  Style: {currentChordStyleLabel}
                </span>
                {showChordStyleMenu && (
                  <div className="song-lyrics-chord-style-menu" role="menu" aria-label="Pilih style chord">
                    <button
                      type="button"
                      className={`song-lyrics-chord-style-item${!showJazzChords && !showSimpleChords ? ' active' : ''}`}
                      onClick={() => applyChordStyle('default')}
                      role="menuitem"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      className={`song-lyrics-chord-style-item${showJazzChords ? ' active' : ''}`}
                      onClick={() => applyChordStyle('jazz')}
                      role="menuitem"
                    >
                      Jazz
                    </button>
                    <button
                      type="button"
                      className={`song-lyrics-chord-style-item${showSimpleChords ? ' active' : ''}`}
                      onClick={() => applyChordStyle('simple')}
                      role="menuitem"
                    >
                      Simple
                    </button>
                  </div>
                )}
              </div>
            </>
          )}


          </>
        )}

      {/* 3. Edit Lirik */}
        {!isEditingLyrics ? (
          <>
          {/* Sembunyikan tombol edit lirik & export saat performanceMode aktif */}
          {!performanceMode && canEdit && (
            <button
              type="button"
              onClick={handleEditLyrics}
              className="btn btn-primary"
              title="Edit Lirik"
            >
              ✏️
            </button>
          )}
          {/* 4. Export Menu (RIGHT) */}
          {!performanceMode && (
            <div className="song-lyrics-export-menu-container">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="btn btn-secondary"
                title="Export"
              >
                📥
              </button>
              <SongChordsExportMenu
                showExportMenu={showExportMenu}
                setShowExportMenu={setShowExportMenu}
                handleExportText={handleExportText}
                handleExportPDF={handleExportPDF}
              />
            </div>
          )}
          </>
        ) : (
          <div className="song-lyrics-edit-actions">
            <button
              type="button"
              onClick={handleAlignSelectedBarlines}
              disabled={savingLyrics}
              className="btn btn-secondary"
              title="Sejajarkan garis bar (|) pada teks yang dipilih"
            >
              ∥ Sejajarkan Bar
            </button>
            <button
              type="button"
              onClick={handleWrap4BarsPerLine}
              disabled={savingLyrics}
              className="btn btn-secondary"
              title="Pecah otomatis menjadi 4 bar per baris pada teks yang dipilih"
            >
              ↩ 4 Bar/Baris
            </button>
            <div className="song-lyrics-bar-wrap-controls">
              <label htmlFor="bars-per-line" className="song-lyrics-bar-wrap-label">Bar/Baris</label>
              <select
                id="bars-per-line"
                className="song-lyrics-bar-wrap-select"
                value={barsPerLine}
                onChange={(e) => setBarsPerLine(Number(e.target.value))}
                disabled={savingLyrics}
                aria-label="Pilih jumlah bar per baris"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
              </select>
              <button
                type="button"
                onClick={() => handleWrapBarsPerLine(barsPerLine)}
                disabled={savingLyrics}
                className="btn btn-secondary"
                title="Terapkan jumlah bar per baris pada teks yang dipilih"
              >
                Terapkan
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowMetadataHelp(true)}
              disabled={savingLyrics}
              className="btn btn-secondary"
              title="Lihat daftar metadata yang didukung"
            >
              ❓ Help Metadata
            </button>
            <button
              type="button"
              onClick={handleSaveLyrics}
              disabled={savingLyrics}
              className="btn"
              title={savingLyrics ? "Menyimpan..." : "Simpan"}
              aria-label={savingLyrics ? "Menyimpan" : "Simpan"}
            >
              {savingLyrics ? "⏳" : "✓"}
            </button>
            <button
              type="button"
              onClick={handleCancelEditLyrics}
              disabled={savingLyrics}
              className="btn btn-secondary"
              title="Batal"
              aria-label="Batal"
            >
              ✕
            </button>
          </div>
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
                      <li key={example}><code>{example}</code></li>
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
