import React from 'react';
import TransposeKeyControl from './TransposeKeyControl.jsx';
import TempoControl from './TempoControl.jsx';
import SongChordsExportMenu from './SongChordsExportMenu.jsx';
import MasteryChip from './MasteryChip.jsx';
import { transposeChord } from '../utils/chordUtils.js';

/**
 * SongChordsInfo
 * Komponen info lagu (key, tempo, genre, aransemen, patch, dsb)
 */
// originalKey: key from database (song)
// targetKey: key from setlist (if any)
// lyricsOriginalKey: original key metadata from lyrics text (informational only, does not affect transpose)
export default function SongChordsInfo({
  originalKey, // from song DB
  targetKey,   // from setlist (can be undefined)
  lyricsOriginalKey, // from lyrics metadata (display only)
  transpose,
  setTranspose,
  timeSignature,
  tempo,
  scrollSpeed,
  setScrollSpeed,
  isMetronomeActive,
  setIsMetronomeActive,
  genre,
  keyboardPatch,
  detectedInstruments = [],
  title,
  artist,
  contributor,
  canEdit = false,
  canDelete = false,
  deleting = false,
  onDelete,
  onEdit,
  onShare,
  shareMessage,
  canMarkMastery = false,
  isMasteredByCurrentUser = false,
  currentUserStatus = 'none',
  onToggleMastery,
  masteryUpdating = false,
  pianoRecommendation = null,
  onApplyRecommendedTranspose,
  showExportMenu = false,
  setShowExportMenu,
  handleExportText,
  handleExportPDF,
}) {
  const showActions = true;

  // Level penguasaan lagu: 'none' | 'learning' | 'mastered' — chip dropdown.
  const currentMasteryLevel = currentUserStatus === 'mastered'
    ? 'mastered'
    : currentUserStatus === 'learning'
      ? 'learning'
      : 'none';
  const handleMasteryLevelChange = (level) => {
    if (!onToggleMastery) return;
    onToggleMastery(level);
  };
  const showKeyEasyRecommendation = !!pianoRecommendation?.recommendedKey;
  const metadataItems = [];
  const detectedInstrumentList = Array.isArray(detectedInstruments) ? detectedInstruments.filter(Boolean) : [];

  const recommendedTranspose = Number(pianoRecommendation?.transposeFromCurrent || 0);
  const baseDisplayKey = targetKey || originalKey || '';
  const transposedDisplayKey = (() => {
    if (!baseDisplayKey || !transpose) return baseDisplayKey;
    const shifted = transposeChord(baseDisplayKey, transpose);
    return shifted || baseDisplayKey;
  })();

  // Baris artis: tampilkan key (prioritas: metadata lirik > key DB > key
  // setlist) dan tempo agar info inti lagu terlihat di header.
  const headerDisplayKey = lyricsOriginalKey || originalKey || targetKey || '';
  if (headerDisplayKey) {
    metadataItems.push(`Key: ${headerDisplayKey}`);
  }
  if (baseDisplayKey) {
    metadataItems.push(`Key: ${transposedDisplayKey}`);
  }
  if (tempo) {
    metadataItems.push(`Tempo: ${tempo}`);
  }
  if (timeSignature) {
    metadataItems.push(`Time: ${timeSignature}`);
  }
  if (genre) {
    metadataItems.push(`Genre: ${genre}`);
  }
  if (lyricsOriginalKey && lyricsOriginalKey !== headerDisplayKey) {
    // Metadata lirik berbeda dari key utama — tampilkan sebagai informasi.
    metadataItems.push(`Original: ${lyricsOriginalKey}`);
  }
  if (detectedInstrumentList.length) {
    const instrumentText = detectedInstrumentList.join(', ');
    metadataItems.push(`Instrumen: ${instrumentText}`);
  }

  return (
    <div className="song-panel">
      {/* Header satu baris: judul/artis di kiri, aksi di kanan */}
      <div className="song-header-row">
        <div className="song-title-artist-block">
          {title && (
            <h1 className="song-title-main">{title}</h1>
          )}
          {(artist || contributor || genre) && (
            <p className="song-artist-main">
              {artist && <span className="song-artist-name">{artist}</span>}
              {artist && headerDisplayKey && <span className="song-meta-sep" aria-hidden="true">·</span>}
              {headerDisplayKey && (
                <span className="song-original-key-inline" title="Key (dari metadata lirik)">
                  <span aria-hidden="true">🎵</span> {headerDisplayKey}
                </span>
              )}
              {(artist || headerDisplayKey) && tempo && <span className="song-meta-sep" aria-hidden="true">·</span>}
              {tempo && (
                <span className="song-tempo-inline" title={`Tempo: ${tempo} BPM`}>
                  <span aria-hidden="true">⏱️</span> {tempo}
                </span>
              )}
              {(artist || headerDisplayKey || tempo) && genre && <span className="song-meta-sep" aria-hidden="true">·</span>}
              {genre && (
                <span className="song-genre-inline" title={`Genre: ${genre}`}>
                  <span aria-hidden="true">🎸</span> {genre}
                </span>
              )}
              {(artist || headerDisplayKey || tempo || genre) && contributor && <span className="song-meta-sep" aria-hidden="true">·</span>}
              {contributor && showActions && (
                <span className="song-contributor-main" title={`Kontributor: ${contributor}`}>
                  <span aria-hidden="true">👤</span>
                  <span className="sr-only">Kontributor:</span>
                  <span className="song-contributor-name">{contributor}</span>
                </span>
              )}
            </p>
          )}
          {shareMessage && showActions && (
            <div className="info-text song-info-share-message">{shareMessage}</div>
          )}
        </div>
        {showActions && (
          <div className="song-info-header-actions">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="btn btn-secondary song-detail-action-btn"
                title="Edit lagu"
                aria-label="Edit lagu"
              >
                <span aria-hidden="true">✎</span>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="btn btn-secondary song-detail-action-btn song-delete-btn"
                title={deleting ? 'Menghapus…' : 'Hapus lagu'}
                aria-label="Hapus lagu"
              >
                <span aria-hidden="true">🗑</span>
              </button>
            )}
            <div className="song-info-export-wrap">
              <button
                type="button"
                className="btn btn-secondary song-detail-action-btn"
                title="Export"
                aria-label="Export lagu"
                aria-haspopup="menu"
                aria-expanded={showExportMenu}
                onClick={() => setShowExportMenu?.(!showExportMenu)}
              >
                <span aria-hidden="true">📥</span>
              </button>
              <SongChordsExportMenu
                showExportMenu={showExportMenu}
                setShowExportMenu={setShowExportMenu}
                handleExportText={handleExportText}
                handleExportPDF={handleExportPDF}
              />
            </div>
            <button
              type="button"
              onClick={onShare}
              className="btn btn-secondary song-detail-action-btn"
              title="Bagikan lagu"
              aria-label="Bagikan lagu"
            >
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        )}
      </div>

      <div className="song-info-panel">
        {/* Baris kontrol: Key & Tempo (label kiri, kontrol kanan). Key Mudah
            terintegrasi di baris Key agar aksi transpose lengkap di satu tempat. */}
        {(originalKey || targetKey || tempo) && (
          <div className="song-info-control-rows">
            {(originalKey || targetKey) && (
              <div className="song-info-control-row">
                <span className="song-info-row-label">🎹 Key</span>
                <div className="song-info-row-control">
                  <TransposeKeyControl
                    originalKey={originalKey}
                    targetKey={targetKey}
                    transpose={transpose}
                    onTransposeChange={setTranspose}
                    compact
                    pianoRecommendation={showKeyEasyRecommendation ? pianoRecommendation : null}
                    onApplyRecommendedTranspose={onApplyRecommendedTranspose}
                  />
                  {/* Mastery chip menempel di baris Key — panel lebih padat,
                      tak ada baris sendiri yang boros ruang. */}
                  <MasteryChip
                    status={currentMasteryLevel}
                    onStatusChange={handleMasteryLevelChange}
                    updating={masteryUpdating}
                    disabled={!canMarkMastery}
                  />
                </div>
              </div>
            )}
        {/* Tempo — time signature terintegrasi di dalam TempoControl */}
            {tempo && (
              <div className="song-info-control-row">
                <span className="song-info-row-label">
                  ⏱️ Tempo
                </span>
                <div className="song-info-row-control">
                  <TempoControl
                    tempo={tempo}
                    scrollSpeed={scrollSpeed}
                    setScrollSpeed={setScrollSpeed}
                    isMetronomeActive={isMetronomeActive}
                    setIsMetronomeActive={setIsMetronomeActive}
                    timeSignature={timeSignature}
                  />
                  {/* Bila lagu tidak punya key (baris Key tak tampil), mastery
                      chip pindah ke baris Tempo agar tetap selalu ada. */}
                  {!(originalKey || targetKey) && (
                    <MasteryChip
                      status={currentMasteryLevel}
                      onStatusChange={handleMasteryLevelChange}
                      updating={masteryUpdating}
                      disabled={!canMarkMastery}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail tambahan (patch keyboard, instrumen) */}
        {(keyboardPatch || detectedInstrumentList.length > 0) && (
          <div className="song-info-chip-row">
            {keyboardPatch && (
              <span className="song-info-item song-info-item-wide">
                <span className="song-info-label">🎹 Patch</span>
                <span className="song-info-value">{keyboardPatch}</span>
              </span>
            )}
            {detectedInstrumentList.length > 0 && (
              // Satu gaya dengan baris kontrol: radius/background seragam.
              <div className="song-info-control-row">
                <span className="song-info-row-label">🎼 Instrumen</span>
                <div className="song-info-row-control" aria-label="Daftar instrumen terdeteksi">
                  {/* Teks polos dipisah koma — bukan chip. */}
                  <span className="song-info-row-text">{detectedInstrumentList.join(', ')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mastery chip berdiri sendiri hanya bila lagu tak punya key & tempo. */}
        {!(originalKey || targetKey || tempo) && (
          <div className="song-info-control-row song-info-mastery-row">
            <div className="song-info-row-control">
              <MasteryChip
                status={currentMasteryLevel}
                onStatusChange={handleMasteryLevelChange}
                updating={masteryUpdating}
                disabled={!canMarkMastery}
              />
              {masteryUpdating && <span className="song-info-mastery-saving">Menyimpan…</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
