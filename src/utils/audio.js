// Simple Web Audio helpers to play notes/chords

let audioCtx;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  return audioCtx;
}

const NOTE_INDEX = {
  'C': -9,
  'C#': -8,
  'Db': -8,
  'D': -7,
  'D#': -6,
  'Eb': -6,
  'E': -5,
  'F': -4,
  'F#': -3,
  'Gb': -3,
  'G': -2,
  'G#': -1,
  'Ab': -1,
  'A': 0,
  'A#': 1,
  'Bb': 1,
  'B': 2,
};

export function noteToFrequency(note, octave = 4) {
  const n = NOTE_INDEX[note];
  if (n === undefined) return null;
  // Distance in semitones from A4
  const semitones = n + (octave - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
}

export function playNote(note, options = {}) {
  const {
    octave = 4,
    duration = 0.5, // seconds
    type = 'sine', // 'sine' | 'triangle' | 'square' | 'sawtooth'
    gain = 0.08,
  } = options;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if necessary (autoplay policies)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const freq = noteToFrequency(note, octave);
  if (!freq) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  // Simple ADS-ish envelope
  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.01);
  amp.gain.linearRampToValueAtTime(gain * 0.7, now + 0.08);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.1, duration));

  osc.connect(amp);
  amp.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + Math.max(0.15, duration + 0.02));

  // Cleanup
  osc.onended = () => {
    try {
      osc.disconnect();
      amp.disconnect();
    } catch {
      // Node sudah ter-disconnect lebih dulu — abaikan error ini.
    }
  };
}

export function playChord(notes, options = {}) {
  const { octave = 4, duration = 0.8, type = 'triangle', gain = 0.06 } = options;
  if (!Array.isArray(notes) || notes.length === 0) return;
  notes.forEach(n => playNote(n, { octave, duration, type, gain }));
}
