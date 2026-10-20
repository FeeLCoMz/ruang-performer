import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Modul AI Autofill default NONAKTIF (berbiaya API): pastikan gate-nya bekerja
 * sebelum dan sesudah diaktifkan, termasuk saat API dipanggil langsung.
 */

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const originalWindow = globalThis.window;

beforeEach(() => {
  globalThis.window = {
    localStorage: new MemoryStorage(),
    addEventListener() {},
    removeEventListener() {},
  };
  vi.resetModules();
});

afterEach(() => {
  globalThis.window = originalWindow;
  vi.restoreAllMocks();
});

const loadModule = () => import('../modules/ai-autofill/aiAutofillApi.js');
const loadSettings = () => import('../modules/ai-autofill/aiAutofillSettings.js');

describe('AI Autofill module gate', () => {
  test('nonaktif secara default', async () => {
    const { isAIAutofillEnabled } = await loadSettings();
    expect(isAIAutofillEnabled()).toBe(false);
  });

  test('memanggil API saat modul nonaktif ditolak tanpa request jaringan', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { autofillSongMetadata } = await loadModule();

    await expect(autofillSongMetadata({ title: 'Imagine', artist: 'John Lennon' }))
      .rejects.toThrow(/nonaktifkan/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('judul kosong ditolak meski modul aktif', async () => {
    const { setAIAutofillEnabled } = await loadSettings();
    setAIAutofillEnabled(true);
    const { autofillSongMetadata } = await loadModule();

    await expect(autofillSongMetadata({ title: '   ' }))
      .rejects.toThrow(/judul/i);
  });

  test('meneruskan title & artist yang sudah di-trim ke apiClient', async () => {
    const { setAIAutofillEnabled } = await loadSettings();
    setAIAutofillEnabled(true);

    vi.doMock('../apiClient.js', () => ({
      aiSongSearch: vi.fn().mockResolvedValue({ artist: 'John Lennon', key: 'C' }),
    }));
    const { autofillSongMetadata } = await loadModule();
    const apiClient = await import('../apiClient.js');

    await autofillSongMetadata({ title: '  Imagine ', artist: ' John Lennon ' });
    expect(apiClient.aiSongSearch).toHaveBeenCalledWith({ title: 'Imagine', artist: 'John Lennon' });
  });

  test('buildDefaultAiConfirmFields hanya mencentang field yang terisi', async () => {
    const { buildDefaultAiConfirmFields } = await loadModule();
    expect(buildDefaultAiConfirmFields({ artist: 'A', key: '', tempo: 120 })).toEqual({
      artist: true,
      key: false,
      tempo: true,
      genre: false,
      youtubeId: false,
      keyboardPatch: false,
    });
    expect(buildDefaultAiConfirmFields(null)).toEqual({
      artist: false,
      key: false,
      tempo: false,
      genre: false,
      youtubeId: false,
      keyboardPatch: false,
    });
  });
});
