import { useEffect, useState } from 'react';
import { isMidiEnabled, setMidiEnabled, subscribeMidiEnabled } from './midiSettings.js';

/**
 * useMidiEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul MIDI.
 * Sinkron antar komponen via subscribeMidiEnabled (event-based).
 *
 * Returns: [enabled, setEnabled]
 */
export const useMidiEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isMidiEnabled());

  useEffect(() => {
    const unsubscribe = subscribeMidiEnabled((next) => setEnabledState(next));
    // Sinkron ulang untuk kasus perubahan dari tab lain (storage event)
    const onStorage = (event) => {
      if (event.key === 'ruang-performer:midiEnabled') {
        setEnabledState(isMidiEnabled());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setEnabled = (value) => setMidiEnabled(value);

  return [enabled, setEnabled];
};

export default useMidiEnabled;
