import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

vi.mock('../components/SongMediaPanel.jsx', () => ({
  default: () => <div data-testid="media-panel" />,
}));

import StageModePage from '../modules/stage-mode/StageModePage.jsx';
import { STORAGE_KEYS } from '../utils/storageKeys.js';

const song = {
  id: 's1',
  title: 'Lagu Satu',
  key: 'C',
  tempo: 100,
  lyrics: 'C G Am F\nLa la la',
};

const setlist = { id: 'sl1', name: 'Set', songs: [{ id: 's1' }] };

const mount = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <StageModePage
        stageMode
        onExit={() => {}}
        songs={[song]}
        setlists={[setlist]}
        activeSetlist={setlist}
      />,
    );
  });
  return {
    unmount: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
};

describe('Stage Mode — layout lirik', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.setItem('ruang-performer:module:stage-mode-enabled', 'true');
    localStorage.setItem(STORAGE_KEYS.STAGE_MODE, '1');
  });

  test('default skala font lirik = 1 (tidak lagi 1.2)', () => {
    const { unmount } = mount();
    const lyrics = document.body.querySelector('.stage-lyrics');
    expect(lyrics.style.getPropertyValue('--lyrics-font-scale')).toBe('1');
    unmount();
  });

  test('spacer akhir lirik hanya muncul saat autoscroll aktif', () => {
    const { unmount } = mount();
    const pad = document.body.querySelector('.stage-lyrics-pad');
    expect(pad).toBeTruthy();
    expect(pad.classList.contains('is-autoscroll')).toBe(false);
    unmount();
  });

  test('nilai font scale tersimpan di atas batas maksimum diabaikan', () => {
    localStorage.setItem(STORAGE_KEYS.STAGE_FONT_SCALE, '3');
    const { unmount } = mount();
    const lyrics = document.body.querySelector('.stage-lyrics');
    expect(lyrics.style.getPropertyValue('--lyrics-font-scale')).toBe('1');
    unmount();
  });
});
