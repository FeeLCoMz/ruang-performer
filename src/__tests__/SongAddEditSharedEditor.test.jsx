import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SongAddEditPage from '../pages/SongAddEditPage.jsx';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: {} }),
  useParams: () => ({}),
}));

describe('SongAddEditPage shared lyrics editor', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    class MockAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }

      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: () => {} },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
        };
      }
    }

    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('Given add mode, Then shared lyrics editor actions include piano and insert controls', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    const editorActions = container.querySelector('.song-lyrics-edit-actions');
    expect(editorActions).toBeTruthy();

    const pianoButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('🎹 Piano')
    );
    expect(pianoButton).toBeTruthy();

    const insertToggle = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Insert ON')
    );
    expect(insertToggle).toBeTruthy();

    const formatSelect = container.querySelector('#lyrics-insert-format-select');
    expect(formatSelect).toBeTruthy();
  });

  test('Given add mode, When insert toggle is switched off, Then format controls are hidden', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    const insertToggle = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Insert ON')
    );
    expect(insertToggle).toBeTruthy();

    await act(async () => {
      insertToggle.click();
    });

    const insertOffToggle = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Insert OFF')
    );
    expect(insertOffToggle).toBeTruthy();

    const formatSelect = container.querySelector('#lyrics-insert-format-select');
    expect(formatSelect).toBeFalsy();
  });

  test('Given add mode, When piano note is selected, Then note token is inserted into lyrics textarea', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    const textarea = container.querySelector('.song-lyrics-textarea');
    expect(textarea).toBeTruthy();

    const pianoButton = container.querySelector('.song-lyrics-piano-controls button');
    expect(pianoButton).toBeTruthy();

    await act(async () => {
      pianoButton.click();
    });

    const noteButton = Array.from(container.querySelectorAll('.piano-key')).find((btn) =>
      btn.textContent?.trim() === 'C'
    );
    expect(noteButton).toBeTruthy();

    await act(async () => {
      noteButton.click();
    });

    expect(textarea.value).toBe('[C] ');
  });
});
