import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import BandListItem from '../components/BandListItem.jsx';

describe('BandListItem', () => {
  test('renders key band information on the card', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const navigate = vi.fn();

    act(() => {
      root.render(
        <BandListItem
          band={{
            id: 'band-1',
            name: 'The Drift',
            genre: 'Rock',
            memberCount: 4,
            description: 'Band dengan setlist energik',
            createdAt: '2026-07-01T00:00:00.000Z',
            joinedAt: '2026-07-03T00:00:00.000Z',
          }}
          userBandInfo={{ role: 'admin', joinedAt: '2026-07-03T00:00:00.000Z' }}
          navigate={navigate}
        />
      );
    });

    expect(container.textContent).toContain('The Drift');
    expect(container.textContent).toContain('Rock');
    expect(container.textContent).toContain('4 anggota');
    expect(container.textContent).toContain('Dibuat');
    expect(container.textContent).toContain('Bergabung');
    expect(container.textContent).toContain('Band dengan setlist energik');
    expect(container.textContent).toContain('Admin');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});