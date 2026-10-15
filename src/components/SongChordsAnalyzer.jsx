import React from 'react';
import { transposeChord, getNoteIndex } from '../utils/chordUtils.js';

/**
 * SongChordsAnalyzer
 * Komponen analisis chord (unique chord, estimasi key, daftar chord).
 * Konten dirender langsung (inline) — dipakai sebagai konten tab Analisis.
 */
export default function SongChordsAnalyzer({
  chordStats,
  transpose,
  song = null,
  songSections = [],
}) {
  const parseModeFromKey = (keyLabel = '') => {
    const normalized = String(keyLabel).trim().toLowerCase();
    return normalized.endsWith('m') && !normalized.includes('maj') ? 'minor' : 'major';
  };

  const extractKeyRoot = (keyLabel = '') => {
    const match = String(keyLabel).trim().match(/^([A-G][#b]?)/);
    return match ? match[1] : null;
  };

  const getKeyRelationLabel = (baseKey, candidateKey) => {
    const baseRoot = extractKeyRoot(baseKey);
    const candidateRoot = extractKeyRoot(candidateKey);
    if (!baseRoot || !candidateRoot) return 'opsi lain';

    const baseMode = parseModeFromKey(baseKey);
    const candidateMode = parseModeFromKey(candidateKey);
    const baseIdx = getNoteIndex(baseRoot);
    const candidateIdx = getNoteIndex(candidateRoot);
    if (baseIdx == null || candidateIdx == null) return 'opsi lain';

    if (baseRoot === candidateRoot && baseMode !== candidateMode) {
      return candidateMode === 'minor' ? 'parallel minor' : 'parallel major';
    }

    const semitoneDiff = (candidateIdx - baseIdx + 12) % 12;
    if (semitoneDiff === 7) return 'dominant';
    if (semitoneDiff === 5) return 'subdominant';
    if (semitoneDiff === 9) return 'relative minor';
    if (semitoneDiff === 3) return 'relative major';
    return 'opsi lain';
  };

  const getKeyRelationTone = (relation) => {
    if (relation.startsWith('relative')) return 'relative';
    if (relation.startsWith('parallel')) return 'parallel';
    if (relation === 'dominant' || relation === 'subdominant') return 'near';
    return 'other';
  };

  const getKeyRelationPriority = (tone) => {
    if (tone === 'relative') return 1;
    if (tone === 'near') return 2;
    if (tone === 'parallel') return 3;
    return 4;
  };

  const getKeyRelationDescription = (relation) => {
    if (relation === 'relative minor') {
      return 'Relative minor: berbagi key signature yang sama dengan key mayor utama.';
    }
    if (relation === 'relative major') {
      return 'Relative major: berbagi key signature yang sama dengan key minor utama.';
    }
    if (relation === 'parallel minor') {
      return 'Parallel minor: root sama, mode berubah dari mayor ke minor.';
    }
    if (relation === 'parallel major') {
      return 'Parallel major: root sama, mode berubah dari minor ke mayor.';
    }
    if (relation === 'dominant') {
      return 'Dominant: kuint di atas key utama — hubungan sangat dekat.';
    }
    if (relation === 'subdominant') {
      return 'Subdominant: kuart di atas key utama — juga dekat.';
    }
    return 'Alternatif key lain yang masih punya kecocokan progresi chord.';
  };

  const usageCounts = Array.isArray(chordStats?.usageCounts) ? chordStats.usageCounts : [];
  const displayedChordItems = usageCounts.length > 0
    ? usageCounts
    : (chordStats?.chords || []).map((chord) => ({ chord, count: 1 }));

  // Analisis struktur lagu: seberapa beragam progresi chord-nya.
  const uniqueChordCount = chordStats?.chords?.length || 0;
  const totalChordHits = displayedChordItems.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const progressionVariety = totalChordHits > 0
    ? Math.round((uniqueChordCount / totalChordHits) * 100)
    : 0;
  const structureLabel = uniqueChordCount === 0
    ? 'Belum ada chord'
    : progressionVariety >= 60 ? 'Kompleks — banyak variasi chord'
      : progressionVariety >= 35 ? 'Sedang — progresi bervariasi'
        : 'Sederhana — progresi repetitif (mudah dihafal)';

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

  return (
    <div className="song-panel song-lyrics-analyzer-inline-panel">
      <div className="song-lyrics-analyzer-grid">
        <div className="song-lyrics-analyzer-stat">
          <div className="song-lyrics-analyzer-stat-label">Unique Chord</div>
          <div className="song-lyrics-analyzer-stat-value">{chordStats?.chords?.length || 0}</div>
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

      {/* Analisis struktur lagu: label ringkasan + urutan seksi lagu */}
      <div className="song-lyrics-analyzer-section">
        <label className="song-lyrics-analyzer-chords-label">🏗️ Struktur Lagu:</label>
        <div className="song-lyrics-analyzer-structure">
          <span className="song-lyrics-analyzer-structure-label">{structureLabel}</span>
          <span className="song-lyrics-analyzer-structure-detail">
            {uniqueChordCount} chord unik dari {totalChordHits} pemakaian • variasi {progressionVariety}%
          </span>
        </div>
        {Array.isArray(songSections) && songSections.length > 0 && (
          <div className="song-lyrics-analyzer-section-list" aria-label="Urutan seksi lagu">
            {songSections.map((section, i) => (
              <span key={`${section.key}-${section.lineNumber}`} className="song-lyrics-analyzer-section-item">
                <span className="song-lyrics-analyzer-section-order">{i + 1}</span>
                <span className="song-lyrics-analyzer-section-name">{section.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
