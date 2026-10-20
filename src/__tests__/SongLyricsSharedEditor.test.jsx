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

vi.mock('../components/SongMediaPanel.jsx', () => ({
  default: () => <div data-testid="song-chords-media-panel" />,
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
  fetchSetListById: vi.fn().mockResolvedValue(null),
  fetchSongs: vi.fn().mockResolvedValue([]),
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
        <MemoryRouter>
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
        </MemoryRouter>
      );
    });

    // Read-only view: chord display, toolbar (tanpa editor), dan display ada.
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
    // Kontrol tampilan tersedia di toolbar (mode panggung dihapus);
    expect(buttonLabels).toContain('Fokus');
    expect(buttonLabels).toContain('Kunci');
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
    // Transpose acts on the whole document, so it stays enabled without a selection.
    const documentScopedInFormat = ['Transpose −1', 'Transpose +1'];
    for (const item of selectionItems) {
      const shouldDisable = !documentScopedInFormat.some((label) => item.textContent.includes(label));
      expect(item.disabled, `${item.textContent} should be disabled`).toBe(shouldDisable);
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

  test('Given piano controls, Then the quick Piano button opens the piano in one click', async () => {
    const onOpenPiano = vi.fn();

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
            onOpenPiano,
            insertNotesEnabled: false,
            onToggleInsertNotes: noop,
            pianoOpen: false,
          }}
          autoFocus={false}
        />
      );
    });

    const quickPiano = container.querySelector('.lyric-quick-piano');
    expect(quickPiano).toBeTruthy();

    await act(async () => {
      quickPiano.click();
    });
    expect(onOpenPiano).toHaveBeenCalledTimes(1);
  });

  test('Given piano controls, Then the Insert ON/OFF switch is not rendered in the toolbar', async () => {
    const onToggleInsertNotes = vi.fn();

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
            insertNotesEnabled: false,
            onToggleInsertNotes,
            pianoOpen: false,
          }}
          autoFocus={false}
        />
      );
    });

    // The Insert switch lives inside the Virtual Piano modal, not the menubar.
    expect(container.querySelector('.lyric-quick-insert')).toBeFalsy();
  });

  test('Given piano controls, Then Alt+P opens the piano from the keyboard', async () => {
    const onOpenPiano = vi.fn();

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
            onOpenPiano,
            insertNotesEnabled: false,
            onToggleInsertNotes: noop,
            pianoOpen: false,
          }}
          autoFocus={false}
        />
      );
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', altKey: true, bubbles: true }));
    });
    expect(onOpenPiano).toHaveBeenCalledTimes(1);
  });

  test('Given recognized section labels, Then no detected-section badges are rendered', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
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
        </MemoryRouter>
      );
    });

    // The detected-section badge strip was removed from the editor; sections are
    // now surfaced by the structure sidebar in SongAddEditPage instead.
    expect(container.querySelector('.song-lyrics-detected-sections')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-section-detected-badge')).toBeFalsy();
  });

  test('Given SongChordsLyricsToolbar, Then autoscroll and view-mode controls are rendered (transpose/tempo dihapus)', async () => {
    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          tempo={120}
          autoScrollActive={false}
          setAutoScrollActive={noop}
          scrollSpeed={120}
          setScrollSpeed={noop}
          fontScale={1}
          setFontScale={noop}
          focusMode={false}
          setFocusMode={noop}
          screenLocked={false}
          setScreenLocked={noop}
        />
      );
    });

    const labels = Array.from(container.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).join(' ');
    // Transpose key & tempo kapsul dihapus dari toolbar (tersedia di header lagu
    // dan panel media).
    expect(container.querySelector('.transpose-key-capsule')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-tempo-capsule')).toBeFalsy();
    // Autoscroll lirik di toolbar: kapsul shared (AutoScrollControl).
    expect(container.querySelector('.song-lyrics-autoscroll-capsule')).toBeTruthy();
    // Kontrol tampilan dirender (mode panggung dihapus).
    expect(labels).toContain('Fokus');
    expect(labels).toContain('Kunci');
    expect(container.querySelector('.song-lyrics-font-control')).toBeTruthy();
    // Toggle mode lirik: satu tombol, aktif = hanya lirik.
    expect(container.querySelector('.song-lyrics-display-switcher-btn')).toBeTruthy();
    // Kontrol lama (non-autoscroll) dihapus dari toolbar dan tidak kembali.
    expect(labels).not.toContain('Play');
    expect(labels).not.toContain('Edit Lirik');
    expect(labels).not.toContain('Full screen');
    expect(labels).not.toContain('Export');
    expect(container.querySelector('.song-lyrics-chord-style-menu-container')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-youtube-btn')).toBeFalsy();
    expect(container.querySelector('.song-lyrics-export-menu-container')).toBeFalsy();
  });

  test('Given the setlist nav is provided, Then toolbar does NOT render it (pindah ke footer sticky)', async () => {
    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          fontScale={1}
          setFontScale={noop}
          setlistNav={{
            hasPrev: true,
            hasNext: false,
            songNumber: 2,
            totalSongs: 5,
            prevTitle: 'Lagu A',
            nextTitle: 'Lagu C',
            onPrev: noop,
            onNext: noop,
          }}
        />
      );
    });

    // Navigasi setlist kini hidup di SetlistNavFooter (sticky footer mobile),
    // bukan di toolbar panel lirik.
    expect(container.querySelector('.song-lyrics-toolbar-group-setlistnav')).toBeFalsy();
    expect(container.querySelector('.setlist-nav-footer')).toBeFalsy();
  });

  test('Given SetlistNavFooter, Then prev/next render with position info and disabled states', async () => {
    const SetlistNavFooter = (await import('../components/SetlistNavFooter.jsx')).default;

    await act(async () => {
      root.render(
        <SetlistNavFooter
          setlistNav={{
            hasPrev: true,
            hasNext: false,
            songNumber: 2,
            totalSongs: 5,
            prevTitle: 'Lagu A',
            nextTitle: 'Lagu C',
            onPrev: noop,
            onNext: noop,
          }}
        />
      );
    });

    const footer = container.querySelector('.setlist-nav-footer');
    expect(footer).toBeTruthy();
    expect(footer.textContent).toContain('2/5');
    const buttons = footer.querySelectorAll('button');
    // 3 tombol: prev, info posisi, next. Tombol overlay lirik sudah dihapus.
    expect(buttons.length).toBe(3);
    // Urutan tombol: prev, info posisi, next.
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[2].disabled).toBe(true);
  });

  test('Given SetlistNavFooter without nav, Then nothing renders', async () => {
    const SetlistNavFooter = (await import('../components/SetlistNavFooter.jsx')).default;

    await act(async () => {
      root.render(<SetlistNavFooter setlistNav={null} />);
    });

    expect(container.querySelector('.setlist-nav-footer')).toBeFalsy();
  });

  test('Given SetlistNavFooter outside a setlist, Then navigation renders without the setlist button', async () => {
    const SetlistNavFooter = (await import('../components/SetlistNavFooter.jsx')).default;

    await act(async () => {
      root.render(
        <SetlistNavFooter
          setlistNav={{
            hasPrev: true,
            hasNext: true,
            songNumber: 2,
            totalSongs: 4,
            prevTitle: 'Lagu A',
            nextTitle: 'Lagu C',
            onPrev: noop,
            onNext: noop,
            onOpenSetlist: undefined,
            songs: [
              { id: 'a', number: 1, title: 'Lagu A', key: 'C', isCurrent: false },
              { id: 'b', number: 2, title: 'Lagu B', key: 'D', isCurrent: true },
            ],
          }}
          allSongs={[]}
        />
      );
    });

    const footer = container.querySelector('.setlist-nav-footer');
    expect(footer).toBeTruthy();
    expect(footer.querySelectorAll('button').length).toBe(3);
    expect(footer.querySelector('[aria-label="Buka setlist aktif"]')).toBeFalsy();

    // Sheet pilih lagu tidak membagi grup setlist/repertoir tanpa setlist.
    await act(async () => {
      footer.querySelector('.setlist-nav-footer-info-btn').click();
    });
    const sheet = container.querySelector('.setlist-nav-sheet');
    expect(sheet).toBeTruthy();
    expect(sheet.textContent).toContain('repertoir');
    expect(sheet.textContent).not.toContain('Di luar setlist');
  });

  test('Given no setlist nav, Then the navigation group is not rendered', async () => {
    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          fontScale={1}
          setFontScale={noop}
        />
      );
    });

    expect(container.querySelector('.song-lyrics-toolbar-group-setlistnav')).toBeFalsy();
  });

  test('Given autoscroll on toolbar, When toggled or stepped, Then handlers receive updated values', async () => {
    const setAutoScrollActive = vi.fn();
    const setScrollSpeed = vi.fn();

    await act(async () => {
      root.render(
        <SongChordsLyricsToolbar
          autoScrollActive={false}
          setAutoScrollActive={setAutoScrollActive}
          scrollSpeed={120}
          setScrollSpeed={setScrollSpeed}
          tempo={120}
          fontScale={1}
          setFontScale={noop}
        />
      );
    });

    const group = container.querySelector('.song-lyrics-autoscroll-capsule');
    expect(group).toBeTruthy();

    // Toggle on/off.
    const toggle = group.querySelector('.song-lyrics-autoscroll-toggle');
    expect(toggle).toBeTruthy();
    await act(async () => { toggle.click(); });
    expect(setAutoScrollActive).toHaveBeenCalledWith(true);

    // Step kecepatan +1 BPM dari 120.
    const stepButtons = group.querySelectorAll('.song-lyrics-autoscroll-step');
    expect(stepButtons.length).toBe(2);
    await act(async () => { stepButtons[1].click(); });
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

  test('Given mastery info is present, Then the mastery chip sits inline on the Key row', async () => {
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

    // Mastery chip kini inline di baris Key (tanpa baris terpisah) — panel padat.
    const keyRow = container.querySelector('.song-info-control-row');
    expect(keyRow).toBeTruthy();
    expect(keyRow.querySelector('.song-mastery-chip')).toBeTruthy();
    expect(container.querySelector('.song-info-mastery-row')).toBeFalsy();
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

    // Stays on the setlist route. Lyrics tab sudah dihapus: panel lirik selalu
    // tampil tanpa perlu klik tab.
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

    // Navigator setlist sudah tidak ada lagi di aplikasi.
    expect(container.querySelector('.setlist-song-navigator')).toBeNull();
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
    // Auto-apply transpose (key master G -> key setlist D = -5) sudah diterapkan
    // sejak mount di level halaman, jadi jarak rekomendasi dihitung dari posisi
    // saat ini: D -> C = -2 semitone (sebelumnya +5 dari key master G).
    expect(keyEasyButton.textContent).toContain('💡');
    expect(keyEasyButton.getAttribute('title')).toContain('-2 semitone');

    await act(async () => {
      keyEasyButton.click();
    });

    // Tab Lirik sudah dihapus — panel lirik selalu tampil, langsung verifikasi chord.
    expect(container.querySelector('.cd-chord')?.textContent).toBe('C G F');
  });
});
