import React, { useEffect, useState } from "react";
import { transposeChord, recommendPianoFriendlyKey, getNoteIndex } from "../utils/chordUtils.js";
import ExpandButton from "./ExpandButton.jsx";

/**
 * SongChordsAnalyzer
 * Komponen analisis chord (total, unique, daftar chord)
 */
export default function SongChordsAnalyzer({
  showChordAnalyzer,
  setShowChordAnalyzer,
  chordStats,
  transpose,
  songKey,
  onApplyRecommendedTranspose,
}) {
  const parseModeFromKey = (keyLabel = "") => {
    const normalized = String(keyLabel).trim().toLowerCase();
    return normalized.endsWith("m") && !normalized.includes("maj") ? "minor" : "major";
  };

  const extractKeyRoot = (keyLabel = "") => {
    const match = String(keyLabel).trim().match(/^([A-G][#b]?)/);
    return match ? match[1] : null;
  };

  const getKeyRelationLabel = (baseKey, candidateKey) => {
    const baseRoot = extractKeyRoot(baseKey);
    const candidateRoot = extractKeyRoot(candidateKey);
    if (!baseRoot || !candidateRoot) return "opsi lain";

    const baseMode = parseModeFromKey(baseKey);
    const candidateMode = parseModeFromKey(candidateKey);
    const baseIdx = getNoteIndex(baseRoot);
    const candidateIdx = getNoteIndex(candidateRoot);
    if (baseIdx == null || candidateIdx == null) return "opsi lain";

    if (baseRoot === candidateRoot && baseMode !== candidateMode) {
      return candidateMode === "minor" ? "parallel minor" : "parallel major";
    }

    const interval = (candidateIdx - baseIdx + 12) % 12;

    if (baseMode === "major" && candidateMode === "minor" && interval === 9) {
      return "relative minor";
    }
    if (baseMode === "minor" && candidateMode === "major" && interval === 3) {
      return "relative major";
    }

    return "opsi lain";
  };

  const getKeyRelationTone = (relation) => {
    if (relation.startsWith("relative")) return "relative";
    if (relation.startsWith("parallel")) return "parallel";
    return "other";
  };

  const getKeyRelationPriority = (tone) => {
    if (tone === "relative") return 1;
    if (tone === "parallel") return 2;
    return 3;
  };

  const getKeyRelationDescription = (relation) => {
    if (relation === "relative minor") {
      return "Relative minor: berbagi key signature yang sama dengan key mayor utama.";
    }
    if (relation === "relative major") {
      return "Relative major: berbagi key signature yang sama dengan key minor utama.";
    }
    if (relation === "parallel minor") {
      return "Parallel minor: root sama, mode berubah dari mayor ke minor.";
    }
    if (relation === "parallel major") {
      return "Parallel major: root sama, mode berubah dari minor ke mayor.";
    }
    return "Alternatif key lain yang masih punya kecocokan progresi chord.";
  };

  const usageCounts = Array.isArray(chordStats?.usageCounts) ? chordStats.usageCounts : [];
  const displayedChordItems = usageCounts.length > 0
    ? usageCounts
    : (chordStats?.chords || []).map((chord) => ({ chord, count: 1 }));

  const detectedKeyInfo = chordStats?.detectedKey || null;
  const detectedKeyLabel = detectedKeyInfo?.key
    ? (transpose !== 0 ? transposeChord(detectedKeyInfo.key, transpose) : detectedKeyInfo.key)
    : '-';
  const detectedKeyModeLabel = detectedKeyInfo?.mode === 'minor' ? 'Minor' : 'Mayor';
  const detectedAlternativeKeyItems = (detectedKeyInfo?.alternatives || [])
    .map((candidateKey) => (transpose !== 0 ? transposeChord(candidateKey, transpose) : candidateKey))
    .map((candidateKey) => ({
      key: candidateKey,
      relation: getKeyRelationLabel(detectedKeyLabel, candidateKey),
      tone: getKeyRelationTone(getKeyRelationLabel(detectedKeyLabel, candidateKey)),
      description: getKeyRelationDescription(getKeyRelationLabel(detectedKeyLabel, candidateKey)),
    }))
    .sort((a, b) => {
      const relationPriorityDiff = getKeyRelationPriority(a.tone) - getKeyRelationPriority(b.tone);
      if (relationPriorityDiff !== 0) return relationPriorityDiff;
      return a.key.localeCompare(b.key);
    });

  const pianoRecommendation = recommendPianoFriendlyKey({
    chords: chordStats.chords,
    key: songKey,
    transpose,
  });
  const [applyNotice, setApplyNotice] = useState("");

  const getDifficultyLevel = (score = 0) => {
    if (score <= 2) return { label: "Sangat Mudah", tone: "very-easy" };
    if (score <= 5) return { label: "Mudah", tone: "easy" };
    if (score <= 8) return { label: "Sedang", tone: "medium" };
    return { label: "Menantang", tone: "hard" };
  };

  const difficultyLevel = pianoRecommendation ? getDifficultyLevel(pianoRecommendation.score) : null;
  const currentScore = pianoRecommendation ? pianoRecommendation.score + pianoRecommendation.improvement : null;
  const currentDifficulty = currentScore !== null ? getDifficultyLevel(currentScore) : null;
  const difficultyRank = {
    "very-easy": 1,
    easy: 2,
    medium: 3,
    hard: 4,
  };
  const levelShift = difficultyLevel && currentDifficulty
    ? difficultyRank[currentDifficulty.tone] - difficultyRank[difficultyLevel.tone]
    : 0;
  const comparisonMessage = levelShift > 0
    ? `Lebih mudah ${levelShift} level dari key saat ini (${currentDifficulty.label}).`
    : levelShift < 0
      ? `Lebih menantang ${Math.abs(levelShift)} level dari key saat ini (${currentDifficulty.label}).`
      : `Setara dengan key saat ini (${currentDifficulty ? currentDifficulty.label : "-"}).`;
  const comparisonTone = levelShift > 0 ? "improved" : levelShift < 0 ? "harder" : "same";
  const difficultyReason = pianoRecommendation
    ? `${pianoRecommendation.accidentalChordCount}/${pianoRecommendation.totalChords} chord mengandung accidental (#/b), key signature ${pianoRecommendation.keyAccidentalCount} accidental.`
    : "";

  useEffect(() => {
    if (!applyNotice) return undefined;
    const timer = setTimeout(() => setApplyNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [applyNotice]);

  const handleApplyRecommendedTranspose = (relativeSteps) => {
    if (typeof onApplyRecommendedTranspose !== "function") return;
    onApplyRecommendedTranspose(relativeSteps);
    const nextTranspose = transpose + relativeSteps;
    const formatted = nextTranspose > 0 ? `+${nextTranspose}` : `${nextTranspose}`;
    setApplyNotice(`Transpose diterapkan ke ${formatted}.`);
  };

  return (
    <div className="song-panel">
      <div className="song-lyrics-analyzer-header">
        <ExpandButton
          isExpanded={showChordAnalyzer}
          setIsExpanded={setShowChordAnalyzer}
          icon="🎵"
          label="Analisis Chord"
          ariaLabel={showChordAnalyzer ? "Sembunyikan analisis chord" : "Tampilkan analisis chord"}
        />
      </div>
      {showChordAnalyzer && (
        <>
          <div className="song-lyrics-analyzer-grid">
            <div className="song-lyrics-analyzer-stat">
              <div className="song-lyrics-analyzer-stat-label">Total Chord</div>
              <div className="song-lyrics-analyzer-stat-value">{chordStats.count}</div>
            </div>
            <div className="song-lyrics-analyzer-stat">
              <div className="song-lyrics-analyzer-stat-label">Unique Chord</div>
              <div className="song-lyrics-analyzer-stat-value">{chordStats.chords.length}</div>
            </div>
            <div className="song-lyrics-analyzer-stat">
              <div className="song-lyrics-analyzer-stat-label">Estimasi Key</div>
              <div className="song-lyrics-analyzer-stat-value song-lyrics-analyzer-key-value">{detectedKeyLabel}</div>
              {detectedKeyInfo && (
                <div className="song-lyrics-analyzer-stat-subvalue">
                  {detectedKeyModeLabel} • Akurasi {detectedKeyInfo.confidence}%
                </div>
              )}
              {detectedAlternativeKeyItems.length > 0 && (
                <>
                  <div className="song-lyrics-analyzer-stat-subvalue">Alternatif Key:</div>
                  <div className="song-lyrics-analyzer-key-alt-list">
                    {detectedAlternativeKeyItems.map((item) => (
                      <span
                        key={`${item.key}-${item.relation}`}
                        className={`song-lyrics-analyzer-key-alt-badge song-lyrics-analyzer-key-alt-badge-${item.tone}`}
                        title={item.description}
                        aria-label={`${item.key}, ${item.relation}. ${item.description}`}
                      >
                        {item.key}
                        <span className="song-lyrics-analyzer-key-alt-relation" title={item.description}>{item.relation}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="song-lyrics-analyzer-chords">
            <label className="song-lyrics-analyzer-chords-label">Chord yang Digunakan:</label>
            <div className="song-lyrics-analyzer-chords-list">
              {displayedChordItems.length > 0 ? (
                displayedChordItems.map(({ chord, count }) => (
                  <span key={chord} className="song-lyrics-analyzer-chord-tag">
                    <span className="song-lyrics-analyzer-chord-name">{transpose !== 0 ? transposeChord(chord, transpose) : chord}</span>
                    <span className="song-lyrics-analyzer-chord-count">{count}x</span>
                  </span>
                ))
              ) : (
                <span className="song-lyrics-analyzer-chord-tag song-lyrics-analyzer-chord-empty">Tidak ada chord ditemukan</span>
              )}
            </div>
          </div>
          {pianoRecommendation && pianoRecommendation.recommendedKey && (
            <div className="song-lyrics-analyzer-piano-reco">
              <div className="song-lyrics-analyzer-piano-reco-title">Rekomendasi Nada Dasar Piano</div>
              {difficultyLevel && (
                <div className={`song-lyrics-analyzer-piano-reco-difficulty song-lyrics-analyzer-piano-reco-difficulty-${difficultyLevel.tone}`}>
                  Tingkat Kesulitan: {difficultyLevel.label}
                  <span
                    className="song-lyrics-analyzer-piano-reco-help"
                    tabIndex={0}
                    aria-label={`Alasan level kesulitan: ${difficultyReason}`}
                  >
                    i
                    <span className="song-lyrics-analyzer-piano-reco-tooltip">{difficultyReason}</span>
                  </span>
                </div>
              )}
              <div className="song-lyrics-analyzer-piano-reco-key">{pianoRecommendation.recommendedKey}</div>
              <div className="song-lyrics-analyzer-piano-reco-note">
                {pianoRecommendation.transposeFromCurrent === 0
                  ? "Nada dasar saat ini sudah termasuk yang mudah untuk piano."
                  : `Coba transpose ${pianoRecommendation.transposeFromCurrent > 0 ? `+${pianoRecommendation.transposeFromCurrent}` : pianoRecommendation.transposeFromCurrent} semitone dari posisi sekarang untuk voicing yang lebih nyaman.`}
              </div>
              {typeof onApplyRecommendedTranspose === "function" && (
                <div className="song-lyrics-analyzer-piano-reco-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleApplyRecommendedTranspose(pianoRecommendation.transposeFromCurrent)}
                    disabled={pianoRecommendation.transposeFromCurrent === 0}
                  >
                    Terapkan Transpose Rekomendasi
                  </button>
                  {applyNotice && <div className="song-lyrics-analyzer-piano-reco-notice">{applyNotice}</div>}
                </div>
              )}
              <div className={`song-lyrics-analyzer-piano-reco-compare song-lyrics-analyzer-piano-reco-compare-${comparisonTone}`}>
                {comparisonMessage}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
