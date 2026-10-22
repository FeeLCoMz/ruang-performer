import React from 'react';
import { describe, test, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ChordDisplay from '../components/ChordDisplay.jsx';

describe('ChordDisplay lyrics mode', () => {
  test('renders chord lines without any bar grid wrapper', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '| C | G | Am | F |' }}
          showChords={true}
        />
      );
    });

    expect(container.querySelector('.cd')).toBeTruthy();
    expect(container.querySelector('.cd-layout-bar-grid')).toBeFalsy();
    expect(container.querySelectorAll('.cd-bar-measure').length).toBe(0);
    expect(container.querySelectorAll('.cd-bar-beat-led').length).toBe(0);
    expect(container.textContent).toContain('Am');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('renders instrument tokens with category color classes and without parentheses', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '[Gitar] [Suling] lirik' }}
          showChords={false}
        />
      );
    });

    const instrumentTokens = container.querySelectorAll('.cd-instrument-token');
    expect(instrumentTokens).toHaveLength(2);
    expect(Array.from(instrumentTokens).map((node) => node.textContent)).toEqual(['Gitar', 'Suling']);
    expect(container.querySelector('.cd-instrument-token--guitar')).toBeTruthy();
    expect(container.querySelector('.cd-instrument-token--wind')).toBeTruthy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('applies the selected chord style: Simple, Jazz, and Angka', () => {
    const renderChords = (props) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      act(() => {
        root.render(<ChordDisplay song={{ lyrics: '| Cmaj7 | Am7 | G |' }} showChords={true} {...props} />);
      });
      const text = container.textContent;
      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
      return text;
    };

    expect(renderChords({ chordStyle: 'DEFAULT' })).toContain('Cmaj7');
    expect(renderChords({ chordStyle: 'SIMPLE' })).toContain('C');
    expect(renderChords({ chordStyle: 'SIMPLE' })).not.toContain('Cmaj7');
    expect(renderChords({ chordStyle: 'JAZZ' })).toContain('Cmaj9');
    expect(renderChords({ chordStyle: 'NUMBER', keySignature: 'C' })).toContain('1maj7');
  });

  test('renders instrument rows as their own block row with family colors', () => {
    // "[Gitar: ]" (detail kosong) dan "[Flute: Solo]" harus tampil sama seperti
    // tag instrumen di baris lirik: baris sendiri + warna keluarga. Sebelumnya
    // row instrument dirender <span class="cd-section-inst"> (inline-block),
    // sehingga menempel ke seksi di atasnya.
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '[Intro]\n[Gitar: ]\n[Flute: Solo]' }}
          showChords={true}
        />
      );
    });

    const instrumentRows = container.querySelectorAll('.cd-lyrics > .cd-instrument-token');
    expect(instrumentRows).toHaveLength(2);
    expect(instrumentRows[0].textContent).toBe('Gitar');
    expect(instrumentRows[1].textContent).toBe('Flute: Solo');
    expect(container.querySelector('.cd-instrument-token--guitar')).toBeTruthy();
    expect(container.querySelector('.cd-instrument-token--wind')).toBeTruthy();
    expect(container.querySelector('.cd-section-inst')).toBeFalsy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('renders a MIDI keyword line as plain text', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '[Keys: Acoustic Piano | PC: 0 | CH: 1]\n| C | G |' }}
          showChords={true}
        />
      );
    });

    // Keyword patch/MIDI dibaca modul MIDI, bukan ChordDisplay: baris itu
    // bukan label instrumen, bukan metadata, bukan badge cue.
    expect(container.querySelector('.cd-preset-cue')).toBeFalsy();
    expect(container.querySelector('.cd-instrument-token')).toBeFalsy();
    expect(container.querySelector('.cd-metadata')).toBeFalsy();
    expect(container.textContent).toContain('Keys: Acoustic Piano');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});