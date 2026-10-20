/**
 * VirtualPiano.jsx
 *
 * Popup piano virtual (draggable) untuk memilih nada di editor lirik & chord.
 * Susunan file:
 *
 *   1. Konstanta & helper murni   — nama nada, frekuensi, parser pesan MIDI, daftar key
 *   2. Hook perilaku popup        — posisi awal, tutup via Escape, drag header
 *   3. Hook pemutar nada          — Web Audio + highlight key aktif
 *   4. Hook listener MIDI         — terjemah note on/off dari perangkat fisik
 *   5. Sub-komponen               — header, body, satu key piano
 *   6. Komponen utama             — VirtualPiano (perakitan + render)
 *
 * Status modul MIDI hanya DIBACA di sini; on/off diatur dari halaman /modules
 * (lihat useMidiEnabled).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { connectMidi, isWebMidiSupported } from './midiAccess.js';
import { useMidiEnabled } from './useMidiEnabled.js';

/* ============================================================
   1. Konstanta & helper murni
   ============================================================ */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Jarak minimum popup dari tepi layar saat diposisikan / di-drag. */
const POPUP_MARGIN = 20;
/** Ukuran perkiraan popup sebelum sempat dirender (untuk posisi awal). */
const FALLBACK_POPUP_SIZE = { width: 460, height: 280 };
/** Area popup minimal yang harus tetap terlihat di dalam layar saat di-drag. */
const DRAG_VISIBLE_SIZE = { width: 260, height: 220 };
/** Durasi nada dibunyikan (detik) dan lama key menyala (ms). */
const NOTE_DURATION_SEC = 0.5;
const NOTE_HIGHLIGHT_MS = 200;
const NOTE_GAIN = 0.3;

/** Satu oktaf nada (C4–B4) beserta frekuensi dan status tuts hitam. */
const PIANO_KEYS = [
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

const MIDI_STATUS = {
  IDLE: 'MIDI: belum terhubung',
  READY: 'MIDI: siap menerima input',
  DISABLED: 'MIDI: modul dinonaktifkan',
  DENIED: 'MIDI: browser menolak akses perangkat',
};

/** Nomor MIDI (0–127) → nama nada tanpa oktaf, mis. 60 → 'C'. */
function midiNumberToNoteName(midiNumber) {
  if (!Number.isFinite(Number(midiNumber))) return null;
  return NOTE_NAMES[Number(midiNumber) % 12];
}

/** Nomor MIDI → frekuensi (Hz), dengan A4 (69) = 440 Hz. */
function midiNumberToFrequency(midiNumber) {
  return 440 * (2 ** ((Number(midiNumber) - 69) / 12));
}

/**
 * Terjemahkan satu MIDI message menjadi aksi piano.
 * @returns {{type:'note-on', note:string, frequency:number}|{type:'note-off', note:string}|null}
 */
function parseMidiMessage(data) {
  const [statusByte, noteNumber, velocity = 0] = data || [];
  const command = statusByte & 0xf0;
  const note = midiNumberToNoteName(noteNumber);
  if (!note) return null;

  if (command === 0x90 && velocity > 0) {
    return { type: 'note-on', note, frequency: midiNumberToFrequency(noteNumber) };
  }
  if (command === 0x80 || (command === 0x90 && velocity === 0)) {
    return { type: 'note-off', note };
  }
  return null;
}

/** Batasi posisi popup agar tetap berada di dalam viewport. */
function clampPosition(x, y, maxX, maxY) {
  return {
    x: Math.min(Math.max(x, POPUP_MARGIN), Math.max(maxX, POPUP_MARGIN)),
    y: Math.min(Math.max(y, POPUP_MARGIN), Math.max(maxY, POPUP_MARGIN)),
  };
}

/* ============================================================
   2. Hook perilaku popup
   ============================================================ */

/** Posisi awal: tengah layar, dihitung dari ukuran popup saat dibuka. */
function usePopupPosition(isOpen, positionRef) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const popupEl = document.querySelector('.piano-popup');
    const popupWidth = popupEl ? popupEl.offsetWidth : FALLBACK_POPUP_SIZE.width;
    const popupHeight = popupEl ? popupEl.offsetHeight : FALLBACK_POPUP_SIZE.height;

    const nextPosition = clampPosition(
      Math.round((window.innerWidth - popupWidth) / 2),
      Math.round((window.innerHeight - popupHeight) / 2),
      window.innerWidth - popupWidth,
      window.innerHeight - popupHeight,
    );

    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, [isOpen, positionRef]);

  return [position, setPosition];
}

/** Escape menutup piano, supaya popup tidak menahan fokus keyboard. */
function useEscapeToClose(isOpen, onClose) {
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
}

/** Drag popup lewat header (pointer, plus mouse/touch untuk browser lama). */
function usePopupDrag(isOpen, positionRef, setPosition) {
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDragMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const point = event.touches?.[0] || event;
      const nextPosition = clampPosition(
        dragState.originX + (point.clientX - dragState.startX),
        dragState.originY + (point.clientY - dragState.startY),
        window.innerWidth - DRAG_VISIBLE_SIZE.width,
        window.innerHeight - DRAG_VISIBLE_SIZE.height,
      );

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
  }, [isOpen, positionRef, setPosition]);

  return useCallback((event) => {
    if (event.target.closest('.piano-popup-close')) return;

    const point = event.touches?.[0] || event;
    dragStateRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };
    event.preventDefault();
  }, [positionRef]);
}

/* ============================================================
   3. Hook pemutar nada (Web Audio + highlight key)
   ============================================================ */

function useNotePlayer(onKeySelect) {
  const audioContextRef = useRef(null);
  // Ref agar playNote tetap stabil walau parent memberi callback baru tiap render.
  const onKeySelectRef = useRef(onKeySelect);
  const [activeKeys, setActiveKeys] = useState(() => new Set());

  useEffect(() => {
    onKeySelectRef.current = onKeySelect;
  }, [onKeySelect]);

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioContextRef.current = new AudioContextClass();
    } catch (err) {
      console.error('Failed to create AudioContext:', err);
      return null;
    }
    return audioContextRef.current;
  }, []);

  const playNote = useCallback((frequency, note) => {
    if (onKeySelectRef.current) onKeySelectRef.current(note);

    const audioContext = getAudioContext();
    if (audioContext) {
      if (audioContext.state === 'suspended') audioContext.resume();

      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      gainNode.gain.setValueAtTime(NOTE_GAIN, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + NOTE_DURATION_SEC);

      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + NOTE_DURATION_SEC);
    }

    setActiveKeys((prev) => new Set(prev).add(note));
    setTimeout(() => {
      setActiveKeys((prev) => {
        if (!prev.has(note)) return prev;
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }, NOTE_HIGHLIGHT_MS);
  }, [getAudioContext]);

  const releaseNote = useCallback((note) => {
    setActiveKeys((prev) => {
      if (!prev.has(note)) return prev;
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  }, []);

  return { activeKeys, playNote, releaseNote };
}

/* ============================================================
   4. Hook listener MIDI
   ============================================================ */

/**
 * Hubungkan input MIDI fisik selama popup terbuka DAN modul MIDI aktif.
 * Komponen ini hanya menerjemahkan note on/off; akses perangkat dikelola
 * src/modules/midi/midiAccess.js.
 */
function useMidiInputListener({ isOpen, midiEnabled, playNote, releaseNote, setMidiStatus }) {
  const midiAccessRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !midiEnabled || !isWebMidiSupported()) return undefined;

    let cancelled = false;
    setMidiStatus(MIDI_STATUS.IDLE);

    connectMidi({
      onMessage: (event) => {
        const action = parseMidiMessage(event.data);
        if (!action) return;

        if (action.type === 'note-on') playNote(action.frequency, action.note);
        else releaseNote(action.note);
      },
      onStateChange: () => {
        if (!cancelled) setMidiStatus(MIDI_STATUS.READY);
      },
    })
      .then((connection) => {
        if (cancelled) {
          connection.dispose();
          return;
        }
        midiAccessRef.current = connection;
        setMidiStatus(MIDI_STATUS.READY);
      })
      .catch(() => {
        if (!cancelled) setMidiStatus(MIDI_STATUS.DENIED);
      });

    return () => {
      cancelled = true;
      if (midiAccessRef.current) {
        midiAccessRef.current.dispose();
        midiAccessRef.current = null;
      }
    };
  }, [isOpen, midiEnabled, playNote, releaseNote, setMidiStatus]);
}

/* ============================================================
   5. Sub-komponen presentasional
   ============================================================ */

function PianoPopupHeader({ onClose, onPointerDown }) {
  return (
    <div
      className="piano-popup-header"
      onPointerDown={onPointerDown}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
    >
      <h4 className="piano-popup-title">🎹 Virtual Piano</h4>
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
  );
}

function PianoKey({ pianoKey, isActive, onPlay }) {
  const { note, frequency, isBlack } = pianoKey;
  return (
    <button
      type="button"
      className={`piano-key ${isBlack ? 'black-key' : 'white-key'}${isActive ? ' active' : ''}`}
      onClick={() => onPlay(frequency, note)}
      title={note}
    >
      <span className="piano-key-label">{note}</span>
    </button>
  );
}

function PianoPopupBody({ helperText, midiStatus, midiEnabled, insertControls, activeKeys, onPlayKey }) {
  return (
    <div className="piano-popup-body">
      <p className="piano-popup-hint">{helperText || 'Klik piano untuk memilih key'}</p>
      <p className="piano-popup-midi-status">{midiStatus}</p>
      {!midiEnabled && (
        <p className="piano-popup-midi-disabled">
          Modul MIDI nonaktif. Aktifkan lewat menu Modul (ikon 🧩 di sidebar).
        </p>
      )}
      {insertControls && <div className="piano-popup-insert-controls">{insertControls}</div>}
      <div className="virtual-piano">
        <div className="piano-keys">
          {PIANO_KEYS.map((pianoKey) => (
            <PianoKey
              key={pianoKey.note}
              pianoKey={pianoKey}
              isActive={activeKeys.has(pianoKey.note)}
              onPlay={onPlayKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   6. Komponen utama
   ============================================================ */

export default function VirtualPiano({ onKeySelect, isOpen, onClose, helperText, insertControls }) {
  const positionRef = useRef({ x: POPUP_MARGIN, y: POPUP_MARGIN });
  // Status modul MIDI hanya dibaca di sini — aktif/nonaktif diatur dari halaman /modules.
  const [midiEnabled] = useMidiEnabled();
  const [midiStatus, setMidiStatus] = useState(
    midiEnabled ? MIDI_STATUS.IDLE : MIDI_STATUS.DISABLED,
  );

  const [position, setPosition] = usePopupPosition(isOpen, positionRef);
  const handleHeaderPointerDown = usePopupDrag(isOpen, positionRef, setPosition);
  const { activeKeys, playNote, releaseNote } = useNotePlayer(onKeySelect);

  useEscapeToClose(isOpen, onClose);
  useMidiInputListener({ isOpen, midiEnabled, playNote, releaseNote, setMidiStatus });

  if (!isOpen) return null;

  return (
    <div
      className="piano-popup"
      role="dialog"
      aria-label="Virtual Piano"
      style={position
        ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
        : { visibility: 'hidden' }}
    >
      <PianoPopupHeader onClose={onClose} onPointerDown={handleHeaderPointerDown} />
      <PianoPopupBody
        helperText={helperText}
        midiStatus={midiStatus}
        midiEnabled={midiEnabled}
        insertControls={insertControls}
        activeKeys={activeKeys}
        onPlayKey={playNote}
      />
    </div>
  );
}
