import React, { useRef, useState } from 'react';

// Komponen TapTempo: klik/tap berulang untuk dapatkan BPM
export default function TapTempo({ onTempo, initialTempo = '', disabled = false }) {
  const [bpm, setBpm] = useState(initialTempo || '');
  const [taps, setTaps] = useState([]);
  const timeoutRef = useRef();

  function handleTap() {
    const now = Date.now();
    let newTaps = [...taps, now];
    // Hanya simpan 8 tap terakhir
    if (newTaps.length > 8) newTaps = newTaps.slice(-8);
    setTaps(newTaps);
    if (newTaps.length > 1) {
      const intervals = newTaps.slice(1).map((t, i) => t - newTaps[i]);
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpmVal = Math.round(60000 / avgMs);
      setBpm(bpmVal);
      if (onTempo) onTempo(bpmVal);
    }
    // Reset tap jika tidak tap lagi dalam 2.5 detik
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTaps([]), 2500);
  }

  function handleInput(e) {
    setBpm(e.target.value);
    if (onTempo) onTempo(e.target.value);
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',                  
    }}>
      <button
        type="button"
        onClick={handleTap}
        disabled={disabled}
        className="btn-base"        
        title="Tap to detect BPM"
      >
        🎯 Tap Tempo
      </button>         
      {taps.length > 0 && (
        <span style={{
          fontSize: '0.8em',
          color: 'var(--primary-color)',
          marginLeft: 'auto'
        }}>
          Taps: {taps.length}
        </span>
      )}
    </div>
  );
}
