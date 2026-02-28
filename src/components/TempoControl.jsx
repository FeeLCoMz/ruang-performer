import React from "react";
import { getTempoTerm } from "../utils/musicNotationUtils.js";

export default function TempoControl({ tempo, scrollSpeed, setScrollSpeed, isMetronomeActive, setIsMetronomeActive }) {
  const tempoTerm = getTempoTerm(scrollSpeed);
  return (
    <>
      <div className="song-info-tempo-controls">
        <button
          onClick={() => setScrollSpeed(Math.max(40, scrollSpeed - 5))}
          className="btn btn-secondary"
          title="Tempo down"
          aria-label="Tempo down"
        >
          −
        </button>
        <div className="song-info-tempo-display">
          <span className="song-info-value">{scrollSpeed}</span>
          <span className="song-info-tempo-unit">BPM</span>
        </div>
        <button
          onClick={() => setScrollSpeed(Math.min(240, scrollSpeed + 5))}
          className="btn btn-secondary"
          title="Tempo up"
          aria-label="Tempo up"
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
      </div>
      <span className="song-info-tempo-term">
        {tempoTerm && <span>{tempoTerm}</span>}
      </span>
      {isMetronomeActive && (
        <div className="song-info-tempo-status">♪ Playing...</div>
      )}
    </>
  );
}
