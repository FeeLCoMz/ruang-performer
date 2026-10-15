import React, { useState } from 'react';
import TransposeKeyControl from './TransposeKeyControl.jsx';
import TempoControl from './TempoControl.jsx';
import SongChordsExportMenu from './SongChordsExportMenu.jsx';
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
  const [activeTab] = useState('info');

  // Level penguasaan lagu: Belum Diulik / Perlu Latihan / Dikuasai.
  const MASTERY_LEVELS = [
    { value: 'none', label: 'Belum Diulik', icon: '🔴' },
    { value: 'learning', label: 'Perlu Latihan', icon: '🟡' },
    { value: 'ready', label: 'Dikuasai', icon: '🟢' },
  ];
  const currentMasteryLevel = currentUserStatus === 'mastered'
    ? 'ready'
    : currentUserStatus === 'learning'
      ? 'learning'
      : 'none';
  const handleMasteryLevelChange = (level) => {
    if (!onToggleMastery) return;
    // Klik level aktif kembali ke "Belum Diulik".
    onToggleMastery(level === currentMasteryLevel ? 'none' : level);
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
  if (lyricsOriginalKey) {
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
              {artist && genre && <span className="song-meta-sep" aria-hidden="true">·</span>}
              {genre && (
                <span className="song-genre-inline" title={`Genre: ${genre}`}>
                  <span aria-hidden="true">🎸</span> {genre}
                </span>
              )}
              {artist && contributor && <span className="song-meta-sep" aria-hidden="true">·</span>}
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
                </div>
              </div>
            )}
        {/* Tempo + time signature terintegrasi: label menampilkan keduanya */}
            {tempo && (
              <div className="song-info-control-row">
                <span className="song-info-row-label">
                  ⏱️ Tempo{timeSignature ? ` • ${timeSignature}` : ''}
                </span>
                <div className="song-info-row-control">
                  <TempoControl
                    tempo={tempo}
                    scrollSpeed={scrollSpeed}
                    setScrollSpeed={setScrollSpeed}
                    isMetronomeActive={isMetronomeActive}
                    setIsMetronomeActive={setIsMetronomeActive}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Asli key — time signature terintegrasi dengan Tempo */}
        {lyricsOriginalKey && (
          <div className="song-info-chip-row">
            <span className="song-info-item song-info-item-plain">🎵 Asli: {lyricsOriginalKey}</span>
          </div>
        )}

        {/* Detail tambahan (patch keyboard, instrumen) — hanya di tab Info */}
        {activeTab === 'info' && (keyboardPatch || detectedInstrumentList.length > 0) && (
          <div className="song-info-chip-row">
            {keyboardPatch && (
              <span className="song-info-item song-info-item-wide">
                <span className="song-info-label">🎹 Patch</span>
                <span className="song-info-value">{keyboardPatch}</span>
              </span>
            )}
            {detectedInstrumentList.length > 0 && (
              <span className="song-info-item">
                <span className="song-info-label">🎼 Instrumen</span>
                <span className="song-info-chip-list" aria-label="Daftar instrumen terdeteksi">
                  {detectedInstrumentList.map((instrument, i) => (
                    <span key={`${instrument}-${i}`} className="song-info-chip">
                      {instrument}
                    </span>
                  ))}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Baris mastery — 3 level: Belum Diulik / Perlu Latihan / Dikuasai.
            Chip status = dropdown pilihan; klik membuka pilihan level. */}
        <div className="song-info-control-row song-info-mastery-row">
          <div className="song-info-mastery-picker" title="Pilih status penguasaan lagu">
            {MASTERY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                className={`song-mastery-chip mastery-${level.value}${currentMasteryLevel === level.value ? ' selected' : ''}`}
                onClick={() => handleMasteryLevelChange(level.value)}
                disabled={!canMarkMastery || masteryUpdating}
                aria-pressed={currentMasteryLevel === level.value}
                title={canMarkMastery ? `Set status: ${level.label}` : 'Anda belum bisa menandai lagu ini'}
              >
                <span aria-hidden="true">{level.icon}</span>
                {level.label}
              </button>
            ))}
          </div>
          <div className="song-info-row-control">
            {masteryUpdating && <span className="song-info-mastery-saving">Menyimpan…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
