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

  /** Open a top-level editor menu by its visible label. */
  function openMenu(scope, label) {
    const trigger = [...scope.querySelectorAll('.ed-menu-trigger')].find(
      (btn) => btn.textContent.replace(/[▾\s]/g, '') === label,
    );
    if (!trigger) return null;
    trigger.click();
    return scope.querySelector('.ed-dropdown');
  }

  /**
   * Click a menu trigger and wait for the dropdown to render. React commits the
   * open state asynchronously, so a bare click() leaves the DOM unchanged and
   * the caller sees null.
   */
  async function openMenuAsync(label) {
    await act(async () => {
      openMenu(container, label);
    });
    return container.querySelector('.ed-dropdown');
  }

  /** Labels of the items inside the currently open dropdown. */
  function menuItemLabels() {
    return [...container.querySelectorAll('.ed-dropdown-item-label')].map((el) =>
      el.textContent.trim(),
    );
  }

  /** The open dropdown's item whose label contains `text`. */
  function menuItemByText(text) {
    return [...container.querySelectorAll('.ed-dropdown-item')].find((btn) =>
      btn.textContent.includes(text),
    );
  }

  test('Given add mode, Then the editor commands live in the menu bar', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    // The editor uses a menu bar now: one row of labelled menus instead of a
    // ribbon of mixed buttons, and nothing hidden behind a disclosure toggle.
    expect(container.querySelector('.lyric-editor-controls')).toBeTruthy();
    expect(container.querySelector('.lyric-format')).toBeTruthy();
    expect(container.querySelector('.ed-menubar')).toBeTruthy();

    const menuLabels = [...container.querySelectorAll('.ed-menu-trigger')].map((b) =>
      b.textContent.replace(/[▾\s]/g, ''),
    );
    // Every group is present and visible without opening a drawer first.
    expect(menuLabels).toEqual(expect.arrayContaining(['Riwayat', 'Format', 'Dokumen', 'Sisip']));

    // The commands that used to be hidden behind "Alat" are now menu items.
    const historyDropdown = await openMenuAsync('Riwayat');
    expect(historyDropdown).toBeTruthy();
    const historyItems = menuItemLabels();
    expect(historyItems).toEqual(expect.arrayContaining(['Batalkan', 'Ulangi', 'Cari / Ganti']));

    // Insert configuration still lives in the piano modal, not the toolbar.
    expect(container.querySelector('#lyrics-insert-format-select')).toBeFalsy();
    expect(container.querySelector('#lyrics-insert-key-select')).toBeFalsy();
  });

  test('Given add mode, When piano is opened, Then insert controls are available inside the modal', async () => {
    await act(async () => {
      root.render(<SongAddEditPage />);
    });

    await act(async () => {
      openMenu(container, 'Sisip');
    });

    const pianoButton = menuItemByText('Virtual Piano');
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

    // The piano modal must be open first: the Insert toggle lives inside it, and
    // the piano entry point is a menu item under Sisip.
    await act(async () => {
      openMenu(container, 'Sisip');
    });

    const pianoButton = menuItemByText('Virtual Piano');
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
