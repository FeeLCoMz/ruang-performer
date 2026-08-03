import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

const mockLogout = vi.fn();
const mockCan = vi.fn(() => true);

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ logout: mockLogout, user: { role: 'owner' } }),
}));

vi.mock('../hooks/usePermission.js', () => ({
  usePermission: () => ({ can: mockCan }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockCan.mockClear();
  });

  test('shows player label when lyrics mode is off and lirik label when active', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter>
          <Sidebar
            isOpen
            onClose={() => {}}
            theme="dark"
            setTheme={() => {}}
            performanceMode={false}
            setPerformanceMode={() => {}}
            lyricsMode={false}
            setLyricsMode={() => {}}
          />
        </MemoryRouter>
      );
    });

    const modeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label') === 'Toggle vocalist/player view'
    );

    expect(modeButton).toBeTruthy();
    expect(modeButton.textContent).toContain('Player');
    expect(modeButton.textContent).not.toContain('Lirik');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
