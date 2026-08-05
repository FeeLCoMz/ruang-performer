import React, { useEffect, useState } from "react";
import TransposeKeyControl from "./TransposeKeyControl.jsx";
import ExpandButton from "./ExpandButton.jsx";
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
  arrangementStyle,
  keyboardPatch,
  showSongInfo,
  setShowSongInfo,
  title,
  artist,
  contributor,
  performanceMode,
  lyricsMode = false,
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
  const showActions = !performanceMode && !lyricsMode;
  const showMetadata = performanceMode || lyricsMode || showSongInfo;
  const showMinimalMetadata = performanceMode || lyricsMode;
  const metadataItems = [];
  const [isKeyboardistKeyCollapsed, setIsKeyboardistKeyCollapsed] = useState(true);
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

  useEffect(() => {
    setIsKeyboardistKeyCollapsed(true);
  }, [pianoRecommendation?.recommendedKey, performanceMode, lyricsMode]);

  if (baseDisplayKey) {
    metadataItems.push(`Key: ${transposedDisplayKey}`);
  }
  if (!lyricsMode && tempo) {
    metadataItems.push(`Tempo: ${tempo}`);
  }
  if (!lyricsMode && timeSignature) {
    metadataItems.push(`Time: ${timeSignature}`);
  }
  if (!lyricsMode && genre) {
    metadataItems.push(`Genre: ${genre}`);
  }
  if (lyricsOriginalKey) {
    metadataItems.push(`Original: ${lyricsOriginalKey}`);
  }

  return (
    <div className="song-panel">
      {/* Judul dan artis selalu di atas info lain */}
      {(title || artist || contributor || !performanceMode) && (
        <div className="song-title-artist-block">
          {showActions && (
            <div className="song-title-actions">
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
          {title && (
            <h1 className="song-title-main">{title}</h1>
          )}
          {artist && (
            <h2 className="song-artist-main">{artist}</h2>
          )}
          {contributor && showActions && (
            <div className="song-contributor-main">Kontributor: {contributor}</div>
          )}
          {shareMessage && showActions && (
            <div className="info-text song-info-share-message">{shareMessage}</div>
          )}
        </div>
      )}
      {showActions && (
        <div className="song-info-compact-header">
          <ExpandButton
            isExpanded={showSongInfo}
            setIsExpanded={setShowSongInfo}
            icon="📋"
            label="Info Lagu"
            ariaLabel={showSongInfo ? 'Sembunyikan info lagu' : 'Tampilkan info lagu'}
          />
        </div>
      )}
      {showMetadata && (
        <div className={`song-info-compact-grid ${showMinimalMetadata ? 'song-info-compact-grid-minimal' : ''}`}>
          {showMinimalMetadata ? (
            <div className="song-info-item song-info-priority song-info-inline-strip">
              <span className="song-info-inline-text">
                {metadataItems.join(' • ')}
              </span>
            </div>
          ) : (
            <>
              {(originalKey || targetKey) && (
                <div className="song-info-item song-info-priority song-info-key">
                  <span className="song-info-label">🎹 Key</span>
                  <TransposeKeyControl
                    originalKey={originalKey}
                    targetKey={targetKey}
                    transpose={transpose}
                    onTransposeChange={setTranspose}
                  />
                </div>
              )}
              {lyricsOriginalKey && (
                <div className="song-info-item">
                  <span className="song-info-label">🎵 Nada Asli</span>
                  <span className="song-info-value">{lyricsOriginalKey}</span>
                </div>
              )}
              {timeSignature && (
                <div className="song-info-item">
                  <span className="song-info-label">🎼 Time</span>
                  <span className="song-info-value">{timeSignature}</span>
                </div>
              )}
              {tempo && (
                <div className="song-info-item song-info-tempo-item">
                  <span className="song-info-label">⏱️ Tempo</span>
                  <TempoControl
                    tempo={tempo}
                    scrollSpeed={scrollSpeed}
                    setScrollSpeed={setScrollSpeed}
                    isMetronomeActive={isMetronomeActive}
                    setIsMetronomeActive={setIsMetronomeActive}
                  />
                </div>
              )}
              {!showMinimalMetadata && genre && (
                <div className="song-info-item">
                  <span className="song-info-label">🎸 Genre</span>
                  <span className="song-info-value">{genre}</span>
                </div>
              )}
              {!showMinimalMetadata && arrangementStyle && (
                <div className="song-info-item song-info-block song-info-block-arrangement">
                  <span className="song-info-label">🎷 Aransemen</span>
                  <span className="song-info-value">{arrangementStyle}</span>
                </div>
              )}
              {!showMinimalMetadata && keyboardPatch && (
                <div className="song-info-item song-info-block song-info-block-keyboard">
                  <span className="song-info-label">🎹 Keyboard Patch</span>
                  <span className="song-info-value">{keyboardPatch}</span>
                </div>
              )}
              {!showMinimalMetadata && (
                <div className="song-info-item song-info-mastery-block">
                  <span className="song-info-label">✅ Sudah Dikuasai</span>
                  <span className="song-info-value song-info-mastery-count">
                    {Array.isArray(masteredBy) ? masteredBy.length : 0} orang
                  </span>
                  {masteredNames && (
                    <p className="song-info-mastery-members">{masteredNames}</p>
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
                  {!canMarkMastery && (
                    <p className="song-info-mastery-note">
                      Tombol aktif saat Anda bisa menandai lagu.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {performanceMode && !lyricsMode && pianoRecommendation?.recommendedKey && (
        <div className="song-info-item song-info-piano-reco-block">
          <div className="song-info-piano-reco-header">
            <span className="song-info-label">🎹 Key Kibordis</span>
            <button
              type="button"
              className="btn btn-secondary song-info-piano-reco-toggle"
              onClick={() => setIsKeyboardistKeyCollapsed((prev) => !prev)}
              aria-expanded={!isKeyboardistKeyCollapsed}
              title={isKeyboardistKeyCollapsed ? 'Buka detail key kibordis' : 'Tutup detail key kibordis'}
            >
              {isKeyboardistKeyCollapsed ? '▼' : '▲'}
            </button>
          </div>
          {!isKeyboardistKeyCollapsed && (
            <>
              <span className="song-info-value">{pianoRecommendation.recommendedKey}</span>
              <span className="song-info-piano-reco-distance">
                Jarak dari key dasar: {recommendedTransposeText} semitone
              </span>
              {typeof onApplyRecommendedTranspose === 'function' && (
                <button
                  type="button"
                  className="btn btn-secondary song-info-piano-reco-btn"
                  onClick={() => onApplyRecommendedTranspose(pianoRecommendation.transposeFromCurrent)}
                  disabled={pianoRecommendation.transposeFromCurrent === 0}
                  title="Terapkan transpose key kibordis"
                >
                  Terapkan Key Kibordis
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
