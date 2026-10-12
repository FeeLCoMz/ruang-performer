import React from "react";
import TransposeKeyControl from "./TransposeKeyControl.jsx";
import TempoControl from "./TempoControl.jsx";
import { transposeChord } from "../utils/chordUtils.js";

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
  performanceKeyOverride = '',
  canEdit = false,
  onEdit,
  onShare,
  shareMessage,
  masteredBy = [],
  canMarkMastery = false,
  isMasteredByCurrentUser = false,
  onToggleMastery,
  masteryUpdating = false,
  pianoRecommendation = null,
  onApplyRecommendedTranspose,
}) {
  const masteredNames = (Array.isArray(masteredBy) ? masteredBy : [])
    .map((entry) => entry?.username)
    .filter(Boolean)
    .join(', ');
  const showActions = true;
  const showKeyEasyRecommendation = !!pianoRecommendation?.recommendedKey;
  const metadataItems = [];
  const detectedInstrumentList = Array.isArray(detectedInstruments) ? detectedInstruments.filter(Boolean) : [];
  const handleCopyInstruments = async () => {
    const parts = [];
    if (keyboardPatch) parts.push(`Keyboard Patch: ${keyboardPatch}`);
    if (detectedInstrumentList.length) parts.push(`Instrumen: ${detectedInstrumentList.join(', ')}`);
    if (!parts.length) return;

    const copyText = parts.join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        return;
      }

      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = copyText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.warn('Gagal menyalin instrumen lagu:', error);
    }
  };
  const recommendedTranspose = Number(pianoRecommendation?.transposeFromCurrent || 0);
  const recommendedTransposeText = recommendedTranspose > 0
    ? `+${recommendedTranspose}`
    : `${recommendedTranspose}`;
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
          {(artist || contributor) && (
            <p className="song-artist-main">
              {artist && <span className="song-artist-name">{artist}</span>}
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

      <div className="song-info-chip-row">
          {(originalKey || targetKey) && (
            <span className="song-info-item song-info-item-key">
              <span className="song-info-label">🎹 Key</span>
              <TransposeKeyControl
                originalKey={originalKey}
                targetKey={targetKey}
                transpose={transpose}
                onTransposeChange={setTranspose}
                compact
              />
            </span>
          )}
          {showKeyEasyRecommendation && (
            <span className="song-info-item song-info-item-reco">
              <span className="song-info-label">🎹 Key Mudah</span>
              <button
                type="button"
                className="btn btn-secondary song-info-piano-reco-btn"
                onClick={() => onApplyRecommendedTranspose?.(pianoRecommendation.transposeFromCurrent)}
                disabled={typeof onApplyRecommendedTranspose !== 'function' || pianoRecommendation.transposeFromCurrent === 0}
                title={pianoRecommendation.transposeFromCurrent === 0
                  ? 'Key dasar sudah cocok'
                  : `Terapkan ${pianoRecommendation.recommendedKey} (${recommendedTransposeText} semitone)`}
                aria-label="Gunakan key mudah yang disarankan"
              >
                {pianoRecommendation.recommendedKey}
              </button>
            </span>
          )}
          {tempo && (
            <span className="song-info-item song-info-item-tempo">
              <span className="song-info-label">⏱️ Tempo</span>
              <TempoControl
                tempo={tempo}
                scrollSpeed={scrollSpeed}
                setScrollSpeed={setScrollSpeed}
                isMetronomeActive={isMetronomeActive}
                setIsMetronomeActive={setIsMetronomeActive}
              />
            </span>
          )}
          {timeSignature && (
            <span className="song-info-item">
              <span className="song-info-label">🎼 Time</span>
              <span className="song-info-value">{timeSignature}</span>
            </span>
          )}
          {genre && (
            <span className="song-info-item">
              <span className="song-info-label">🎸 Genre</span>
              <span className="song-info-value">{genre}</span>
            </span>
          )}
          {lyricsOriginalKey && (
            <span className="song-info-item">
              <span className="song-info-label">🎵 Nada Asli</span>
              <span className="song-info-value">{lyricsOriginalKey}</span>
            </span>
          )}
          {keyboardPatch && (
            <span className="song-info-item song-info-item-wide">
              <span className="song-info-label">🎹 Keyboard Patch</span>
              <span className="song-info-value">{keyboardPatch}</span>
            </span>
          )}
          {detectedInstrumentList.length > 0 && (
            <span className="song-info-item song-info-item-wide">
              <span className="song-info-label">🎼 Instrumen</span>
              <span className="song-info-chip-list" aria-label="Daftar instrumen terdeteksi">
                {detectedInstrumentList.map((instrument) => (
                  <span key={`${instrument}-${Math.random()}`} className="song-info-chip">
                    {instrument}
                  </span>
                ))}
              </span>
              <button
                type="button"
                className="btn btn-secondary song-info-copy-btn"
                onClick={handleCopyInstruments}
                title="Salin instrumen dan keyboard patch"
                aria-label="Salin instrumen dan keyboard patch"
              >
                Copy
              </button>
            </span>
          )}
          <span className="song-info-item song-info-item-mastery song-info-mastery-block-full">
            <span className="song-info-label">✅ Dikuasai</span>
            <span className="song-info-value song-info-mastery-count">
              {Array.isArray(masteredBy) ? masteredBy.length : 0} orang
            </span>
            {masteredNames && (
              <span className="song-info-mastery-members">{masteredNames}</span>
            )}
            <button
              type="button"
              className={`btn song-info-mastery-btn ${isMasteredByCurrentUser ? '' : 'btn-secondary'}`}
              onClick={onToggleMastery}
              disabled={!canMarkMastery || masteryUpdating}
              title={canMarkMastery ? 'Tandai lagu ini sudah dikuasai' : 'Anda belum bisa menandai lagu ini'}
            >
              {masteryUpdating
                ? 'Menyimpan...'
                : (canMarkMastery
                  ? (isMasteredByCurrentUser ? 'Sudah Kuasai' : 'Belum Kuasai')
                  : 'Belum Bisa Tandai')}
            </button>
          </span>
      </div>
    </div>
  );
}
