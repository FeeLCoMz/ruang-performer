import { useEffect, useState } from 'react';
import {
  isMetronomeEnabled,
  setMetronomeEnabled,
  subscribeMetronomeEnabled,
} from './metronomeSettings.js';

/** Hook on/off modul Metronome & Tap Tempo. Returns: [enabled, setEnabled] */
export const useMetronomeEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isMetronomeEnabled());

  useEffect(() => subscribeMetronomeEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setMetronomeEnabled(value);

  return [enabled, setEnabled];
};

export default useMetronomeEnabled;
