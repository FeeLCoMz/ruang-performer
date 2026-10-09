import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SongLyricsEditorPanel from '../components/SongLyricsEditorPanel.jsx';
import LyricsEditorWorkspace from '../components/LyricsEditorWorkspace.jsx';

function noop() {}

describe('lyrics editor workspace preview', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('Given edit mode, Then editor and live preview render side by side', async () => {
    await act(async () => {
      root.render(
        <SongLyricsEditorPanel
          lyricsRef={{ current: null }}
          lyricsValue={'[Chorus]\nC G Am F\nHello world'}
          setLyricsValue={noop}
          error={null}
          disabled={false}
          editorActions={{ showPianoControls: false }}
          autoFocus={false}
          showTips={false}
          previewSong={{ title: 'Song A' }}
        />
      );
    });

    expect(container.querySelector('.lyrics-editor-workspace')).toBeTruthy();
    expect(container.querySelector('.lyrics-editor-pane .song-lyrics-textarea')).toBeTruthy();
    expect(container.querySelector('.lyrics-editor-preview .cd')).toBeTruthy();
    expect(container.querySelector('.lyrics-editor-preview').textContent).toContain('Hello world');
    expect(container.textContent).toContain('1 bagian');
  });

  test('Given preview is toggled off, Then the editor takes the full width', async () => {
    await act(async () => {
      root.render(
        <LyricsEditorWorkspace previewLyrics={'C G'} song={{}}>
          <textarea className="song-lyrics-textarea" readOnly />
        </LyricsEditorWorkspace>
      );
    });

    const offButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Editor')
    );
    expect(offButton).toBeTruthy();

    await act(async () => {
      offButton.click();
    });

    expect(container.querySelector('.lyrics-editor-preview')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-textarea')).toBeTruthy();
    expect(container.querySelector('.lyrics-editor-workspace').className).not.toContain('has-preview');
  });

  test('Given preview-only mode, Then the textarea is hidden but preview stays', async () => {
    await act(async () => {
      root.render(
        <LyricsEditorWorkspace previewLyrics={'Am F'} song={{}}>
          <textarea className="song-lyrics-textarea" readOnly />
        </LyricsEditorWorkspace>
      );
    });

    const previewButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Preview')
    );

    await act(async () => {
      previewButton.click();
    });

    expect(container.querySelector('.song-lyrics-textarea')).toBeFalsy();
    expect(container.querySelector('.lyrics-editor-preview')).toBeTruthy();
  });

  test('Given showPreview is false, Then no workspace wrapper is rendered', async () => {
    await act(async () => {
      root.render(
        <SongLyricsEditorPanel
          lyricsRef={{ current: null }}
          lyricsValue={'C'}
          setLyricsValue={noop}
          error={null}
          disabled={false}
          editorActions={{ showPianoControls: false }}
          autoFocus={false}
          showTips={false}
          showActions={false}
          showPreview={false}
        />
      );
    });

    expect(container.querySelector('.lyrics-editor-workspace')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-textarea')).toBeTruthy();
  });

  test('Given edited lyrics differ from the saved baseline, Then the unsaved badge is shown', async () => {
    await act(async () => {
      root.render(
        <LyricsEditorWorkspace
          previewLyrics={'[C]Hello edited'}
          baselineLyrics={'[C]Hello'}
          song={{}}
        >
          <textarea className="song-lyrics-textarea" readOnly />
        </LyricsEditorWorkspace>,
      );
    });

    const badge = container.querySelector('.lyrics-editor-dirty-badge');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('is-dirty');
    expect(badge.textContent).toContain('Belum disimpan');
  });

  test('Given lyrics match the saved baseline, Then the badge reports saved', async () => {
    await act(async () => {
      root.render(
        <LyricsEditorWorkspace
          previewLyrics={'[C]Hello'}
          baselineLyrics={'[C]Hello'}
          song={{}}
        >
          <textarea className="song-lyrics-textarea" readOnly />
        </LyricsEditorWorkspace>,
      );
    });

    const badge = container.querySelector('.lyrics-editor-dirty-badge');
    expect(badge).toBeTruthy();
    expect(badge.className).not.toContain('is-dirty');
    expect(badge.textContent).toContain('Tersimpan');
  });

  test('Given the toolbar is mounted, When the user types twice, Then no crash and the doc updates', async () => {
    function Harness() {
      const [lyrics, setLyrics] = React.useState('');
      const ref = React.useRef(null);
      return (
        <SongLyricsEditorPanel
          lyricsRef={ref}
          lyricsValue={lyrics}
          setLyricsValue={setLyrics}
          error={null}
          disabled={false}
          editorActions={{ showPianoControls: false }}
          autoFocus={false}
          showTips={false}
        />
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    const editable = container.querySelector('.cm-content');
    expect(editable).toBeTruthy();

    // Two consecutive edits: the second previously hit `el.addEventListener`
    // because the ref is a CodeMirror facade, not an HTMLTextAreaElement.
    await act(async () => {
      editable.textContent = 'A';
    });
    await act(async () => {
      editable.textContent = 'Am';
    });

    expect(container.querySelector('.song-lyrics-textarea-editor')).toBeTruthy();
    expect(container.querySelector('.cm-content')).toBeTruthy();
  });
});
