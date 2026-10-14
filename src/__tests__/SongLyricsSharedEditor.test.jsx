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

  /** Click a top-level editor menu and wait for React to render its dropdown. */
  async function openMenuAsync(label) {
    const trigger = [...container.querySelectorAll('.ed-menu-trigger')].find(
      (btn) => btn.textContent.replace(/[▾\s]/g, '') === label,
    );
    if (!trigger) return null;
    await act(async () => {
      trigger.click();
    });
    return container.querySelector('.ed-dropdown');
  }

  /** Labels of the items in the currently open dropdown. */
  function menuItemLabels() {
    return [...container.querySelectorAll('.ed-dropdown-item-label')].map((el) =>
      el.textContent.trim(),
    );
  }

  /** The open dropdown's item whose label contains `text`. */
  function menuItemByText(text) {
    return [...container.querySelectorAll('.ed-dropdown-item')].find((item) =>
      item.textContent.includes(text)
    );
  }

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

  test('Given lyrics editor, Then commands are grouped into dropdown menus', async () => {
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

    // Commands are grouped into menus now, not boxed into scope groups.
    const menuLabels = [...container.querySelectorAll('.ed-menu-trigger')].map((b) =>
      b.textContent.replace(/[▾\s]/g, ''),
    );
    expect(menuLabels).toEqual(expect.arrayContaining(['Riwayat', 'Format', 'Dokumen']));

    // Selection-scoped commands live under Format.
    await openMenuAsync('Format');
    const formatItems = menuItemLabels();
    expect(formatItems).toEqual(
      expect.arrayContaining(['Sejajarkan Bar', 'Sejajarkan Chord', 'Pecah Bar']),
    );
    // The hint is a separate element, so it never bleeds into the label text.
    const hints = [...container.querySelectorAll('.ed-dropdown-item-hint')].map((el) =>
      el.textContent.trim(),
    );
    expect(hints.some((h) => h.includes('bar/baris'))).toBe(true);
    expect(formatItems).not.toContain('Pecah Bar4 bar/baris');

    // Document-scoped commands live under Dokumen.
    await openMenuAsync('Dokumen');
    const documentItems = menuItemLabels();
    expect(documentItems).toEqual(
      expect.arrayContaining(['Bersihkan Teks', 'Tag Bagian', 'Rapikan Semua...']),
    );
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

    await openMenuAsync('Format');
    const selectionItems = [...container.querySelectorAll('.ed-dropdown-item')];
    expect(selectionItems.length).toBeGreaterThan(0);
    for (const item of selectionItems) {
      // Every item in Format acts on a selection, so all are disabled without one.
      expect(item.disabled, `${item.textContent} should be disabled`).toBe(true);
    }

    // The document menu stays usable without a selection.
    await openMenuAsync('Dokumen');
    const documentItems = [...container.querySelectorAll('.ed-dropdown-item')];
    expect(documentItems.length).toBeGreaterThan(0);
    for (const item of documentItems) {
      expect(item.disabled, `${item.textContent} should be enabled`).toBe(false);
    }
  });

  test('Given the tools bar, Then history and search sit in their own menu', async () => {
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

    // History is a visible menu now, not something hidden behind a toggle.
    const historyDropdown = await openMenuAsync('Riwayat');
    expect(historyDropdown).toBeTruthy();
    const historyItems = menuItemLabels();
    expect(historyItems).toEqual(expect.arrayContaining(['Batalkan', 'Ulangi', 'Cari / Ganti']));

    // History must not claim a place inside Format's scope.
    await openMenuAsync('Format');
    const formatItems = menuItemLabels();
    expect(formatItems).not.toContain('Batalkan');
    expect(formatItems).not.toContain('Cari / Ganti');
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

    // The piano entry point is a menu item under Sisip, reachable without
    // opening any drawer.
    await openMenuAsync('Sisip');
    const pianoButton = menuItemByText('Virtual Piano');
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

  test('Given detected instruments are present, Then they render as chips without a copy button', async () => {
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

    // Fitur copy instrumen dihapus: chip tetap tampil, tombol Copy tidak ada.
    expect(container.textContent).toContain('Stage Piano');
    expect(container.textContent).toContain('Gitar');
    expect(container.textContent).toContain('Sax');
    expect(container.textContent).toContain('Piano');
    const copyButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Copy');
    expect(copyButton).toBeFalsy();
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

  test('Given time and genre are present, Then genre sits in the header and time is integrated with tempo', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          tempo="120"
          timeSignature="4/4"
          genre="Rock"
        />
      );
    });

    // Genre kini di header, setelah nama penyanyi.
    const genreInline = container.querySelector('.song-genre-inline');
    expect(genreInline).toBeTruthy();
    expect(genreInline.textContent).toContain('Rock');

    // Time signature kini terintegrasi dengan label Tempo di baris kontrol.
    const tempoRow = Array.from(container.querySelectorAll('.song-info-control-row'))
      .find((row) => row.textContent.includes('Tempo'));
    expect(tempoRow).toBeTruthy();
    expect(tempoRow.textContent).toContain('4/4');
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

  test('Given the analyzer is rendered inline, Then it shows stats and chords without modal chrome', async () => {
    await act(async () => {
      root.render(
        <SongChordsAnalyzer
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
        />
      );
    });

    // Modal dihapus: konten inline langsung dirender tanpa overlay/tombol buka.
    expect(container.querySelector('.song-lyrics-analyzer-modal')).toBeFalsy();
    expect(container.querySelector('.modal-overlay')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-analyzer-inline-panel')).toBeTruthy();

    // Statistik yang tersisa: Unique Chord & Estimasi Key.
    expect(container.textContent).toContain('Unique Chord');
    expect(container.textContent).toContain('Estimasi Key');
    // Total Chord & Modulasi sudah dihapus.
    expect(container.textContent).not.toContain('Total Chord');
    expect(container.textContent).not.toContain('Modulasi');
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

    // Stays on the setlist route. Lyrics now live in their own tab: open it
    // first, then verify the chord display (not the editor) is shown.
    expect(currentLocation.pathname).toBe('/setlists/10/songs/1');
    const lyricsTab = Array.from(container.querySelectorAll('.song-tabs-tab'))
      .find((tab) => tab.textContent?.includes('Lirik'));
    expect(lyricsTab).toBeTruthy();
    await act(async () => {
      lyricsTab.click();
    });
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
    // Tombol kini menampilkan rekomendasi langsung (💡 + key), label "Key Mudah"
    // dipindah ke tooltip. Jarak transpose ada di tooltip.
    expect(keyEasyButton.textContent).toContain('💡');
    expect(keyEasyButton.getAttribute('title')).toContain('+5 semitone');

    await act(async () => {
      keyEasyButton.click();
    });

    // Lirik ada di tab Lirik — buka dulu sebelum memverifikasi chord.
    const lyricsTab = Array.from(container.querySelectorAll('.song-tabs-tab'))
      .find((tab) => tab.textContent?.includes('Lirik'));
    await act(async () => {
      lyricsTab.click();
    });

    expect(container.querySelector('.cd-chord')?.textContent).toBe('C G F');
  });
});
