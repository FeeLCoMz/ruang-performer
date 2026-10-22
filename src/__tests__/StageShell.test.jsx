import React from 'react';
import { describe, test, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { StageIcon } from '../modules/stage-mode/StageShell.jsx';

const render = (name) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<StageIcon name={name} size={18} />));
  const svg = container.querySelector('svg');
  return { container, svg, unmount: () => { act(() => root.unmount()); document.body.removeChild(container); } };
};

describe('StageIcon', () => {
  test.each(['close', 'prev', 'next', 'info', 'list', 'sliders', 'headphone', 'search'])(
    'ikon "%s" benar-benar dirender sebagai SVG berisi path',
    (name) => {
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const { svg, unmount } = render(name);
      expect(svg).toBeTruthy();
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(Number(svg.getAttribute('width'))).toBe(18);
      expect(svg.querySelectorAll('path, circle').length).toBeGreaterThan(0);
      unmount();
    },
  );

  test('nama ikon tidak dikenal tidak merender apa pun', () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const { svg, unmount } = render('tidak-ada');
    expect(svg).toBeNull();
    unmount();
  });
});
