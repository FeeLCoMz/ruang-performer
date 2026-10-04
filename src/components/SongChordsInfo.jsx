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
  detectedInstruments = [],
  showSongInfo,
  setShowSongInfo,
  title,
  artist,
  contributor,
  performanceMode,
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
  const showActions = !performanceMode;
  const showMetadata = performanceMode || showSongInfo;
  const showMinimalMetadata = performanceMode;
  const showKeyEasyRecommendation = !!pianoRecommendation?.recommendedKey;
  const metadataItems = [];
  const performanceMetadataItems = [];
  const detectedInstrumentList = Array.isArray(detectedInstruments) ? detectedInstruments.filter(Boolean) : [];
  const [isKeyboardistKeyCollapsed, setIsKeyboardistKeyCollapsed] = useState(true);
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
  const compactRecommendedTransposeText = recommendedTranspose === 0
    ? 'pas'
    : (recommendedTranspose > 0 ? `+${recommendedTranspose}` : `${recommendedTranspose}`);
  const hasPerformanceKeyOverride = performanceMode && Boolean(performanceKeyOverride);
  const baseDisplayKey = hasPerformanceKeyOverride
    ? performanceKeyOverride
    : (targetKey || originalKey || '');
  const transposedDisplayKey = (() => {
    if (hasPerformanceKeyOverride) return baseDisplayKey;
    if (!baseDisplayKey || !transpose) return baseDisplayKey;
    const shifted = transposeChord(baseDisplayKey, transpose);
    return shifted || baseDisplayKey;
  })();

  useEffect(() => {
    setIsKeyboardistKeyCollapsed(true);
  }, [pianoRecommendation?.recommendedKey, performanceMode]);

  if (baseDisplayKey) {
    metadataItems.push(`Key: ${transposedDisplayKey}`);
  }
  if (performanceMode) {
    if (baseDisplayKey) {
      performanceMetadataItems.push({
        key: 'key',
        icon: '🎹',
        render: (
          <TransposeKeyControl
            key="performance-key"
            originalKey={originalKey || baseDisplayKey}
            targetKey={targetKey || originalKey || baseDisplayKey}
            transpose={transpose || 0}
            onTransposeChange={setTranspose}
            compact
          />
        ),
      });
    }
    if (showKeyEasyRecommendation) {
      performanceMetadataItems.push({
        key: 'easy-key',
        render: (
          <>
            <span className="song-info-inline-icon" aria-hidden="true">🎹</span>
            <span className="song-info-inline-label">Key Mudah</span>
            <button
              type="button"
              className="btn btn-secondary song-info-piano-reco-btn song-info-inline-button"
              onClick={() => onApplyRecommendedTranspose?.(pianoRecommendation.transposeFromCurrent)}
              disabled={typeof onApplyRecommendedTranspose !== 'function' || pianoRecommendation.transposeFromCurrent === 0}
              title="Terapkan key mudah"
              aria-label="Gunakan key mudah yang disarankan"
            >
              {pianoRecommendation.recommendedKey}
            </button>
            <span className="song-info-inline-value">
              {compactRecommendedTransposeText}
            </span>
          </>
        ),
      });
    }
  }
  if (performanceMode && originalKey && originalKey !== transposedDisplayKey) {
    metadataItems.push(`Nada Asli: ${originalKey}`);
  }
  if (tempo) {
    metadataItems.push(`Tempo: ${tempo}`);
    if (performanceMode) {
      performanceMetadataItems.push({ key: 'tempo', icon: '⏱️', text: tempo });
    }
  }
  if (timeSignature) {
    metadataItems.push(`Time: ${timeSignature}`);
    if (performanceMode) {
      performanceMetadataItems.push({ key: 'time', icon: '🎼', text: timeSignature });
    }
  }
  if (genre) {
    metadataItems.push(`Genre: ${genre}`);
    if (performanceMode) {
      performanceMetadataItems.push({ key: 'genre', icon: '🎸', text: genre });
    }
  }
  if (lyricsOriginalKey) {
    metadataItems.push(`Original: ${lyricsOriginalKey}`);
  }
  if (detectedInstrumentList.length) {
    const instrumentText = detectedInstrumentList.join(', ');
    metadataItems.push(`Instrumen: ${instrumentText}`);
    if (performanceMode) {
      performanceMetadataItems.push({
        key: 'instruments',
        icon: '🎼',
        fullWidth: true,
        render: (
          <>
            <span className="song-info-inline-icon" aria-hidden="true">🎼</span>
            <span className="song-info-inline-label">Instrumen</span>
            <span className="song-info-instrument-badge-list">
              {detectedInstrumentList.map((instrument, instrumentIdx) => (
                <span
                  key={`${instrument}-${instrumentIdx}`}
                  className="song-info-instrument-badge"
                  title={`Instrumen: ${instrument}`}
                >
                  {instrument}
                </span>
              ))}
            </span>
          </>
        ),
      });
    }
  }

  return (
    <div className={`song-panel${performanceMode ? ' song-panel-performance' : ''}`}>
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
          {performanceMode && showMetadata && (
            <div className="song-info-inline-strip song-info-priority">
              <div className="song-info-inline-chip-list">
                {performanceMetadataItems.map((item) => (
                  <div
                    key={item.key}
                    className={`song-info-inline-chip${item.key === 'key' ? ' song-info-inline-chip-key' : ''}${item.fullWidth ? ' song-info-inline-chip-full' : ''}`}
                  >
                    {item.render ? (
                      item.render
                    ) : (
                      <>
                        <span className="song-info-inline-icon" aria-hidden="true">{item.icon}</span>
                        <span className="song-info-inline-value">{item.text}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
      {!performanceMode && showMetadata && (
        <div className={`song-info-compact-grid ${showMinimalMetadata ? 'song-info-compact-grid-minimal' : ''}`}>
          {showMinimalMetadata ? (
            <>
              <div className="song-info-item song-info-priority song-info-inline-strip">
                <span className="song-info-inline-text">
                  {metadataItems.join(' • ')}
                </span>
              </div>
              {!showKeyEasyRecommendation && null}
              {!performanceMode && showKeyEasyRecommendation && (
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
            </>
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
              {!performanceMode && showKeyEasyRecommendation && (
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
              {!showMinimalMetadata && timeSignature && (
                <div className="song-info-item">
                  <span className="song-info-label">🎼 Time</span>
                  <span className="song-info-value">{timeSignature}</span>
                </div>
              )}
              {!showMinimalMetadata && genre && (
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
              {!showMinimalMetadata && detectedInstrumentList.length > 0 && (
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
              {!showMinimalMetadata && (
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
