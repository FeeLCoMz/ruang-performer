import React from 'react';
import { describe, test, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ChordDisplay from '../components/ChordDisplay.jsx';

describe('ChordDisplay bar grid mode', () => {
  test('renders bar boxes and active beat markers per measure in 4/4', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '| C | G | Am | F |' }}
          showChords={true}
          layoutMode="bar-grid"
          timeSignature="4/4"
          currentBeat={2}
        />
      );
    });

    expect(container.querySelectorAll('.cd-bar-measure').length).toBe(4);
    expect(container.querySelectorAll('.cd-bar-beat-led.is-active').length).toBe(4);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('adapts beat marker count to 3/4', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '| C | F |' }}
          showChords={true}
          layoutMode="bar-grid"
          timeSignature="3/4"
          currentBeat={1}
        />
      );
    });

    expect(container.querySelectorAll('.cd-bar-measure').length).toBe(2);
    expect(container.querySelectorAll('.cd-bar-measure .cd-bar-beat-led').length).toBe(6);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('adds secondary accent marker pattern for 6/8', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '| C | F |' }}
          showChords={true}
          layoutMode="bar-grid"
          timeSignature="6/8"
          currentBeat={3}
        />
      );
    });

    expect(container.querySelectorAll('.cd-bar-measure .cd-bar-beat-led').length).toBe(12);
    expect(container.querySelectorAll('.cd-bar-measure .cd-bar-beat-led.is-sub-accent').length).toBe(2);

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
          layoutMode="lyrics"
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

  test('applies fixed 2-column grid class when requested', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '| C | G | Am | F |' }}
          showChords={true}
          layoutMode="bar-grid"
          barGridColumns="2"
        />
      );
    });

    expect(container.querySelector('.cd.cd-layout-bar-grid.cd-layout-bar-grid-cols-2')).toBeTruthy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('hides lyric lines in bar-grid focus mode while keeping bars', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: 'Verse:\n| C | G |\nHalo dunia' }}
          showChords={true}
          layoutMode="bar-grid"
          barGridFocusMode={true}
        />
      );
    });

    expect(container.querySelectorAll('.cd-bar-measure').length).toBe(2);
    expect(container.textContent).not.toContain('Halo dunia');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('maps dot-step notation to multiple chords in one bar', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '| C . Dm . |' }}
          showChords={true}
          layoutMode="bar-grid"
          timeSignature="4/4"
        />
      );
    });

    const occupied = container.querySelectorAll('.cd-bar-beat-cell--occupied');
    expect(container.querySelectorAll('.cd-bar-measure').length).toBe(1);
    expect(occupied.length).toBe(2);
    expect(container.textContent).toContain('C');
    expect(container.textContent).toContain('Dm');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('renders preset cue badge above following bar grid line', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChordDisplay
          song={{ lyrics: '[Verse: Acoustic Piano]\n| C | G |' }}
          showChords={true}
          layoutMode="bar-grid"
        />
      );
    });

    const cueBadge = container.querySelector('.cd-preset-cue');
    expect(cueBadge).toBeTruthy();
    expect(cueBadge.textContent).toContain('[Verse: Acoustic Piano]');
    expect(container.querySelectorAll('.cd-bar-measure').length).toBe(2);

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
          layoutMode="bar-grid"
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
