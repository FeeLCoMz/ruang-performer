import React from "react";
import AutoScrollBar from "./AutoScrollBar.jsx";
import SongChordsExportMenu from "./SongChordsExportMenu.jsx";

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
  zoom,
  setZoom,
  showChordNumbers,
  setShowChordNumbers,
  showJazzChords,
  setShowJazzChords,
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
  return (
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
                    }
                    return next;
                  });
                }}
              >
                🔢
              </button>

              <button
                className={`btn ${showJazzChords ? 'btn-primary' : 'btn-secondary'}`}
                title={showJazzChords ? 'Chord (jazz) — aktif' : 'Toggle chord jazz'}
                onClick={() => {
                  setShowJazzChords((prev) => {
                    const next = !prev;
                    if (next) {
                      setShowChordNumbers(false);
                    }
                    return next;
                  });
                }}
              >
                🎷
              </button>
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
            onClick={handleSaveLyrics}
            disabled={savingLyrics}
            className="btn"
          >
            {savingLyrics ? "⏳ Menyimpan..." : "✓ Simpan"}
          </button>
          <button
            type="button"
            onClick={handleCancelEditLyrics}
            disabled={savingLyrics}
            className="btn btn-secondary"
          >
            ✕ Batal
          </button>
        </div>
      )}
    </div>
  );
}
