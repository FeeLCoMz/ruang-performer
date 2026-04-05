import React, { useRef, useEffect, useState } from 'react';

/**
 * AutoScrollBar - Kontrol auto scroll dengan beat indicator
 * 
 * Props:
 * - tempo: number (BPM default, default 80)
 * - active: boolean
 * - speed: number
 * - onToggle: function
 * - onSpeedChange: function
 * - lyricsDisplayRef: ref
 * - currentBeat: number
 * - setCurrentBeat: function
 */
export default function AutoScrollBar({
  tempo = 120,
  active = false,
  speed = 120,
  onToggle,
  onSpeedChange,
  lyricsDisplayRef,
  currentBeat,
  setCurrentBeat,
}) {
  const [scrolling, setScrolling] = useState(active);
  const [currentSpeed, setCurrentSpeed] = useState(speed || tempo);
  const [beat, setBeat] = useState(currentBeat || 0);
  const frameRef = useRef(null);
  const beatTimeRef = useRef(null);
  const barBeatRef = useRef(0);
  const beatRef = useRef(currentBeat || 0);

  useEffect(() => {
    setCurrentSpeed(speed || tempo);
  }, [speed, tempo]);

  useEffect(() => {
    setScrolling(active);
  }, [active]);

  useEffect(() => {
    if (typeof currentBeat === 'number') {
      setBeat(currentBeat);
      beatRef.current = currentBeat;
    }
  }, [currentBeat]);

  const handleToggle = () => {
    if (typeof onToggle === 'function') {
      onToggle();
    } else {
      setScrolling((s) => !s);
    }
  };

  const handleSpeedChange = (nextSpeed) => {
    const normalized = Math.max(40, Math.min(240, Number(nextSpeed) || 40));
    setCurrentSpeed(normalized);
    if (typeof onSpeedChange === 'function') {
      onSpeedChange(normalized);
    }
  };

  useEffect(() => {
    if (scrolling) {
      beatTimeRef.current = performance.now();
      barBeatRef.current = 0;

      const scrollStep = () => {
        const now = performance.now();

        if (now - beatTimeRef.current > 60000 / currentSpeed) {
          const nextBeat = (beatRef.current + 1) % 4;
          setBeat(nextBeat);
          beatRef.current = nextBeat;
          beatTimeRef.current = now;
          barBeatRef.current += 1;

          if (typeof setCurrentBeat === 'function') {
            setCurrentBeat(nextBeat);
          }

          if (barBeatRef.current >= 4) {
            if (lyricsDisplayRef && lyricsDisplayRef.current) {
              if (lyricsDisplayRef.current === document.body || lyricsDisplayRef.current.classList.contains('karaoke-lyrics-page')) {
                window.scrollBy({ top: 50, behavior: 'smooth' });
              } else {
                lyricsDisplayRef.current.scrollBy({ top: 50, behavior: 'smooth' });
              }
            }
            barBeatRef.current = 0;
          }
        }

        frameRef.current = requestAnimationFrame(scrollStep);
      };

      frameRef.current = requestAnimationFrame(scrollStep);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [scrolling, currentSpeed, lyricsDisplayRef, setCurrentBeat]);

  return (
    <div className="auto-scroll-bar">
      <div className="auto-scroll-controls">
        <button
          className={`auto-scroll-toggle ${scrolling ? 'active' : ''}`}
          onClick={handleToggle}
          title={scrolling ? 'Berhenti autoscroll' : 'Mulai autoscroll'}
          type="button"
        >
          <span className="auto-scroll-icon">
            {scrolling ? '⏸️' : '▶️'}
          </span>
          <span className="auto-scroll-text">
            {scrolling ? 'Scrolling' : 'Autoscroll'}
          </span>
        </button>

        <div className="auto-scroll-tempo">
          <label className="auto-scroll-tempo-label" htmlFor="auto-scroll-speed-range">
            <span className="auto-scroll-tempo-icon">⏱️</span>
            <span className="auto-scroll-tempo-text">Kecepatan</span>
          </label>
          <input
            id="auto-scroll-speed-range"
            type="range"
            min={40}
            max={240}
            value={currentSpeed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="auto-scroll-tempo-slider"
            title="Sesuaikan kecepatan autoscroll"
          />
          <input
            type="number"
            min={40}
            max={240}
            value={currentSpeed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="auto-scroll-tempo-input"
            title="Masukkan nilai BPM autoscroll"
          />
        </div>
      </div>

      {scrolling && (
        <div className="auto-scroll-beats">
          <span className="auto-scroll-beats-label">Beat:</span>
          <div className="auto-scroll-beat-dots">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`beat-dot ${beat === i ? 'active' : ''}`}
                aria-label={`Beat ${i + 1}${beat === i ? ' (current)' : ''}`}
              >
                ●
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
