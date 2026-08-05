import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SongLyricsMainSection from '../components/SongLyricsMainSection.jsx';
import SongChordsLyricsToolbar from '../components/SongChordsLyricsToolbar.jsx';
import ChordDisplay from '../components/ChordDisplay.jsx';
import SongChordsInfo from '../components/SongChordsInfo.jsx';
import SongChordsLyricsDisplay from '../components/SongChordsLyricsDisplay.jsx';
import TransposeKeyControl from '../components/TransposeKeyControl.jsx';
import VirtualPiano from '../components/VirtualPiano.jsx';
import SongChordsPage from '../pages/SongChordsPage.jsx';

vi.mock('../components/SetlistSongNavigator.jsx', () => ({
  default: ({ compact }) => <div data-testid="setlist-navigator">{compact ? 'compact' : 'full'}</div>,
}));

vi.mock('../components/SongChordsMediaPanel.jsx', () => ({
  default: () => <div data-testid="song-chords-media-panel" />,
}));

vi.mock('../components/FloatingYouTubePlayer.jsx', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="floating-youtube-player" /> : null),
}));

vi.mock('../hooks/useSongFetch.js', () => ({
  useSongFetch: () => ({
    song: { id: '1', title: 'Song A', lyrics: '[C]Hello', youtubeId: 'dQw4w9WgXcQ' },
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

function SongViewEditorHarness() {
  const [editedLyrics, setEditedLyrics] = React.useState('');
  const [showLyricsPiano, setShowLyricsPiano] = React.useState(false);
  const lyricsDisplayRef = React.useRef(null);

  return (
    <>
      <SongLyricsMainSection
        isEditingLyrics={true}
        lyricsDisplayRef={lyricsDisplayRef}
        editedLyrics={editedLyrics}
        setEditedLyrics={setEditedLyrics}
        editError={null}
        handleEditLyrics={noop}
        savingLyrics={false}
        handleSaveLyrics={noop}
        handleAlignSelectedBarlines={noop}
        handleWrap4BarsPerLine={noop}
        barsPerLine={4}
        setBarsPerLine={noop}
        handleWrapBarsPerLine={noop}
        handleCancelEditLyrics={noop}
        onOpenPiano={() => setShowLyricsPiano(true)}
        insertNotesToLyrics={true}
        setInsertNotesToLyrics={noop}
        insertNoteFormat={'bracket'}
        setInsertNoteFormat={noop}
        insertTrailingSpace={true}
        setInsertTrailingSpace={noop}
        insertNumberKeySignature={'C'}
        showExportMenu={false}
        setShowExportMenu={noop}
        handleExportText={noop}
        handleExportPDF={noop}
        tempo={120}
        timeSignature={'4/4'}
        autoScrollActive={false}
        scrollSpeed={120}
        setAutoScrollActive={noop}
        setScrollSpeed={noop}
        currentBeat={0}
        setCurrentBeat={noop}
        zoom={1}
        setZoom={noop}
        performanceMode={false}
        canEdit={true}
        song={{ lyrics: editedLyrics }}
        transpose={0}
        setTranspose={noop}
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
      <VirtualPiano
        isOpen={showLyricsPiano}
        onClose={() => setShowLyricsPiano(false)}
        onKeySelect={(note) => {
          setEditedLyrics((prev) => `${prev}[${note}] `);
        }}
      />
    </>
  );
}

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

  test('Given SongLyricsMainSection in edit mode, Then shared editor actions and textarea are rendered', async () => {
    await act(async () => {
      root.render(
        <SongLyricsMainSection
          isEditingLyrics={true}
          lyricsDisplayRef={{ current: null }}
          editedLyrics={'[C]Hello'}
          setEditedLyrics={noop}
          editError={null}
          handleEditLyrics={noop}
          savingLyrics={false}
          handleSaveLyrics={noop}
          handleAlignSelectedBarlines={noop}
          handleWrap4BarsPerLine={noop}
          barsPerLine={4}
          setBarsPerLine={noop}
          handleWrapBarsPerLine={noop}
          handleCancelEditLyrics={noop}
          onOpenPiano={noop}
          insertNotesToLyrics={true}
          setInsertNotesToLyrics={noop}
          insertNoteFormat={'bracket'}
          setInsertNoteFormat={noop}
          insertTrailingSpace={true}
          setInsertTrailingSpace={noop}
          insertNumberKeySignature={'C'}
          showExportMenu={false}
          setShowExportMenu={noop}
          handleExportText={noop}
          handleExportPDF={noop}
          tempo={120}
          timeSignature={'4/4'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          setScrollSpeed={noop}
          currentBeat={0}
          setCurrentBeat={noop}
          zoom={1}
          setZoom={noop}
          performanceMode={false}
          canEdit={true}
          song={{ lyrics: '[C]Hello' }}
          transpose={0}
          setTranspose={noop}
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

    expect(container.querySelector('.song-lyrics-edit-actions')).toBeTruthy();
    expect(container.querySelector('.song-lyrics-textarea')).toBeTruthy();
  });

  test('Given SongChordsLyricsToolbar in edit mode, Then toolbar does not render old edit action block', async () => {
    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          isEditingLyrics={true}
          performanceMode={false}
          canEdit={true}
          tempo={120}
          timeSignature={'4/4'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          setScrollSpeed={noop}
          lyricsDisplayRef={{ current: null }}
          currentBeat={0}
          setCurrentBeat={noop}
          transpose={0}
          setTranspose={noop}
          zoom={1}
          setZoom={noop}
          showChordNumbers={false}
          setShowChordNumbers={noop}
          showJazzChords={false}
          setShowJazzChords={noop}
          showSimpleChords={false}
          setShowSimpleChords={noop}
          keySignature={'C'}
          handleEditLyrics={noop}
          savingLyrics={false}
          handleSaveLyrics={noop}
          handleAlignSelectedBarlines={noop}
          handleWrap4BarsPerLine={noop}
          barsPerLine={4}
          setBarsPerLine={noop}
          handleWrapBarsPerLine={noop}
          handleCancelEditLyrics={noop}
          onOpenPiano={noop}
          insertNotesToLyrics={true}
          setInsertNotesToLyrics={noop}
          insertNoteFormat={'bracket'}
          setInsertNoteFormat={noop}
          insertTrailingSpace={true}
          setInsertTrailingSpace={noop}
          showExportMenu={false}
          setShowExportMenu={noop}
          handleExportText={noop}
          handleExportPDF={noop}
        />
      );
    });

    expect(container.querySelector('.song-lyrics-edit-actions')).toBeFalsy();
  });

  test('Given lirik mode is active, Then non-essential song actions are hidden', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          contributor="Contributor"
          performanceMode={false}
          lyricsMode={true}
          canEdit={true}
          onEdit={noop}
          onShare={noop}
          shareMessage="Shared"
          showSongInfo={true}
          setShowSongInfo={noop}
        />
      );
    });

    expect(container.querySelector('.song-title-actions')).toBeFalsy();
    expect(container.textContent).toContain('Song A');
    expect(container.textContent).toContain('Artist A');
  });

  test('Given lirik mode is active, Then tempo time and genre metadata are hidden', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          contributor="Contributor"
          performanceMode={false}
          lyricsMode={true}
          canEdit={true}
          onEdit={noop}
          onShare={noop}
          shareMessage="Shared"
          showSongInfo={true}
          setShowSongInfo={noop}
          originalKey="C"
          targetKey="D"
          tempo="120"
          timeSignature="4/4"
          genre="Rock"
        />
      );
    });

    expect(container.textContent).not.toContain('Tempo');
    expect(container.textContent).not.toContain('Time');
    expect(container.textContent).not.toContain('Genre');
  });

  test('Given normal mode is active, Then mastery info renders as a full-width row', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          performanceMode={false}
          lyricsMode={false}
          showSongInfo={true}
          setShowSongInfo={noop}
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

    expect(container.querySelector('.song-info-mastery-block-full')).toBeTruthy();
  });

  test('Given normal mode is active, Then time and genre render as a combined two-column row', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          performanceMode={false}
          lyricsMode={false}
          showSongInfo={true}
          setShowSongInfo={noop}
          timeSignature="4/4"
          genre="Rock"
        />
      );
    });

    expect(container.querySelector('.song-info-combined-row')).toBeTruthy();
    expect(container.querySelectorAll('.song-info-combined-column')).toHaveLength(2);
  });

  test('Given performance mode is active, Then song info metadata remains visible', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          contributor="Contributor"
          performanceMode={true}
          lyricsMode={false}
          canEdit={true}
          onEdit={noop}
          onShare={noop}
          shareMessage="Shared"
          showSongInfo={true}
          setShowSongInfo={noop}
          originalKey="C"
          targetKey="D"
          tempo="120"
          timeSignature="4/4"
          genre="Rock"
        />
      );
    });

    expect(container.querySelector('.song-title-actions')).toBeFalsy();
    expect(container.querySelector('.song-info-compact-grid')).toBeTruthy();
    expect(container.textContent).toContain('Song A');
    expect(container.textContent).toContain('Artist A');
    expect(container.textContent).toContain('Key');
    expect(container.textContent).toContain('Tempo');
    expect(container.textContent).toContain('Genre');
  });

  test('Given performance mode transpose is set, Then key metadata reflects transposed key', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          performanceMode={true}
          lyricsMode={false}
          showSongInfo={true}
          setShowSongInfo={noop}
          originalKey="C"
          targetKey="C"
          transpose={2}
          setTranspose={noop}
          tempo="120"
          timeSignature="4/4"
        />
      );
    });

    expect(container.textContent).toContain('Key: D');
  });

  test('Given performance mode is active with piano recommendation, Then recommendation button is visible', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          contributor="Contributor"
          performanceMode={true}
          lyricsMode={false}
          canEdit={true}
          onEdit={noop}
          onShare={noop}
          shareMessage="Shared"
          showSongInfo={true}
          setShowSongInfo={noop}
          pianoRecommendation={{ recommendedKey: 'C', transposeFromCurrent: 2 }}
          onApplyRecommendedTranspose={noop}
        />
      );
    });

    expect(container.textContent).toContain('Key Kibordis');
    expect(container.textContent).not.toContain('Jarak dari key dasar');
    expect(Array.from(container.querySelectorAll('button')).some((btn) => btn.textContent?.includes('Terapkan Key Kibordis'))).toBe(false);

    const toggleButton = container.querySelector('.song-info-piano-reco-toggle');
    expect(toggleButton).toBeTruthy();
    await act(async () => {
      toggleButton.click();
    });

    expect(container.textContent).toContain('C');
    expect(container.textContent).toContain('Jarak dari key dasar');
    expect(container.textContent).toContain('+2 semitone');
    expect(Array.from(container.querySelectorAll('button')).some((btn) => btn.textContent?.includes('Terapkan Key Kibordis'))).toBe(true);
  });

  test('Given performance mode is active, Then toolbar keeps only essential controls', async () => {
    const onPlayYouTube = vi.fn();

    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          isEditingLyrics={false}
          performanceMode={true}
          lyricsMode={false}
          canEdit={true}
          tempo={120}
          timeSignature={'4/4'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          setScrollSpeed={noop}
          lyricsDisplayRef={{ current: null }}
          currentBeat={0}
          setCurrentBeat={noop}
          transpose={0}
          setTranspose={noop}
          zoom={1}
          setZoom={noop}
          showChordNumbers={false}
          setShowChordNumbers={noop}
          showJazzChords={false}
          setShowJazzChords={noop}
          showSimpleChords={false}
          setShowSimpleChords={noop}
          keySignature={'C'}
          handleEditLyrics={noop}
          savingLyrics={false}
          handleSaveLyrics={noop}
          handleAlignSelectedBarlines={noop}
          handleWrap4BarsPerLine={noop}
          barsPerLine={4}
          setBarsPerLine={noop}
          handleWrapBarsPerLine={noop}
          handleCancelEditLyrics={noop}
          onOpenPiano={noop}
          insertNotesToLyrics={true}
          setInsertNotesToLyrics={noop}
          insertNoteFormat={'bracket'}
          setInsertNoteFormat={noop}
          insertTrailingSpace={true}
          setInsertTrailingSpace={noop}
          showExportMenu={false}
          setShowExportMenu={noop}
          handleExportText={noop}
          handleExportPDF={noop}
          youtubeId={'dQw4w9WgXcQ'}
          youtubeRef={{ current: null }}
          onPlayYouTube={onPlayYouTube}
          onRestartYouTube={noop}
        />
      );
    });

    expect(Array.from(container.querySelectorAll('button')).some((btn) => btn.title === 'Edit Lirik')).toBe(false);
    expect(container.querySelector('.song-lyrics-transpose-controls')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-transpose-controls-compact')).toBeTruthy();
    expect(container.querySelector('.song-lyrics-toolbar-group-tempo-led-compact')).toBeTruthy();
    expect(container.querySelector('.song-lyrics-chord-style-menu-container')).toBeFalsy();
    expect(Array.from(container.querySelectorAll('button')).some((btn) => btn.textContent?.includes('Full screen'))).toBe(true);
    expect(container.querySelector('.auto-scroll-bar-compact')).toBeTruthy();
    expect(container.querySelector('.auto-scroll-tempo-slider')).toBeFalsy();
    expect(container.querySelector('.auto-scroll-menu-toggle')).toBeFalsy();
    expect(container.querySelector('.auto-scroll-beats-minimal')).toBeFalsy();

    const playButton = Array.from(container.querySelectorAll('button')).find((btn) => btn.title === 'Play YouTube');
    expect(playButton).toBeTruthy();
    await act(async () => {
      playButton.click();
    });
    expect(onPlayYouTube).toHaveBeenCalled();
  });

  test('Given performance mode is active, Then the lyrics and chord collapse button is hidden', async () => {
    await act(async () => {
      root.render(
        <SongLyricsMainSection
          isEditingLyrics={false}
          lyricsDisplayRef={{ current: null }}
          editedLyrics={'[C]Hello'}
          setEditedLyrics={noop}
          editError={null}
          handleEditLyrics={noop}
          savingLyrics={false}
          handleSaveLyrics={noop}
          handleAlignSelectedBarlines={noop}
          handleWrap4BarsPerLine={noop}
          barsPerLine={4}
          setBarsPerLine={noop}
          handleWrapBarsPerLine={noop}
          handleCancelEditLyrics={noop}
          onOpenPiano={noop}
          insertNotesToLyrics={false}
          setInsertNotesToLyrics={noop}
          insertNoteFormat={'bracket'}
          setInsertNoteFormat={noop}
          insertTrailingSpace={false}
          setInsertTrailingSpace={noop}
          insertNumberKeySignature={'C'}
          showExportMenu={false}
          setShowExportMenu={noop}
          handleExportText={noop}
          handleExportPDF={noop}
          tempo={120}
          timeSignature={'4/4'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          setScrollSpeed={noop}
          currentBeat={0}
          setCurrentBeat={noop}
          zoom={1}
          setZoom={noop}
          performanceMode={true}
          lyricsMode={false}
          canEdit={true}
          song={{ lyrics: '[C]Hello' }}
          transpose={0}
          setTranspose={noop}
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
          youtubeId={null}
          loading={false}
        />
      );
    });

    expect(container.querySelector('.expand-button')).toBeFalsy();
  });

  test('Given performance mode is active in player view, Then transpose and sheet music controls are hidden', async () => {
    await act(async () => {
      root.render(
        <SongChordsLyricsDisplay
          isEditingLyrics={false}
          lyricsDisplayRef={{ current: null }}
          editedLyrics={''}
          setEditedLyrics={noop}
          song={{ lyrics: '[C]Hello', tempo: '120', sheetMusicXml: '<xml />' }}
          performanceMode={true}
          transpose={0}
          setTranspose={noop}
          showChords={true}
          zoom={1}
          setZoom={noop}
          lyricsMode={false}
          showChordNumbers={false}
          showJazzChords={false}
          showSimpleChords={false}
          keySignature={'C'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          setScrollSpeed={noop}
          showSheetMusic={true}
          setShowSheetMusic={noop}
          youtubeRef={{ current: null }}
          youtubeId={null}
        />
      );
    });

    expect(container.querySelector('.song-lyrics-fullscreen-control-row[aria-label="Transpose"]')).toBeFalsy();
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent?.includes('Lihat Partitur'))).toBe(false);
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

  test('Given vocalist mode is active, Then edit and export controls are hidden', async () => {
    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          isEditingLyrics={false}
          performanceMode={false}
          lyricsMode={true}
          canEdit={true}
          tempo={120}
          timeSignature={'4/4'}
          autoScrollActive={false}
          scrollSpeed={120}
          setAutoScrollActive={noop}
          setScrollSpeed={noop}
          lyricsDisplayRef={{ current: null }}
          currentBeat={0}
          setCurrentBeat={noop}
          transpose={0}
          setTranspose={noop}
          zoom={1}
          setZoom={noop}
          showChordNumbers={false}
          setShowChordNumbers={noop}
          showJazzChords={false}
          setShowJazzChords={noop}
          showSimpleChords={false}
          setShowSimpleChords={noop}
          keySignature={'C'}
          handleEditLyrics={noop}
          savingLyrics={false}
          handleSaveLyrics={noop}
          handleAlignSelectedBarlines={noop}
          handleWrap4BarsPerLine={noop}
          barsPerLine={4}
          setBarsPerLine={noop}
          handleWrapBarsPerLine={noop}
          handleCancelEditLyrics={noop}
          onOpenPiano={noop}
          insertNotesToLyrics={true}
          setInsertNotesToLyrics={noop}
          insertNoteFormat={'bracket'}
          setInsertNoteFormat={noop}
          insertTrailingSpace={true}
          setInsertTrailingSpace={noop}
          showExportMenu={false}
          setShowExportMenu={noop}
          handleExportText={noop}
          handleExportPDF={noop}
          youtubeId={null}
          youtubeRef={{ current: null }}
        />
      );
    });

    expect(Array.from(container.querySelectorAll('button')).some((btn) => btn.title === 'Edit Lirik')).toBe(false);
    expect(Array.from(container.querySelectorAll('button')).some((btn) => btn.title === 'Export')).toBe(false);
  });

  test('Given vocalist mode is active, Then piano recommendation is hidden', async () => {
    await act(async () => {
      root.render(
        <SongChordsInfo
          title="Song A"
          artist="Artist A"
          contributor="Contributor"
          performanceMode={true}
          lyricsMode={true}
          canEdit={true}
          onEdit={noop}
          onShare={noop}
          shareMessage="Shared"
          showSongInfo={true}
          setShowSongInfo={noop}
          pianoRecommendation={{ recommendedKey: 'C', transposeFromCurrent: 2 }}
          onApplyRecommendedTranspose={noop}
        />
      );
    });

    expect(container.textContent).not.toContain('Key Kibordis');
    expect(Array.from(container.querySelectorAll('button')).some((btn) => btn.textContent?.includes('Terapkan Key Kibordis'))).toBe(false);
  });

  test('Given performance mode is active, Then the YouTube media panel stays mounted but hidden', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/songs/view/1']}>
          <Routes>
            <Route path="/songs/view/:id" element={<SongChordsPage performanceMode={true} />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container.querySelector('.song-media-panel-hidden')).toBeTruthy();
  });

  test('Given vocalist mode is active in a setlist view, Then setlist navigator is still rendered', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/setlists/10/songs/1']}>
          <Routes>
            <Route path="/setlists/:setlistId/songs/:id" element={<SongChordsPage lyricsMode={true} />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container.querySelector('[data-testid="setlist-navigator"]')).toBeTruthy();
  });

  test('Given performance mode is active in a setlist view, Then setlist navigator uses compact buttons', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/setlists/10/songs/1']}>
          <Routes>
            <Route path="/setlists/:setlistId/songs/:id" element={<SongChordsPage performanceMode={true} lyricsMode={false} />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const navigator = container.querySelector('[data-testid="setlist-navigator"]');
    expect(navigator).toBeTruthy();
    expect(navigator.textContent).toContain('compact');
  });

  test('Given song view edit mode, When piano note is selected, Then lyrics state receives note token', async () => {
    await act(async () => {
      root.render(<SongViewEditorHarness />);
    });

    const pianoOpenButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('🎹 Piano')
    );
    expect(pianoOpenButton).toBeTruthy();

    await act(async () => {
      pianoOpenButton.click();
    });

    const noteButton = Array.from(container.querySelectorAll('.piano-key')).find((btn) =>
      btn.textContent?.trim() === 'C'
    );
    expect(noteButton).toBeTruthy();

    await act(async () => {
      noteButton.click();
    });

    const textarea = container.querySelector('.song-lyrics-textarea');
    expect(textarea.value).toBe('[C] ');
  });
});
