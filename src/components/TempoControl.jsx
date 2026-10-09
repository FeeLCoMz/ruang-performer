import React from "react";
import { getTempoTerm } from "../utils/musicNotationUtils.js";

export default function TempoControl({ tempo, scrollSpeed, setScrollSpeed, isMetronomeActive, setIsMetronomeActive }) {
  const tempoTerm = getTempoTerm(scrollSpeed);
  const normalizedBpm = Math.max(40, Math.min(240, Number(scrollSpeed) || Number(tempo) || 120));
  const blinkDurationMs = Math.round(60000 / normalizedBpm);

  return (
    <>
      <div className="song-info-tempo-controls">
        <button
          onClick={() => setScrollSpeed(Math.max(40, scrollSpeed - 1))}
          className="btn btn-secondary"
          title="Tempo down 1 BPM"
          aria-label="Tempo down 1 BPM"
        >
          −
        </button>
        <div className="song-info-tempo-display">
          <span
            className="song-info-tempo-led"
            style={{ animationDuration: `${blinkDurationMs}ms` }}
            aria-hidden="true"
          />
          <span className="song-info-value">{scrollSpeed}</span>
          <span className="song-info-tempo-unit">BPM</span>
        </div>
        <button
          onClick={() => setScrollSpeed(Math.min(240, scrollSpeed + 1))}
          className="btn btn-secondary"
          title="Tempo up 1 BPM"
          aria-label="Tempo up 1 BPM"
        >
          +
        </button>
        <button
          onClick={() => setIsMetronomeActive(!isMetronomeActive)}
          className={`btn btn-secondary ${isMetronomeActive ? "active" : ""}`}
          title={isMetronomeActive ? "Stop metronome" : "Start metronome"}
          aria-label={isMetronomeActive ? "Stop metronome" : "Start metronome"}
        >
          {isMetronomeActive ? "⏹️" : "▶️"}
        </button>
        {tempoTerm && (
          <span className="song-info-tempo-term" title={`Istilah tempo: ${tempoTerm}`}>
            {tempoTerm}
          </span>
        )}
      </div>
      {isMetronomeActive && (
        <div className="song-info-tempo-status">♪ Playing...</div>
      )}
    </>
  );
}
