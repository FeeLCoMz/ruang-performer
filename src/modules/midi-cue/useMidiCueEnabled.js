import { useEffect, useState } from 'react';
import {
  isMidiCueEnabled,
  setMidiCueEnabled,
  subscribeMidiCueEnabled,
} from './midiCueSettings.js';

/**
 * useMidiCueEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul MIDI Cue.
 *
 * Returns: [enabled, setEnabled]
 */
export const useMidiCueEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isMidiCueEnabled());

  useEffect(() => subscribeMidiCueEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setMidiCueEnabled(value);

  return [enabled, setEnabled];
};

export default useMidiCueEnabled;
