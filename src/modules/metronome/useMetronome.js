import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook untuk mengelola metronome berbasis Web Audio API
 * @param {boolean} isActive - Status aktif metronome
 * @param {number|string} tempo - Tempo BPM
 * @returns {function} setIsActive - Setter untuk status aktif
 */
export default function useMetronome(isActive, tempo) {
  const [isMetronomeActive, setIsMetronomeActive] = useState(isActive);
  const audioContextRef = useRef(null);
  const intervalRef = useRef(null);

  // Helper untuk inisialisasi AudioContext
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        return null;
      }
    }
    return audioContextRef.current;
  };

  useEffect(() => {
    if (!isMetronomeActive || !tempo) return;
    const audioContext = getAudioContext();
    if (!audioContext) {
      setIsMetronomeActive(false);
      return;
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const currentTempo = parseInt(tempo) || 120;
    const beatDuration = 60 / currentTempo;
    const noteLength = 0.1;
    let beatCount = 0;
    let nextNoteTime = audioContext.currentTime;
    const playBeat = () => {
      const osc = audioContext.createOscillator();
      const env = audioContext.createGain();
      osc.frequency.value = beatCount % 4 === 0 ? 800 : 400;
      osc.connect(env);
      env.connect(audioContext.destination);
      env.gain.setValueAtTime(0.3, audioContext.currentTime);
      env.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + noteLength);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + noteLength);
      beatCount++;
    };
    intervalRef.current = setInterval(() => {
      if (nextNoteTime <= audioContext.currentTime + 0.1) {
        playBeat();
        nextNoteTime += beatDuration;
      }
    }, 10);
    return () => clearInterval(intervalRef.current);
  }, [isMetronomeActive, tempo]);

  return [isMetronomeActive, setIsMetronomeActive];
}
