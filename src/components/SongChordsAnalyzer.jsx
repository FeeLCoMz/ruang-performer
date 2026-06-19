import React, { useEffect, useState } from "react";
import { transposeChord, recommendPianoFriendlyKey } from "../utils/chordUtils.js";
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
          </div>
          <div className="song-lyrics-analyzer-chords">
            <label className="song-lyrics-analyzer-chords-label">Chord yang Digunakan:</label>
            <div className="song-lyrics-analyzer-chords-list">
              {chordStats.chords.length > 0 ? (
                chordStats.chords.map((chord) => (
                  <span key={chord} className="song-lyrics-analyzer-chord-tag">
                    {transpose !== 0 ? transposeChord(chord, transpose) : chord}
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
