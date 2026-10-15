import React from "react";
import { getTempoTerm } from "../utils/musicNotationUtils.js";

/**
 * TempoControl
 * Shared komponen tempo & metronome. Time signature terintegrasi: ditampilkan
 * sebagai chip kecil di sebelah display BPM.
 *
 * - variant="full"   (default): dipakai tab Info — baris kontrol dengan
 *   istilah tempo & status metronome di bawahnya.
 * - variant="compact": dipakai toolbar panel lirik — kapsul pill menyerupai
 *   AutoScrollControl, tanpa istilah tempo/status.
 */
export default function TempoControl({
  tempo,
  scrollSpeed,
  setScrollSpeed,
  isMetronomeActive,
  setIsMetronomeActive,
  timeSignature = '4/4',
  variant = 'full',
}) {
  const tempoTerm = getTempoTerm(scrollSpeed);
  const normalizedBpm = Math.max(40, Math.min(240, Number(scrollSpeed) || Number(tempo) || 120));
  const blinkDurationMs = Math.round(60000 / normalizedBpm);
  const isCompact = variant === 'compact';
  const isMini = variant === 'mini';
  const safeTimeSignature = String(timeSignature || '4/4').trim() || '4/4';

  const controls = (
    <>
      <button
        onClick={() => setScrollSpeed(Math.max(40, scrollSpeed - 1))}
        className={isMini ? "song-lyrics-tempo-step" : isCompact ? "song-lyrics-tempo-step" : "btn btn-secondary"}
        title="Tempo down 1 BPM"
        aria-label="Tempo down 1 BPM"
      >
        −
      </button>
      <div className={isCompact || isMini ? "song-lyrics-tempo-value" : "song-info-tempo-display"}>
        <span
          className="song-info-tempo-led"
          style={{ animationDuration: `${blinkDurationMs}ms` }}
          aria-hidden="true"
        />
        <span className={isCompact || isMini ? "song-lyrics-tempo-bpm" : "song-info-value"}>{normalizedBpm}</span>
        {!isMini && <span className={isCompact ? "song-lyrics-tempo-unit" : "song-info-tempo-unit"}>BPM</span>}
        {!isMini && (
          <span
            className="song-info-time-signature"
            title={`Time signature: ${safeTimeSignature}`}
            aria-label={`Time signature ${safeTimeSignature}`}
          >
            {safeTimeSignature}
          </span>
        )}
      </div>
      <button
        onClick={() => setScrollSpeed(Math.min(240, scrollSpeed + 1))}
        className={isMini ? "song-lyrics-tempo-step" : isCompact ? "song-lyrics-tempo-step" : "btn btn-secondary"}
        title="Tempo up 1 BPM"
        aria-label="Tempo up 1 BPM"
      >
        +
      </button>
      <button
        onClick={() => setIsMetronomeActive(!isMetronomeActive)}
        className={
          isCompact || isMini
            ? `song-lyrics-tempo-metronome${isMetronomeActive ? " is-active" : ""}`
            : `btn btn-secondary ${isMetronomeActive ? "active" : ""}`
        }
        title={isMetronomeActive ? "Stop metronome" : "Start metronome"}
        aria-label={isMetronomeActive ? "Stop metronome" : "Start metronome"}
      >
        {isMetronomeActive ? "⏹" : "▶"}
      </button>
      {!isCompact && !isMini && tempoTerm && (
        <span className="song-info-tempo-term" title={`Istilah tempo: ${tempoTerm}`}>
          {tempoTerm}
        </span>
      )}
    </>
  );

  if (isCompact || isMini) {
    return (
      <div
        className={`song-lyrics-tempo-capsule${isMini ? " song-lyrics-tempo-capsule-mini" : ""}${isMetronomeActive ? " is-playing" : ""}`}
        role="group"
        aria-label="Tempo dan metronome"
      >
        {controls}
      </div>
    );
  }

  return (
    <>
      <div className="song-info-tempo-controls">{controls}</div>
      {isMetronomeActive && (
        <div className="song-info-tempo-status">♪ Playing...</div>
      )}
    </>
  );
}
