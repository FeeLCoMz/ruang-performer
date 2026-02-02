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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: 'var(--secondary-bg)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      flexWrap: 'wrap'
    }}>
      <button
        className="btn-base"
        onClick={() => setScrolling(s => !s)}
        style={{
          padding: '8px 12px',
          fontSize: '0.9em',
          background: scrolling ? 'var(--primary-color)' : 'var(--secondary-bg)',
          color: scrolling ? 'white' : 'var(--text-primary)',
          borderColor: scrolling ? 'var(--primary-color)' : 'var(--border-color)'
        }}
        title="Toggle auto scroll"
      >
        {scrolling ? '⏸️ Scrolling' : '▶️ Auto Scroll'}
      </button>
      
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.9em',
        color: 'var(--text-muted)'
      }}>
        ⏱️ BPM:
        <input
          type="number"
          min={40}
          max={240}
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          style={{
            width: '60px',
            padding: '6px 8px',
            fontSize: '0.9em',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            background: 'var(--primary-bg)',
            color: 'var(--text-primary)'
          }}
        />
      </label>
      
      {scrolling && (
        <div style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          fontSize: '0.8em'
        }}>
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              style={{
                fontSize: '1.2em',
                opacity: beat === i ? 1 : 0.3,
                transition: 'opacity 0.1s'
              }}
            >
              ●
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
