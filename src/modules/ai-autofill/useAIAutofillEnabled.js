import { useEffect, useState } from 'react';
import {
  isAIAutofillEnabled,
  setAIAutofillEnabled,
  subscribeAIAutofillEnabled,
} from './aiAutofillSettings.js';

/**
 * useAIAutofillEnabled
 *
 * Hook React untuk membaca & mengubah status on/off modul AI Autofill.
 *
 * Returns: [enabled, setEnabled]
 */
export const useAIAutofillEnabled = () => {
  const [enabled, setEnabledState] = useState(() => isAIAutofillEnabled());

  useEffect(() => subscribeAIAutofillEnabled((next) => setEnabledState(next)), []);

  const setEnabled = (value) => setAIAutofillEnabled(value);

  return [enabled, setEnabled];
};

export default useAIAutofillEnabled;
