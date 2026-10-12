import React from "react";
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
  detectedInstruments = [],
  showSongInfo,
  setShowSongInfo,
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
  const showMetadata = showSongInfo;
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
      {/* Judul dan artis selalu di atas info lain */}
      {(title || artist || contributor) && (
        <div className="song-title-artist-block">
          {title && (
            <h1 className="song-title-main">{title}</h1>
          )}
          {artist && (
            <h2 className="song-artist-main">{artist}</h2>
          )}
          {contributor && showActions && (
            <div className="song-contributor-main" title={`Kontributor: ${contributor}`}>
              <span aria-hidden="true">👤</span>
              <span className="sr-only">Kontributor:</span>
              <span className="song-contributor-name">{contributor}</span>
            </div>
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
        </div>
      )}
      {showMetadata && (
        <div className="song-info-compact-grid">
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
              {showKeyEasyRecommendation && (
                <div className="song-info-item song-info-piano-reco-item">
                  <span className="song-info-label">🎹 Key Mudah</span>
                  <div className="song-info-piano-reco-body">
                    <button
                      type="button"
                      className="btn btn-secondary song-info-piano-reco-btn"
                      onClick={() => onApplyRecommendedTranspose?.(pianoRecommendation.transposeFromCurrent)}
                      disabled={typeof onApplyRecommendedTranspose !== 'function' || pianoRecommendation.transposeFromCurrent === 0}
                      title="Terapkan key mudah"
                      aria-label="Gunakan key mudah yang disarankan"
                    >
                      {pianoRecommendation.recommendedKey}
                    </button>
                    <span className="song-info-piano-reco-distance">
                      {pianoRecommendation.transposeFromCurrent === 0
                        ? 'Key dasar sudah cocok.'
                        : `Jarak dari key dasar: ${recommendedTransposeText} semitone`}
                    </span>
                  </div>
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
              {genre && (
                <div className="song-info-item">
                  <span className="song-info-label">🎸 Genre</span>
                  <span className="song-info-value">{genre}</span>
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
              {arrangementStyle && (
                <div className="song-info-item song-info-block song-info-block-arrangement">
                  <span className="song-info-label">🎷 Aransemen</span>
                  <span className="song-info-value">{arrangementStyle}</span>
                </div>
              )}
              {keyboardPatch && (
                <div className="song-info-item song-info-block song-info-block-keyboard">
                  <span className="song-info-label">🎹 Keyboard Patch</span>
                  <span className="song-info-value">{keyboardPatch}</span>
                </div>
              )}
              {detectedInstrumentList.length > 0 && (
                <div className="song-info-item song-info-block song-info-block-instruments">
                  <div className="song-info-block-header">
                    <span className="song-info-label">🎼 Instrumen</span>
                    <button
                      type="button"
                      className="btn btn-secondary song-info-copy-btn"
                      onClick={handleCopyInstruments}
                      title="Salin instrumen dan keyboard patch"
                      aria-label="Salin instrumen dan keyboard patch"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="song-info-chip-list" aria-label="Daftar instrumen terdeteksi">
                    {detectedInstrumentList.map((instrument) => (
                      <span key={`${instrument}-${Math.random()}`} className="song-info-chip">
                        {instrument}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="song-info-item song-info-mastery-block song-info-mastery-block-full">
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
        </div>
      )}
    </div>
  );
}
