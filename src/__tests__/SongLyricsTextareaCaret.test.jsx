import { describe, test, expect, beforeEach } from 'vitest';
import { useState } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SongLyricsTextarea from '../components/SongLyricsTextarea.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Regression test for the "cursor jumps back to line 1 while typing" bug.
 *
 * The editor is fed by a controlled parent that echoes every keystroke back —
 * exactly what SongAddEditPage does. The caret must stay where the user left it.
 */
function Harness({ initial = '', onReady }) {
  const [lyrics, setLyrics] = useState(initial);
  return (
    <SongLyricsTextarea
      lyricsDisplayRef={onReady}
      editedLyrics={lyrics}
      setEditedLyrics={setLyrics}
      autoFocus={false}
    />
  );
}

/** A React ref object, which is what the component actually expects. */
const makeRef = () => ({ current: null });

function docText(container) {
  return container.querySelector('.cm-content')?.textContent ?? '';
}

describe('SongLyricsTextarea caret stability', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  test('typing at the end of a multi-line doc keeps the caret on the last line', async () => {
    const ref = makeRef();
    await act(async () => {
      root.render(<Harness initial={'line one\nline two'} onReady={ref} />);
    });

    const view = ref.current.__codemirror;

    // Put the caret at the very end of the document (line 3's start is after
    // the two newlines, so this is the end of "line two").
    await act(async () => {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
    });
    expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2);

    // Simulate typing: the editor changes the doc, then the controlled parent
    // echoes the new value straight back (the real page's behaviour).
    await act(async () => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: ' X' } });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const head = view.state.selection.main.head;
    const lineNo = view.state.doc.lineAt(head).number;

    expect(view.state.doc.toString()).toBe('line one\nline two X');
    // The bug reset the caret to the very start (line 1, head 0). Being anywhere
    // on the last line is the invariant that matters.
    expect(lineNo).toBe(2);
    expect(head).toBeGreaterThan('line one\n'.length);
  });

  test('an external value change (e.g. transpose) is still applied', async () => {
    const ref = makeRef();
    function ExternalHarness() {
      const [lyrics, setLyrics] = useState('[C]hello');
      return (
        <>
          <button type="button" onClick={() => setLyrics('[D]hello')}>
            transpose
          </button>
          <SongLyricsTextarea
            lyricsDisplayRef={ref}
            editedLyrics={lyrics}
            setEditedLyrics={setLyrics}
            autoFocus={false}
          />
        </>
      );
    }

    await act(async () => {
      root.render(<ExternalHarness />);
    });
    expect(docText(container)).toContain('[C]hello');

    await act(async () => {
      container.querySelector('button').click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // The external edit must reach the editor, not be swallowed by the guard.
    expect(docText(container)).toContain('[D]hello');
  });

  test('a plain value change from the parent replaces the document', async () => {
    const ref = makeRef();
    function LoadHarness() {
      const [lyrics, setLyrics] = useState('');
      return (
        <>
          <button type="button" onClick={() => setLyrics('loaded lyric')}>
            load
          </button>
          <SongLyricsTextarea
            lyricsDisplayRef={ref}
            editedLyrics={lyrics}
            setEditedLyrics={setLyrics}
            autoFocus={false}
          />
        </>
      );
    }

    await act(async () => {
      root.render(<LoadHarness />);
    });

    await act(async () => {
      container.querySelector('button').click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(docText(container)).toContain('loaded lyric');
  });
});
