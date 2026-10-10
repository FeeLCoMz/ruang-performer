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

  test('Given add mode, Then the piano entry point is in the tools bar', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    // Tools (history / search / cue / piano) are separate from formatting.
    expect(container.querySelector('.lyric-editor-controls')).toBeTruthy();
    expect(container.querySelector('.lyric-tools')).toBeTruthy();
    expect(container.querySelector('.lyric-format')).toBeTruthy();

    const pianoButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Piano')
    );
    expect(pianoButton).toBeTruthy();
    expect(pianoButton.closest('.lyric-tools')).toBeTruthy();

    // Insert configuration moved into the piano modal, so the toolbar no longer
    // renders its own copy of the format/key controls.
    expect(container.querySelector('#lyrics-insert-format-select')).toBeFalsy();
    expect(container.querySelector('#lyrics-insert-key-select')).toBeFalsy();
  });

  test('Given add mode, When piano is opened, Then insert controls are available inside the modal', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    const pianoButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Piano')
    );
    expect(pianoButton).toBeTruthy();

    await act(async () => {
      pianoButton.click();
    });

    // The insert toggle now lives with the keys it affects.
    const insertToggle = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Insert OFF')
    );
    expect(insertToggle).toBeTruthy();

    await act(async () => {
      insertToggle.click();
    });

    const insertOnToggle = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Insert ON')
    );
    expect(insertOnToggle).toBeTruthy();

    // Turning insert on reveals the format selector, still inside the modal.
    expect(container.querySelector('#lyrics-insert-format-select')).toBeTruthy();

    await act(async () => {
      insertOnToggle.click();
    });

    const insertOffToggle = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Insert OFF')
    );
    expect(insertOffToggle).toBeTruthy();
    expect(container.querySelector('#lyrics-insert-format-select')).toBeFalsy();
  });

  test('Given add mode, When piano note is selected with insert on, Then the token lands in the lyrics editor', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    const editorHost = container.querySelector('.song-lyrics-textarea-editor');
    expect(editorHost).toBeTruthy();

    // The piano modal must be open first: the Insert toggle now lives inside it.
    const pianoButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Piano')
    );
    expect(pianoButton).toBeTruthy();

    await act(async () => {
      pianoButton.click();
    });

    const insertToggle = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Insert OFF')
    );
    expect(insertToggle).toBeTruthy();

    await act(async () => {
      insertToggle.click();
    });

    const noteButton = Array.from(container.querySelectorAll('.piano-key')).find((btn) =>
      btn.textContent?.trim() === 'C'
    );
    expect(noteButton).toBeTruthy();

    await act(async () => {
      noteButton.click();
    });

    expect(container.querySelector('.cm-content').textContent).toBe('1 ');
  });
});
