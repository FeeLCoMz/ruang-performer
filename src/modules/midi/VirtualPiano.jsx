import React, { useEffect, useRef, useState } from 'react';
import { connectMidi, isWebMidiSupported } from './midiAccess.js';
import { useMidiEnabled } from './useMidiEnabled.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiNumberToNoteName(midiNumber) {
  if (!Number.isFinite(Number(midiNumber))) return null;
  const safeMidi = Number(midiNumber);
  const noteIndex = safeMidi % 12;
  const noteName = NOTE_NAMES[noteIndex];
  return noteName;
}

function midiNumberToFrequency(midiNumber) {
  return 440 * (2 ** ((Number(midiNumber) - 69) / 12));
}

export default function VirtualPiano({ onKeySelect, isOpen, onClose, helperText, insertControls }) {
  const audioContextRef = useRef(null);
  const midiAccessRef = useRef(null);
  const dragStateRef = useRef(null);
  const positionRef = useRef(null);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [midiStatus, setMidiStatus] = useState('MIDI: belum terhubung');
  const [position, setPosition] = useState(null);
  const [midiEnabled, setMidiEnabled] = useMidiEnabled();

  useEffect(() => {
    if (!isOpen) return;

    // Default: tengah layar, dihitung dari ukuran popup saat dibuka.
    const popupEl = document.querySelector('.piano-popup');
    const popupWidth = popupEl ? popupEl.offsetWidth : 460;
    const popupHeight = popupEl ? popupEl.offsetHeight : 280;

    const nextPosition = {
      x: Math.max(Math.round((window.innerWidth - popupWidth) / 2), 20),
      y: Math.max(Math.round((window.innerHeight - popupHeight) / 2), 20),
    };

    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, [isOpen]);

  // Escape closes the piano from the keyboard, so the popup never traps focus
  // for users who opened it with Alt+P and never reach for the mouse.
  useEffect(() => {
    if (!isOpen || typeof onClose !== 'function') return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const getClientPoint = (event) => {
      if (event && typeof event.touches !== 'undefined' && event.touches[0]) {
        return { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY };
      }
      return { clientX: event?.clientX ?? 0, clientY: event?.clientY ?? 0 };
    };

    const handleDragMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const point = getClientPoint(event);
      const maxX = Math.max(20, window.innerWidth - 260);
      const maxY = Math.max(20, window.innerHeight - 220);
      const nextX = Math.min(Math.max(dragState.originX + (point.clientX - dragState.startX), 20), maxX);
      const nextY = Math.min(Math.max(dragState.originY + (point.clientY - dragState.startY), 20), maxY);
      const nextPosition = { x: nextX, y: nextY };
      positionRef.current = nextPosition;
      setPosition(nextPosition);
    };

    const handleDragEnd = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isOpen]);

  const handleHeaderPointerDown = (event) => {
    if (event.target.closest('.piano-popup-close')) return;

    const point = event && typeof event.touches !== 'undefined' && event.touches[0]
      ? event.touches[0]
      : event;
    dragStateRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };
    event.preventDefault();
  };

  // Koneksi MIDI input via modul src/modules/midi/midiAccess.js (plugin-style).
  // Komponen ini hanya menerjemahkan pesan note on/off; akses perangkat
  // dikelola modul agar bisa dipakai ulang komponen/hook lain.
  useEffect(() => {
    if (!isOpen || !midiEnabled || !isWebMidiSupported()) return undefined;

    let cancelled = false;

    connectMidi({
      onMessage: (event) => {
        const [statusByte, noteNumber, velocity] = event.data || [];
        const command = statusByte & 0xf0;
        const midiNote = Number(noteNumber);
        const noteName = midiNumberToNoteName(midiNote);

        if (!noteName) return;

        if (command === 0x90 && velocity > 0) {
          playNote(midiNumberToFrequency(midiNote), noteName, true);
        } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
          setActiveKeys((prev) => {
            const next = new Set(prev);
            next.delete(noteName);
            return next;
          });
        }
      },
      onStateChange: () => {
        if (cancelled) return;
        setMidiStatus('MIDI: siap menerima input');
      },
    }).then((connection) => {
      if (cancelled) {
        connection.dispose();
        return;
      }
      midiAccessRef.current = connection;
      setMidiStatus('MIDI: siap menerima input');
    }).catch(() => {
      if (!cancelled) {
        setMidiStatus(isMidiEnabled()
          ? 'MIDI: browser menolak akses perangkat'
          : 'MIDI: dimatikan pengguna');
      }
    });

    return () => {
      cancelled = true;
      if (midiAccessRef.current) {
        midiAccessRef.current.dispose();
        midiAccessRef.current = null;
      }
    };
  }, [isOpen, midiEnabled]);

  if (!isOpen) return null;

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        console.error('Failed to create AudioContext:', err);
        return null;
      }
    }
    return audioContextRef.current;
  };

  const playNote = (frequency, note, isMidiTriggered = false) => {
    if (onKeySelect) {
      onKeySelect(note);
    }

    const audioContext = getAudioContext();
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);

    setActiveKeys((prev) => new Set(prev).add(note));
    setTimeout(() => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }, 200);
  };

  const keys = [
    { note: 'C', frequency: 261.63, isBlack: false },
    { note: 'C#', frequency: 277.18, isBlack: true },
    { note: 'D', frequency: 293.66, isBlack: false },
    { note: 'D#', frequency: 311.13, isBlack: true },
    { note: 'E', frequency: 329.63, isBlack: false },
    { note: 'F', frequency: 349.23, isBlack: false },
    { note: 'F#', frequency: 369.99, isBlack: true },
    { note: 'G', frequency: 392.00, isBlack: false },
    { note: 'G#', frequency: 415.30, isBlack: true },
    { note: 'A', frequency: 440.00, isBlack: false },
    { note: 'A#', frequency: 466.16, isBlack: true },
    { note: 'B', frequency: 493.88, isBlack: false },
  ];

  return (
    <div
      className="piano-popup"
      role="dialog"
      aria-label="Virtual Piano"
      style={{
        ...(position
          ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
          : { visibility: 'hidden' }),
      }}
    >
      <div
        className="piano-popup-header"
        onPointerDown={handleHeaderPointerDown}
        onMouseDown={handleHeaderPointerDown}
        onTouchStart={handleHeaderPointerDown}
      >
        <h4 className="piano-popup-title">
          🎹 Virtual Piano
        </h4>
        <button
          type="button"
          className="piano-popup-close"
          onClick={onClose}
          aria-label="Tutup Virtual Piano"
          title="Tutup (Esc)"
        >
          ✕
        </button>
      </div>
      <div className="piano-popup-body">
        <p style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
          {helperText || 'Klik piano untuk memilih key'}
        </p>
        <p style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.8em', color: 'var(--text-secondary)' }}>
          {midiStatus}
        </p>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em',
            marginBottom: 'var(--spacing-sm)',
            fontSize: '0.8em',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={midiEnabled}
            onChange={(event) => setMidiEnabled(event.target.checked)}
            aria-label="Aktifkan atau nonaktifkan modul MIDI"
          />
          Aktifkan MIDI input
        </label>
        {insertControls && <div className="piano-popup-insert-controls">{insertControls}</div>}
        <div className="virtual-piano">
          <div className="piano-keys">
            {keys.map((key) => (
              <button
                key={key.note}
                type="button"
                className={`piano-key ${key.isBlack ? 'black-key' : 'white-key'} ${
                  activeKeys.has(key.note) ? 'active' : ''
                }`}
                onClick={() => playNote(key.frequency, key.note, false)}
                title={key.note}
              >
                <span className="piano-key-label">{key.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
