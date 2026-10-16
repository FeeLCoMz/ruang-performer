import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import LandingPage from '../pages/LandingPage.jsx';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../utils/metaTagsUtil.js', () => ({
  updatePageMeta: vi.fn(),
}));

describe('LandingPage', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockClear();
  });

  test('renders hero title and feature list correctly', async () => {
    await act(async () => {
      root.render(<LandingPage />);
    });

    expect(container.textContent).toContain('Ruang Performer');
    expect(container.textContent).toContain('Setlist & Jadwal Anda');
    expect(container.textContent).toContain('Koleksi Lagu & Smart Chords');
    expect(container.textContent).toContain('Penyusun Setlist Konser');
  });

  test('clicking Masuk button navigates to login', async () => {
    await act(async () => {
      root.render(<LandingPage />);
    });

    const loginBtns = Array.from(container.querySelectorAll('button')).filter(
      (btn) => btn.textContent.trim() === 'Masuk'
    );
    expect(loginBtns.length).toBeGreaterThan(0);

    await act(async () => {
      loginBtns[0].click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('clicking Daftar Gratis navigates to register mode', async () => {
    await act(async () => {
      root.render(<LandingPage />);
    });

    const registerBtns = Array.from(container.querySelectorAll('button')).filter(
      (btn) => btn.textContent.trim() === 'Daftar Gratis'
    );
    expect(registerBtns.length).toBeGreaterThan(0);

    await act(async () => {
      registerBtns[0].click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login?mode=register');
  });
});
