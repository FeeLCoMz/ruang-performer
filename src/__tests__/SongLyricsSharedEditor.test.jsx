import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SongLyricsMainSection from '../components/SongLyricsMainSection.jsx';
import SongChordsLyricsToolbar from '../components/SongChordsLyricsToolbar.jsx';
import VirtualPiano from '../components/VirtualPiano.jsx';

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
