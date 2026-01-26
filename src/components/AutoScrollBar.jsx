import React, { useRef, useEffect, useState } from 'react';

// Auto scroll bar + tempo/metronome indicator for performance mode
export default function AutoScrollBar({ tempo = 80, onScrollChange }) {
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(tempo); // BPM
  const [beat, setBeat] = useState(0);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const beatTimeRef = useRef(null);
  const barBeatRef = useRef(0);

  useEffect(() => {
    if (scrolling) {
      lastTimeRef.current = performance.now();
      beatTimeRef.current = performance.now();
      barBeatRef.current = 0;
      const scrollStep = () => {
        const now = performance.now();
        // Metronome beat
        if (now - beatTimeRef.current > 60000 / speed) {
          setBeat(b => (b + 1) % 4);
          beatTimeRef.current = now;
          barBeatRef.current += 1;
          if (barBeatRef.current >= 4) {
            window.scrollBy({ top: 50, behavior: 'smooth' }); // 32px = 1 line/bar, adjust as needed
            barBeatRef.current = 0;
          }
        }
        if (onScrollChange) onScrollChange(speed);
        frameRef.current = requestAnimationFrame(scrollStep);
      };
      frameRef.current = requestAnimationFrame(scrollStep);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [scrolling, speed, onScrollChange]);

  return (
    <div className="auto-scroll-bar">
      <button
        className={scrolling ? 'auto-scroll-btn active' : 'auto-scroll-btn'}
        onClick={() => setScrolling(s => !s)}
      >{scrolling ? '⏸️ Stop Scroll' : '▶️ Auto Scroll'}</button>
      <label className="tempo-label">
        Tempo/BPM:
        <input
          type="number"
          min={40}
          max={240}
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="tempo-input"
        />
      </label>
      <div className="metronome-indicator">
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            className={beat === i ? 'metronome-dot active' : 'metronome-dot'}
          >●</span>
        ))}
      </div>
    </div>
  );
}
