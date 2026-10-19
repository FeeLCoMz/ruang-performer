/**
 * useModulesEnabled.js
 *
 * Hook React untuk membaca & mengubah status on/off modul apa pun
 * yang terdaftar di `src/modules/registry.js`.
 *
 * Status sinkron antar komponen/tab:
 *  - event internal (setEnabled memicu subscribe dari modul terkait), dan
 *  - `storage` event antar tab (key = ruang-performer:module:<id>).
 */
import { useEffect, useState, useCallback } from 'react';
import { MODULES_REGISTRY } from '../modules/registry.js';

const buildStorageKey = (id) => `ruang-performer:module:${id}`;

/** Key yang benar-benar dipakai modul: metadata `storageKey`, atau fallback pola id. */
const resolveStorageKey = (mod) => mod.storageKey || buildStorageKey(mod.id);

export const useModulesEnabled = () => {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(MODULES_REGISTRY.map((mod) => [mod.id, mod.isEnabled()])),
  );

  useEffect(() => {
    const unsubscribers = MODULES_REGISTRY.map((mod) => {
      // Modul yang punya subscribe sendiri (mis. midiSettings) ikut sinkron.
      if (typeof mod.subscribe === 'function') {
        return mod.subscribe(() => {
          setStatuses((prev) => ({ ...prev, [mod.id]: mod.isEnabled() }));
        });
      }
      // Fallback: sinkron antar tab via storage event.
      const onStorage = (event) => {
        if (event.key === resolveStorageKey(mod)) {
          setStatuses((prev) => ({ ...prev, [mod.id]: mod.isEnabled() }));
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  const setEnabled = useCallback((id, value) => {
    const mod = MODULES_REGISTRY.find((m) => m.id === id);
    if (!mod) return;
    mod.setEnabled(value);
    setStatuses((prev) => ({ ...prev, [id]: mod.isEnabled() }));
  }, []);

  return { statuses, setEnabled };
};

export default useModulesEnabled;
