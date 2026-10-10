import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ChordDisplay from '../components/ChordDisplay.jsx';

/**
 * The timestamp play button repeatedly regressed because it lives in one branch
 * of ChordDisplay's line rendering. These tests render the real component and
 * assert the button appears for every line type a timestamp can sit on.
 */

function render(ui) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

const findPlayButtons = (container) =>
  Array.from(container.querySelectorAll('button')).filter((btn) =>
    /▶|⏸/.test(btn.textContent || '')
  );

describe('ChordDisplay timestamp play button', () => {
  let mounted;

  afterEach(() => {
    if (mounted) mounted.cleanup();
    mounted = null;
  });

  test('Given a timestamp on a plain lyrics line, Then a play button renders', () => {
    mounted = render(
      <ChordDisplay
        song={{ lyrics: 'Aku pulang [01:23] ke rumah' }}
        onTimestampClick={() => {}}
      />
    );
    expect(findPlayButtons(mounted.container)).toHaveLength(1);
  });

  test('Given a timestamp on a chord line, Then a play button renders', () => {
    // Regression: only the lyrics branch used to render the button, so
    // "[01:23] | C | G |" was silently unplayable.
    mounted = render(
      <ChordDisplay
        song={{ lyrics: '[01:23] | C | G |' }}
        onTimestampClick={() => {}}
      />
    );
    expect(findPlayButtons(mounted.container).length).toBeGreaterThan(0);
  });

  test('Given a timestamp on its own line, Then a play button renders', () => {
    mounted = render(
      <ChordDisplay song={{ lyrics: '[00:12]' }} onTimestampClick={() => {}} />
    );
    expect(findPlayButtons(mounted.container).length).toBeGreaterThan(0);
  });

  test('Given playing state from the parent, Then the icon shows pause', () => {
    mounted = render(
      <ChordDisplay
        song={{ lyrics: 'Aku pulang [01:23] ke rumah' }}
        onTimestampClick={() => {}}
        onTimestampPause={() => {}}
        isPlaying={true}
      />
    );
    const [button] = findPlayButtons(mounted.container);
    expect(button.textContent).toContain('⏸');
    expect(button.title).toMatch(/jeda/i);
  });

  test('Given not playing, Then the icon shows play and offers a seek', () => {
    mounted = render(
      <ChordDisplay
        song={{ lyrics: 'Aku pulang [01:23] ke rumah' }}
        onTimestampClick={() => {}}
        isPlaying={false}
      />
    );
    const [button] = findPlayButtons(mounted.container);
    expect(button.textContent).toContain('▶');
    expect(button.title).toMatch(/putar ke/i);
  });

  test('Given playing, When clicked, Then it pauses instead of seeking', () => {
    const onTimestampClick = vi.fn();
    const onTimestampPause = vi.fn();

    mounted = render(
      <ChordDisplay
        song={{ lyrics: 'Aku pulang [01:23] ke rumah' }}
        onTimestampClick={onTimestampClick}
        onTimestampPause={onTimestampPause}
        isPlaying={true}
      />
    );

    const [button] = findPlayButtons(mounted.container);
    act(() => button.click());

    expect(onTimestampPause).toHaveBeenCalledTimes(1);
    expect(onTimestampClick).not.toHaveBeenCalled();
  });

  test('Given stopped, When clicked, Then it seeks to that timestamp', () => {
    const onTimestampClick = vi.fn();
    const onTimestampPause = vi.fn();

    mounted = render(
      <ChordDisplay
        song={{ lyrics: 'Aku pulang [01:23] ke rumah' }}
        onTimestampClick={onTimestampClick}
        onTimestampPause={onTimestampPause}
        isPlaying={false}
      />
    );

    const [button] = findPlayButtons(mounted.container);
    act(() => button.click());

    // 01:23 => 83 seconds
    expect(onTimestampClick).toHaveBeenCalledWith(83);
    expect(onTimestampPause).not.toHaveBeenCalled();
  });

  test('Given no video handlers at all, Then the button is disabled with a hint', () => {
    mounted = render(<ChordDisplay song={{ lyrics: 'Aku pulang [01:23] ke rumah' }} />);

    const [button] = findPlayButtons(mounted.container);
    expect(button.disabled).toBe(true);
    expect(button.title).toMatch(/tambahkan youtube/i);
  });

  test('Given lyrics with several timestamps, Then each gets its own button', () => {
    mounted = render(
      <ChordDisplay
        song={{ lyrics: '[00:10] Intro\n[01:23] Verse\n[02:45] Chorus' }}
        onTimestampClick={() => {}}
      />
    );
    expect(findPlayButtons(mounted.container).length).toBeGreaterThanOrEqual(3);
  });
});
