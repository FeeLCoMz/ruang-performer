import React from 'react';
import { describe, test, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import FloatingYouTubePlayer from '../components/FloatingYouTubePlayer.jsx';

vi.mock('../components/YouTubeViewer.jsx', () => ({
  default: React.forwardRef(({ videoId }) => (
    <div data-testid="youtube-viewer">{videoId}</div>
  )),
}));

describe('FloatingYouTubePlayer', () => {
  test('renders a resize handle for desktop resizing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <FloatingYouTubePlayer
          isOpen={true}
          videoId="abc12345678"
          onClose={() => {}}
        />
      );
    });

    expect(container.querySelector('.floating-youtube-player-resize-handle')).toBeTruthy();
    expect(container.querySelector('.floating-youtube-player')).toBeTruthy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
