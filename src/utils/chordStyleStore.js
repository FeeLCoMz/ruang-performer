/**
 * Shared storage for the lyrics panel chord style.
 *
 * The preference is persisted in localStorage and broadcast through a
 * `chordstyle:change` window event, so every consumer (lyrics toolbar, stage
 * mode, …) stays in sync without a second source of truth.
 */

import { STORAGE_KEYS } from './storageKeys.js';

export const CHORD_STYLE_EVENT = 'chordstyle:change';

export function getStoredChordStyle(normalize = (value) => value) {
  try {
    return normalize(localStorage.getItem(STORAGE_KEYS.LYRICS_CHORD_STYLE));
  } catch {
    return normalize(null);
  }
}

export function setStoredChordStyle(value) {
  try {
    localStorage.setItem(STORAGE_KEYS.LYRICS_CHORD_STYLE, value);
  } catch {
    // Storage can fail in private mode; the choice still applies this session.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHORD_STYLE_EVENT, { detail: value }));
  }
}
