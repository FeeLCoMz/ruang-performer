import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SongLyricsMainSection from '../components/SongLyricsMainSection.jsx';
import SongChordsLyricsToolbar from '../components/SongChordsLyricsToolbar.jsx';
import ChordDisplay from '../components/ChordDisplay.jsx';
import SongChordsInfo from '../components/SongChordsInfo.jsx';
import SongChordsAnalyzer from '../components/SongChordsAnalyzer.jsx';
import SongLyricsEditorPanel from '../components/SongLyricsEditorPanel.jsx';
import TransposeKeyControl from '../components/TransposeKeyControl.jsx';
import SongChordsPage from '../pages/SongChordsPage.jsx';

vi.mock('../components/SetlistSongNavigator.jsx', () => ({
  default: ({ compact, onOpenSetlist }) => (
    <div data-testid="setlist-navigator">
      {compact ? 'compact' : 'full'}
      {typeof onOpenSetlist === 'function' ? '|has-open-setlist' : ''}
    </div>
  ),
}));

vi.mock('../components/SongChordsMediaPanel.jsx', () => ({
  default: () => <div data-testid="song-chords-media-panel" />,
}));

vi.mock('../components/FloatingYouTubePlayer.jsx', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="floating-youtube-player" /> : null),
}));

vi.mock('../hooks/useSongFetch.js', () => ({
  useSongFetch: () => ({
    song: { id: '1', title: 'Song A', key: 'G', lyrics: 'G D C', youtubeId: 'dQw4w9WgXcQ' },
    loading: false,
    error: null,
    setSong: vi.fn(),
  }),
}));

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'member' } }),
}));

vi.mock('../hooks/usePermission.js', () => ({
  usePermission: () => ({ can: () => true }),
}));

vi.mock('../apiClient.js', () => ({
  fetchSetLists: vi.fn().mockResolvedValue([]),
  updateSongMastery: vi.fn(),
}));

function noop() {}

describe('Song lyrics shared editor rendering', () => {
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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('Given SongLyricsMainSection, Then the lyrics toolbars and display are rendered without the editor', async () => {
    await act(async () => {
      root.render(
        <SongLyricsMainSection
          lyricsDisplayRef={{ current: null }}
          tempo={120}
          timeSignature={'4/4'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          zoom={1}
          setZoom={noop}
          song={{ lyrics: '[C]Hello' }}
          transpose={0}
          setTranspose={noop}
          showChords={true}
          showChordNumbers={false}
          setShowChordNumbers={noop}
          showJazzChords={false}
          setShowJazzChords={noop}
          showSimpleChords={false}
          setShowSimpleChords={noop}
          keySignature={'C'}
          showSheetMusic={false}
          setShowSheetMusic={noop}
          youtubeRef={{ current: null }}
          loading={false}
        />
      );
    });

    // Read-only view: chord display is present, the inline editor is gone.
    expect(container.querySelector('.song-lyrics-toolbar')).toBeTruthy();
    expect(container.querySelector('.song-lyrics-display')).toBeTruthy();
    expect(container.querySelector('.lyric-editor-controls')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-textarea-editor')).toBeFalsy();

    // The removed controls must not be offered.
    const buttonLabels = Array.from(container.querySelectorAll('button')).map((b) => b.textContent || '').join(' ');
    expect(buttonLabels).not.toContain('Edit Lirik');
    expect(buttonLabels).not.toContain('Full screen');
    expect(container.querySelector('.song-lyrics-transpose-controls')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-tempo-minimal')).toBeFalsy();
  });

  test('Given lyrics editor, Then formatting actions are grouped by scope', async () => {
    await act(async () => {
      root.render(
        <SongLyricsEditorPanel
          lyricsRef={{ current: null }}
          lyricsValue={'[C]Hello'}
          setLyricsValue={noop}
          error={null}
          disabled={false}
          editorActions={{ showSaveCancelButtons: false, showPianoControls: false }}
          autoFocus={false}
        />
      );
    });

    const groups = container.querySelectorAll('.lyric-format-group');
    expect(groups).toHaveLength(2);

    const titles = Array.from(container.querySelectorAll('.lyric-format-group-title')).map(
      (el) => el.textContent
    );
    expect(titles).toEqual(['Seleksi', 'Dokumen']);

    // Selection-scoped actions live in the first group.
    expect(groups[0].textContent).toContain('Sejajarkan Bar');
    expect(groups[0].textContent).toContain('Sejajarkan Chord');
    expect(groups[0].textContent).toContain('Pecah Bar');

    // Document-scoped actions live in the second.
    expect(groups[1].textContent).toContain('Bersihkan Teks');
    expect(groups[1].textContent).toContain('Tag Bagian');
    expect(groups[1].textContent).toContain('Rapikan Semua');
  });

  test('Given no text selected, Then selection-only actions are disabled', async () => {
    await act(async () => {
      root.render(
        <SongLyricsEditorPanel
          lyricsRef={{ current: null }}
          lyricsValue={'[C]Hello'}
          setLyricsValue={noop}
          error={null}
          disabled={false}
          editorActions={{ showSaveCancelButtons: false, showPianoControls: false }}
          autoFocus={false}
        />
      );
    });

    const selectionGroup = container.querySelector('.lyric-format-group');
    const selectionButtons = Array.from(selectionGroup.querySelectorAll('button'));

    expect(selectionButtons.length).toBeGreaterThan(0);
    for (const button of selectionButtons) {
      expect(button.disabled, `${button.textContent} should be disabled`).toBe(true);
    }

    // The document group stays usable without a selection.
    const documentGroup = container.querySelectorAll('.lyric-format-group')[1];
    const documentButtons = Array.from(documentGroup.querySelectorAll('button'));
    for (const button of documentButtons) {
      expect(button.disabled, `${button.textContent} should be enabled`).toBe(false);
    }

    expect(container.textContent).toContain('blok teks dulu');
  });

  test('Given the tools bar, Then history and search sit outside the format group', async () => {
    await act(async () => {
      root.render(
        <SongLyricsEditorPanel
          lyricsRef={{ current: null }}
          lyricsValue={'[C]Hello'}
          setLyricsValue={noop}
          error={null}
          disabled={false}
          editorActions={{ showSaveCancelButtons: false, showPianoControls: false }}
          autoFocus={false}
        />
      );
    });

    // The tools bar is collapsed by default; open it before inspecting. The
    // toggle deliberately keeps Edit Lirik, Undo and Save from competing with
    // formatting for the same visual weight.
    const toolsToggle = container.querySelector('.lyric-editor-tools-toggle');
    expect(toolsToggle).toBeTruthy();

    await act(async () => {
      toolsToggle.click();
    });

    const tools = container.querySelector('.lyric-tools');
    expect(tools).toBeTruthy();
    expect(tools.textContent).toContain('Undo');
    expect(tools.textContent).toContain('Redo');
    expect(tools.textContent).toContain('Cari');

    // Formatting must not claim history actions as its own.
    const format = container.querySelector('.lyric-format');
    expect(format.textContent).not.toContain('Undo');
    expect(format.textContent).not.toContain('Cari');
  });

  test('Given the old ribbon component is gone, Then its markup is absent', async () => {
    await act(async () => {
      root.render(
        <SongLyricsEditorPanel
          lyricsRef={{ current: null }}
          lyricsValue={'[C]Hello'}
          setLyricsValue={noop}
          error={null}
          disabled={false}
          editorActions={{ showSaveCancelButtons: false, showPianoControls: false }}
          autoFocus={false}
        />
      );
    });

    expect(container.querySelector('.song-lyrics-edit-actions')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-format-ribbon')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-bar-wrap-controls')).toBeFalsy();
  });

  test('Given piano controls in the toolbar, Then insert settings are not duplicated there', async () => {
    await act(async () => {
      root.render(
        <SongLyricsEditorPanel
          lyricsRef={{ current: null }}
          lyricsValue={'[C]Hello'}
          setLyricsValue={noop}
          error={null}
          disabled={false}
          editorActions={{
            showPianoControls: true,
            onOpenPiano: noop,
            insertNotesEnabled: true,
          }}
          autoFocus={false}
        />
      );
    });

    // The piano entry point stays in the tools bar, which lives behind the
    // toggle so formatting stays the primary surface.
    const toolsToggle = container.querySelector('.lyric-editor-tools-toggle');
    expect(toolsToggle).toBeTruthy();

    await act(async () => {
      toolsToggle.click();
    });

    const pianoButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Piano')
    );
    expect(pianoButton).toBeTruthy();

    // ...but the insert configuration now lives inside the piano modal, so the
    // toolbar must not render a second copy of it.
    expect(container.querySelector('#lyrics-insert-format-select')).toBeFalsy();
    expect(container.querySelector('#lyrics-insert-key-select')).toBeFalsy();
    const toolbarKeySelect = Array.from(container.querySelectorAll('select')).find(
      (select) => select.getAttribute('aria-label') === 'Pilih key untuk angka chord'
    );
    expect(toolbarKeySelect).toBeFalsy();
  });

  test('Given recognized section labels, Then no detected-section badges are rendered', async () => {
    await act(async () => {
      root.render(
        <SongLyricsMainSection
          lyricsDisplayRef={{ current: null }}
          tempo={120}
          timeSignature={'4/4'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          zoom={1}
          setZoom={noop}
          song={{ lyrics: '[Intro]\nAm F\nPost Chorus:\nChorus:' }}
          transpose={0}
          setTranspose={noop}
          showChords={true}
          showChordNumbers={false}
          setShowChordNumbers={noop}
          showJazzChords={false}
          setShowJazzChords={noop}
          showSimpleChords={false}
          setShowSimpleChords={noop}
          keySignature={'C'}
          showSheetMusic={false}
          setShowSheetMusic={noop}
          youtubeRef={{ current: null }}
          loading={false}
        />
      );
    });

    // The detected-section badge strip was removed from the editor; sections are
    // now surfaced by the structure sidebar in SongAddEditPage instead.
    expect(container.querySelector('.song-lyrics-detected-sections')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-section-detected-badge')).toBeFalsy();
  });

  test('Given SongChordsLyricsToolbar, Then only chord/youtube/autoscroll controls are rendered', async () => {
    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          autoScrollActive={false}
          setAutoScrollActive={noop}
          showChordNumbers={false}
          setShowChordNumbers={noop}
          showJazzChords={false}
          setShowJazzChords={noop}
          showSimpleChords={false}
          setShowSimpleChords={noop}
          youtubeId={null}
          youtubeRef={{ current: null }}
        />
      );
    });

    const labels = Array.from(container.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).join(' ');
    expect(labels).toContain('Autoscroll');
    // Satu tombol mode chord: label menampilkan mode aktif.
    expect(labels).toContain('Chord');
    expect(labels).not.toContain('Angka');
    expect(labels).not.toContain('Style');
    expect(container.querySelector('.song-lyrics-chord-style-badge')).toBeFalsy();
    // Removed controls must not come back.
    expect(labels).not.toContain('Edit Lirik');
    expect(labels).not.toContain('Full screen');
    expect(labels).not.toContain('Export');
    expect(container.querySelector('.song-lyrics-transpose-controls')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-tempo-minimal')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-export-menu-container')).toBeFalsy();
  });

  test('Given the chord mode button, When a mode is picked, Then the label and handler reflect it', async () => {
    const setShowChordNumbers = vi.fn();
    const setShowJazzChords = vi.fn();
    const setShowSimpleChords = vi.fn();

    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          autoScrollActive={false}
          setAutoScrollActive={noop}
          showChordNumbers={false}
          setShowChordNumbers={setShowChordNumbers}
          showJazzChords={false}
          setShowJazzChords={setShowJazzChords}
          showSimpleChords={false}
          setShowSimpleChords={setShowSimpleChords}
          youtubeId={null}
          youtubeRef={{ current: null }}
        />
      );
    });

    const modeButton = container.querySelector('.song-lyrics-toolbar-group-chords button');
    expect(modeButton).toBeTruthy();
    expect(modeButton.textContent).toContain('Chord');

    await act(async () => {
      modeButton.click();
    });

    const angkaItem = Array.from(container.querySelectorAll('.song-lyrics-chord-style-item'))
      .find((b) => b.textContent.trim() === 'Angka');
    expect(angkaItem).toBeTruthy();

    await act(async () => {
      angkaItem.click();
    });

    expect(setShowChordNumbers).toHaveBeenCalledWith(true);
    expect(setShowJazzChords).toHaveBeenCalledWith(false);
    expect(setShowSimpleChords).toHaveBeenCalledWith(false);
  });

  test('Given the autoscroll speed control, When a BPM is typed or stepped, Then setScrollSpeed receives clamped values', async () => {
    const setScrollSpeed = vi.fn();

    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          autoScrollActive={true}
          setAutoScrollActive={noop}
          scrollSpeed={120}
          setScrollSpeed={setScrollSpeed}
          tempo={120}
          showChordNumbers={false}
          setShowChordNumbers={noop}
          showJazzChords={false}
          setShowJazzChords={noop}
          showSimpleChords={false}
          setShowSimpleChords={noop}
          youtubeId={null}
          youtubeRef={{ current: null }}
        />
      );
    });

    const input = container.querySelector('.song-lyrics-autoscroll-input');
    expect(input).toBeTruthy();
    expect(input.value).toBe('120');

    // Typing a precise value.
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '137');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(setScrollSpeed).toHaveBeenCalledWith(137);

    // Stepping up from the current prop value.
    setScrollSpeed.mockClear();
    const stepButtons = container.querySelectorAll('.song-lyrics-autoscroll-step');
    expect(stepButtons.length).toBe(2);
    await act(async () => {
      stepButtons[1].click();
    });
    expect(setScrollSpeed).toHaveBeenCalledWith(121);
  });

  test('Given detected instruments are present, Then a copy button is visible for registration memory', async () => {
    const clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: clipboard,
      configurable: true,
    });

    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          keyboardPatch="Stage Piano"
          detectedInstruments={['Gitar', 'Sax', 'Piano']}
        />
      );
    });

    const copyButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Copy');
    expect(copyButton).toBeTruthy();

    await act(async () => {
      copyButton.click();
    });

    expect(clipboard.writeText).toHaveBeenCalledWith('Keyboard Patch: Stage Piano\nInstrumen: Gitar, Sax, Piano');
  });

  test('Given mastery info is present, Then it renders as a full-width row', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          originalKey="C"
          targetKey="D"
          tempo="120"
          timeSignature="4/4"
          genre="Rock"
          masteredBy={[{ username: 'User 1' }]}
          canMarkMastery={true}
          isMasteredByCurrentUser={false}
          onToggleMastery={noop}
        />
      );
    });

    expect(container.querySelector('.song-info-mastery-row')).toBeTruthy();
  });

  test('Given time and genre are present, Then they render as separate info items', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          timeSignature="4/4"
          genre="Rock"
        />
      );
    });

    const items = Array.from(container.querySelectorAll('.song-info-chip-row .song-info-item'));
    const timeItem = items.find((item) => item.textContent.includes('Time'));
    const genreItem = items.find((item) => item.textContent.includes('Genre'));

    expect(timeItem).toBeTruthy();
    expect(timeItem.textContent).toContain('4/4');
    expect(timeItem.textContent).not.toContain('Rock');
    expect(genreItem).toBeTruthy();
    expect(genreItem.textContent).toContain('Rock');
    expect(genreItem.textContent).not.toContain('4/4');
    expect(container.querySelector('.song-info-split-row')).toBeFalsy();
  });

  test('Given transpose is changed manually, Then it stays applied instead of being overridden by the target key', async () => {
    function TransposeHost() {
      const [transpose, setTranspose] = React.useState(0);
      return (
        <>
          <TransposeKeyControl originalKey="C" targetKey="D" transpose={transpose} onTransposeChange={setTranspose} />
          <div data-testid="transpose-value">{transpose}</div>
        </>
      );
    }

    await act(async () => {
      root.render(<TransposeHost />);
    });

    const transposeValue = container.querySelector('[data-testid="transpose-value"]');
    expect(transposeValue.textContent).toBe('2');

    const buttons = container.querySelectorAll('button');
    await act(async () => {
      buttons[0].click();
    });

    expect(transposeValue.textContent).toBe('1');
  });

  test('Given chord display is hidden in lirik mode, Then chord-only tokens are not rendered', async () => {
    await act(async () => {
      root.render(<ChordDisplay song={{ lyrics: '[C]Hello\n[D]World' }} showChords={false} />);
    });

    expect(container.querySelector('.cd-chord')).toBeFalsy();
    expect(container.textContent).toContain('Hello');
    expect(container.textContent).toContain('World');
  });

  test('Given the chord analyzer button, When clicked, Then the analysis modal opens and can be closed', async () => {
    function AnalyzerHost() {
      const [open, setOpen] = React.useState(false);
      return (
        <SongChordsAnalyzer
          showChordAnalyzer={open}
          setShowChordAnalyzer={setOpen}
          chordStats={{
            count: 4,
            chords: ['C', 'G', 'Am', 'F'],
            usageCounts: [
              { chord: 'C', count: 2 },
              { chord: 'G', count: 1 },
              { chord: 'Am', count: 1 },
            ],
            detectedKey: { key: 'C', mode: 'major', confidence: 90, alternatives: [] },
            modulation: { hasModulation: false, modulationCount: 0, transitions: [] },
          }}
          transpose={0}
          songKey="C"
          onApplyRecommendedTranspose={noop}
        />
      );
    }

    await act(async () => {
      root.render(<AnalyzerHost />);
    });

    // Closed by default: no dialog, only the trigger button.
    expect(container.querySelector('.song-lyrics-analyzer-modal')).toBeFalsy();
    const openButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Analisis Chord'));
    expect(openButton).toBeTruthy();

    await act(async () => {
      openButton.click();
    });

    expect(container.querySelector('.song-lyrics-analyzer-modal')).toBeTruthy();
    expect(container.querySelector('.modal-overlay')).toBeTruthy();
    // Statistik yang tersisa: Unique Chord & Estimasi Key.
    expect(container.textContent).toContain('Unique Chord');
    expect(container.textContent).toContain('Estimasi Key');
    // Total Chord & Modulasi sudah dihapus.
    expect(container.textContent).not.toContain('Total Chord');
    expect(container.textContent).not.toContain('Modulasi');

    const closeButton = container.querySelector('.song-lyrics-analyzer-modal-close');
    expect(closeButton).toBeTruthy();
    await act(async () => {
      closeButton.click();
    });

    expect(container.querySelector('.song-lyrics-analyzer-modal')).toBeFalsy();
  });

  test('Given chord number mode is active, Then transpose does not change displayed numbers', async () => {
    await act(async () => {
      root.render(
        <ChordDisplay
          song={{ lyrics: 'C G Am F' }}
          showChords={true}
          showChordNumbers={true}
          keySignature={'C'}
          transpose={2}
        />
      );
    });

    expect(container.textContent).toContain('1 5 6m 4');
  });

  test('Given number notation is active, Then numbers render in the standard chord line', async () => {
    await act(async () => {
      root.render(
        <ChordDisplay
          song={{ lyrics: 'C G Am F' }}
          showChords={true}
          showChordNumbers={true}
          keySignature={'C'}
          transpose={0}
        />
      );
    });

    expect(container.querySelectorAll('.cd-chord-grid-block').length).toBe(0);
    expect(container.querySelector('.cd-layout-bar-grid')).toBeFalsy();
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('5');
  });

  test('Given a setlist song route, Then the song view renders read-only with chords and without the lyrics editor', async () => {
    let currentLocation;
    function LocationProbe() {
      currentLocation = useLocation();
      return null;
    }

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[{
          pathname: '/setlists/10/songs/1',
          state: {
            setlistId: 10,
            setlist: { id: 10, songs: [{ id: '1' }, { id: '2' }] },
            setlistSong: { id: '1' },
          },
        }]}>
          <Routes>
            <Route path="/setlists/:setlistId/songs/:id" element={<><LocationProbe /><SongChordsPage /></>} />
            <Route path="/songs/view/:id" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Stays on the setlist route and shows the chord display, not the editor.
    expect(currentLocation.pathname).toBe('/setlists/10/songs/1');
    expect(container.querySelector('.song-lyrics-display')).toBeTruthy();
    expect(container.querySelector('.song-lyrics-textarea-editor')).toBeFalsy();

    const editLyricsButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Edit Lirik')
    );
    expect(editLyricsButton).toBeFalsy();
  });

  test('Given a song is opened outside the setlist route, Then the navigation panel stays hidden', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[{
          pathname: '/songs/view/1',
          state: { setlistId: 10, setlist: { id: 10, songs: [{ id: '1' }, { id: '2' }] } },
        }]}>
          <Routes>
            <Route path="/songs/view/:id" element={<SongChordsPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container.querySelector('[data-testid="setlist-navigator"]')).toBeNull();
  });

  test('Given a song is opened from a setlist, Then keyboard key recommendation uses the original song key', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[{
          pathname: '/setlists/10/songs/1',
          state: { setlistSong: { key: 'D' } },
        }]}>
          <Routes>
            <Route path="/setlists/:setlistId/songs/:id" element={<SongChordsPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const keyEasyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label') === 'Gunakan key mudah yang disarankan'
    );
    expect(keyEasyButton).toBeTruthy();
    expect(container.textContent).toContain('Key Mudah');
    // Jarak transpose kini ada di tooltip tombol, bukan teks terpisah.
    expect(keyEasyButton.getAttribute('title')).toContain('+5 semitone');

    await act(async () => {
      keyEasyButton.click();
    });

    expect(container.querySelector('.cd-chord')?.textContent).toBe('C G F');
  });
});
