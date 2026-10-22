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

  test('renders instrument label instead of a preset cue badge', () => {
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

    // Parsing patch/MIDI sudah dihapus: baris cue tampil sebagai label
    // instrumen biasa, tanpa badge cue dan tanpa data MIDI.
    expect(container.querySelector('.cd-preset-cue')).toBeFalsy();
    const instrumentRow = container.querySelector('.cd-instrument-token');
    expect(instrumentRow).toBeTruthy();
    expect(instrumentRow.textContent).toContain('Keys: Acoustic Piano');
    expect(container.querySelector('.cd-metadata')).toBeFalsy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});