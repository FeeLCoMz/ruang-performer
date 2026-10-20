import { useEffect, useState } from 'react';
import {
  isVoiceSearchEnabled,
  setVoiceSearchEnabled,
  subscribeVoiceSearchEnabled,
} from './voiceSearchSettings.js';

/** Hook on/off modul Voice Search. Returns: [enabled, setEnabled] */
export const useVoiceSearchEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isVoiceSearchEnabled());

  useEffect(() => subscribeVoiceSearchEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setVoiceSearchEnabled(value);

  return [enabled, setEnabled];
};

export default useVoiceSearchEnabled;
