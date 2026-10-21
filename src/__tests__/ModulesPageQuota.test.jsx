import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react'; // wajib: JSX di proyek ini memakai transform klasik
import { createRoot } from 'react-dom/client';
import { act } from 'react';

/**
 * Halaman Modul menampilkan sisa kuota AI Autofill pada kartu modulnya,
 * supaya user tahu keadaannya sebelum kena 429.
 */

const mockGetAIUsage = vi.fn();

vi.mock('../apiClient.js', () => ({
  getAIUsage: (...args) => mockGetAIUsage(...args),
}));

vi.mock('../hooks/useModulesEnabled.js', () => ({
  useModulesEnabled: () => ({
    statuses: { 'ai-autofill': true, 'midi-cue': true },
    setEnabled: vi.fn(),
  }),
}));

vi.mock('../modules/registry.js', () => ({
  getVisibleModules: () => [
    { id: 'midi-cue', name: 'MIDI Cue', icon: '🎼', description: 'desc' },
    { id: 'ai-autofill', name: 'AI Autofill', icon: '🪄', description: 'desc' },
  ],
}));

import ModulesPage from '../pages/ModulesPage.jsx';
import { flushPromises, findElementByText } from './helpers/domTestUtils.js';

const cardFor = (container, name) =>
  Array.from(container.querySelectorAll('.modules-card')).find((el) => el.textContent.includes(name));

describe('ModulesPage — kuota AI Autofill', () => {
  let container;
  let root;

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    mockGetAIUsage.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // Modul AI Autofill harus aktif di localStorage agar hook memuat kuota.
    window.localStorage.setItem('ruang-performer:module:ai-autofill-enabled', 'true');
  });

  /** Render dengan mock yang sudah terpasang SEBELUM render pertama. */
  const renderWith = async (impl) => {
    if (impl) mockGetAIUsage.mockImplementation(impl);
    else mockGetAIUsage.mockResolvedValue({ used: 0, limit: 100, remaining: 100, period: '2026-10' });
    await act(async () => {
      root.render(<ModulesPage />);
      await flushPromises();
    });
  };

  afterEach(() => {
    act(() => root.unmount());
    document.body.removeChild(container);
    window.localStorage.clear();
  });

  test('menampilkan sisa kuota pada kartu AI Autofill', async () => {
    await renderWith(async () => ({ used: 12, limit: 100, remaining: 88, period: '2026-10' }));

    const card = cardFor(container, 'AI Autofill');
    expect(card.textContent).toContain('Sisa kuota');
    expect(card.textContent).toContain('88');
    expect(card.textContent).toContain('100');
    expect(findElementByText(container, '88')).toBeTruthy();
  });

  test('memberi peringatan jelas saat kuota habis', async () => {
    await renderWith(async () => ({ used: 100, limit: 100, remaining: 0, period: '2026-10' }));

    const card = cardFor(container, 'AI Autofill');
    expect(card.textContent).toMatch(/Kuota bulan 2026-10 habis/);
    expect(card.querySelector('.modules-quota-empty')).toBeTruthy();
  });

  test('menampilkan tombol coba lagi bila kuota tidak tersedia', async () => {
    await renderWith(async () => { throw new Error('offline'); });

    const card = cardFor(container, 'AI Autofill');
    expect(card.textContent).toContain('Sisa kuota tidak tersedia');
    expect(card.querySelector('.modules-quota-retry')).toBeTruthy();
  });

  test('kartu modul lain tidak menampilkan kuota', async () => {
    await renderWith(async () => ({ used: 1, limit: 100, remaining: 99, period: '2026-10' }));

    const midiCue = cardFor(container, 'MIDI Cue');
    expect(midiCue.querySelector('.modules-quota')).toBeNull();
  });
});
