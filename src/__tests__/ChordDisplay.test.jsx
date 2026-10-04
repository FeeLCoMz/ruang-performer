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
          song={{ lyrics: '(Gitar) (Suling) lirik' }}
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

  test('renders preset cue badge inline above the following chord line', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '[Verse: Acoustic Piano]\n| C | G |' }}
          showChords={true}
        />
      );
    });

    const cueBadge = container.querySelector('.cd-preset-cue');
    expect(cueBadge).toBeTruthy();
    expect(cueBadge.textContent).toContain('[Verse: Acoustic Piano]');
    expect(container.querySelector('.cd-preset-cue-inline')).toBeFalsy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('calls preset cue trigger handler when Send MIDI button clicked', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const calls = [];

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '[Chorus: Lead Synth | PC: 81 | CH: 2]\n| C | G |' }}
          showChords={true}
          onPresetCueTrigger={(cue) => calls.push(cue)}
        />
      );
    });

    const trigger = container.querySelector('.cd-preset-cue-trigger');
    expect(trigger).toBeTruthy();

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].label).toBe('Chorus: Lead Synth');
    expect(calls[0].midi).toEqual({ program: 81, channel: 2 });

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});