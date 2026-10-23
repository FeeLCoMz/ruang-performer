import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SongTagScan from '../pages/admin/tag-detection/SongTagScan.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const groups = [
  { id: 'sections', label: 'Struktur Lagu (Section)' },
  { id: 'metadata', label: 'Metadata Informasi' },
  { id: 'instruments', label: 'Instrumen' },
];

/** Harness: meniru addKeyword hook (hanya menerima nama baru). */
function Harness({ findings, result }) {
  const [keywords, setKeywords] = useState([]);
  return (
    <>
      <SongTagScan
        groups={groups}
        findings={findings}
        result={result}
        onScan={() => {}}
        onAddKeyword={(groupId, keyword) => {
          if (keywords.includes(keyword)) {
            return { ok: false, reason: 'Kata kunci sudah ada di daftar' };
          }
          setKeywords([...keywords, keyword]);
          return { ok: true };
        }}
        onJumpToGroup={() => {}}
      />
      <output data-testid="keywords">{keywords.join(',')}</output>
    </>
  );
}

const click = async (node) => {
  await act(async () => {
    node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
};

describe('SongTagScan', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = async (props) => {
    await act(async () => {
      root.render(<Harness {...props} />);
    });
  };

  test('tidak menampilkan tabel sebelum hasil pindai ada', async () => {
    await render({ findings: [], result: null });

    expect(container.querySelector('.admin-tag-scan-table')).toBeNull();
    expect(container.textContent).toContain('Pindai Lagi di Database');
  });

  test('menampilkan temuan beserta jumlah lagu dan contohnya', async () => {
    await render({
      findings: [
        {
          name: 'jembatan',
          count: 3,
          samples: [
            { id: 's1', title: 'Lagu Satu' },
            { id: 's2', title: 'Lagu Dua' },
          ],
        },
      ],
      result: { scannedSongs: 12, skippedSongs: 2, findings: [], totalTags: 3, truncated: false },
    });

    expect(container.querySelector('.admin-tag-scan-table')).toBeTruthy();
    expect(container.textContent).toContain('[jembatan]');
    expect(container.textContent).toContain('3 lagu');
    expect(container.textContent).toContain('Lagu Satu');
    // Ringkasan pindai menyebut lagu yang dipindai & yang dilewati.
    expect(container.textContent).toContain('12 lagu dipindai');
    expect(container.textContent).toContain('2 tanpa lirik');
  });

  test('tombol tambah memasukkan keyword ke grup yang dipilih', async () => {
    await render({
      findings: [{ name: 'jembatan', count: 1, samples: [] }],
      result: { scannedSongs: 1, skippedSongs: 0, findings: [], totalTags: 1, truncated: false },
    });

    const button = [...container.querySelectorAll('button')].find((node) =>
      node.textContent.includes('Tambahkan'),
    );
    expect(button.textContent).toContain('Tambahkan');
    await click(button);

    // Keyword masuk ke draft grup default (sections).
    expect(container.querySelector('[data-testid="keywords"]').textContent).toBe('jembatan');
    // Tombol berubah menjadi penanda bahwa temuan sudah ditambahkan.
    const afterAdd = [...container.querySelectorAll('button')].find((node) =>
      node.textContent.includes('Ditambahkan'),
    );
    expect(afterAdd).toBeTruthy();
  });

  test('menampilkan pesan sukses bila tidak ada tag tak dikenal', async () => {
    await render({
      findings: [],
      result: { scannedSongs: 4, skippedSongs: 0, findings: [], totalTags: 0, truncated: false },
    });

    expect(container.textContent).toContain('Semua tag di lagu-lagu tersebut sudah dikenali');
  });
});
