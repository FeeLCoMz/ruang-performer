import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

// Player YouTube di-mock: Stage Mode hanya butuh kontrak ref-nya.
vi.mock('../components/SongMediaPanel.jsx', () => ({
  default: () => <div data-testid="media-panel" />,
}));

import StageModePage from '../modules/stage-mode/StageModePage.jsx';

const song = {
  id: 's1',
  title: 'Lagu Satu',
  artist: 'Artis A',
  key: 'C',
  tempo: 100,
  lyrics: '[Intro]\nC G Am F\nLa la la',
};

const setlist = {
  id: 'sl1',
  name: 'Set Panggung',
  bandId: 'b1',
  songs: [{ id: 's1' }],
};

const mount = (element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
};

describe('StageModePage (redesign)', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.setItem('ruang-performer:module:stage-mode-enabled', 'true');
    window.localStorage.setItem('ruang-performer_stage_mode_v1', 'true');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('menampilkan topbar konteks band/setlist, key, tempo, dan judul lagu', () => {
    const { container, unmount } = mount(
      <StageModePage
        stageMode
        onExit={() => {}}
        songs={[song]}
        bands={[{ id: 'b1', name: 'Band Satu' }]}
        setlists={[setlist]}
        activeSetlist={setlist}
      />,
    );

    // Portal merender ke document.body (children container dikosongkan).
    const body = document.body;
    expect(body.querySelector('.stage-topbar')).toBeTruthy();
    expect(body.querySelector('.stage-context-eyebrow').textContent).toBe('Semua band');
    expect(body.querySelector('.stage-context-title').textContent).toContain('Set Panggung');
    expect(body.querySelector('.stage-stat--key').textContent).toBe('C');
    expect(body.querySelector('.stage-stat--tempo').textContent).toContain('100');
    expect(body.querySelector('.stage-songhead-title').textContent).toBe('Lagu Satu');
    expect(body.querySelector('.stage-lyrics')).toBeTruthy();

    unmount();
  });

  test('kontrol transpose/autoscroll tersembunyi sampai tombol Kontrol dibuka', () => {
    const { container, unmount } = mount(
      <StageModePage
        stageMode
        onExit={() => {}}
        songs={[song]}
        setlists={[setlist]}
        activeSetlist={setlist}
      />,
    );

    expect(document.body.querySelector('.stage-controls')).toBeFalsy();

    const controlBtn = Array.from(document.body.querySelectorAll('.stage-tool'))
      .find((btn) => btn.getAttribute('aria-label') === 'Kontrol panggung');
    expect(controlBtn).toBeTruthy();
    act(() => controlBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const panel = document.body.querySelector('.stage-controls');
    expect(panel).toBeTruthy();
    expect(controlBtn.getAttribute('aria-pressed')).toBe('true');
    // Panel berada di bawah lirik: sesudah .stage-lyrics, sebelum footer.
    const lyrics = document.body.querySelector('.stage-lyrics');
    expect(lyrics.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const footer = document.body.querySelector('.stage-bottom');
    expect(panel.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    unmount();
  });

  test('bottom bar menampilkan lagu berikutnya dan membuka sheet urutan lagu', () => {
    const { container, unmount } = mount(
      <StageModePage
        stageMode
        onExit={() => {}}
        songs={[song]}
        setlists={[setlist]}
        activeSetlist={setlist}
      />,
    );

    const nextBtn = document.body.querySelector('.stage-nextbtn');
    expect(nextBtn.textContent).toContain('Lagu terakhir');
    expect(nextBtn.textContent).toContain('1/1');

    act(() => nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const sheet = document.body.querySelector('.stage-sheet');
    expect(sheet).toBeTruthy();
    expect(sheet.querySelector('.stage-sheet-title').textContent).toContain('Set Panggung');
    expect(sheet.querySelector('.stage-sheet-count').textContent).toBe('1');
    expect(sheet.querySelector('.stage-sheet-item.is-active')).toBeTruthy();
    // Tidak ada dropdown band/setlist duplikat — hanya satu tombol ganti setlist.
    expect(sheet.querySelector('select')).toBeNull();
    expect(sheet.querySelectorAll('.stage-sheet-switch-btn').length).toBe(1);

    unmount();
  });

  test('scroll lirik memperbarui progress bar baca', () => {
    const { container, unmount } = mount(
      <StageModePage
        stageMode
        onExit={() => {}}
        songs={[song]}
        setlists={[setlist]}
        activeSetlist={setlist}
      />,
    );

    const lyrics = document.body.querySelector('.stage-lyrics');
    Object.defineProperty(lyrics, 'scrollHeight', { configurable: true, value: 2000 });
    Object.defineProperty(lyrics, 'clientHeight', { configurable: true, value: 1000 });
    lyrics.scrollTop = 500;

    act(() => {
      lyrics.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    const fill = document.body.querySelector('.stage-progress-fill');
    // rAF di jsdom bisa async — tunggu satu frame supaya state sempat update.
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(fill.style.width).toBe('50%');
        unmount();
        resolve();
      }, 32);
    });
  });

  test('tombol "Ganti setlist" di sheet urutan lagu membuka sheet pemilih setlist', () => {
    const { unmount } = mount(
      <StageModePage
        stageMode
        onExit={() => {}}
        songs={[song]}
        setlists={[setlist]}
        activeSetlist={setlist}
      />,
    );

    act(() => document.body.querySelector('.stage-nextbtn').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    act(() => document.body.querySelector('.stage-sheet-switch-btn').dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const sheet = document.body.querySelector('.stage-sheet');
    expect(sheet.querySelector('.stage-sheet-title').textContent).toContain('Pilih setlist');
    // Sheet pemilih setlist punya filter band + pencarian setlist (satu sumber).
    expect(sheet.querySelectorAll('select').length).toBe(1);
    expect(sheet.querySelector('input[type="search"]')).toBeTruthy();

    unmount();
  });

  test('menonaktifkan Stage Mode lewat topbar memanggil onExit', () => {
    const onExit = vi.fn();
    const { container, unmount } = mount(
      <StageModePage stageMode onExit={onExit} songs={[song]} setlists={[setlist]} activeSetlist={setlist} />,
    );

    const exitBtn = document.body.querySelector('.stage-topbar .stage-dark-btn');
    act(() => exitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(onExit).toHaveBeenCalledTimes(1);
    unmount();
  });
});
