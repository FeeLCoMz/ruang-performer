import { describe, test, expect, vi } from 'vitest';
import { exportToCSV, exportToPDF } from '../utils/exportUtil';

function createSampleRows() {
  return [
    { id: '1', name: 'Setlist A', songCount: 5, createdAt: '2024-01-01' },
    { id: '2', name: 'Setlist B', songCount: 3, createdAt: '2024-01-02' }
  ];
}

describe('exportUtil', () => {
  test('exportToCSV creates a CSV blob and triggers download', () => {
    // Mock document.createElement and click
    const link = { click: vi.fn(), setAttribute: vi.fn() };
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    global.Blob = class {
      constructor(content, opts) {
        this.content = content;
        this.opts = opts;
      }
    };
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    vi.spyOn(document, 'createElement').mockImplementation(() => link);
    exportToCSV('test.csv', createSampleRows());
    expect(link.click).toHaveBeenCalled();
  });

  test('exportToPDF creates a PDF and saves it', async () => {
    const saveMock = vi.fn();
    const textMock = vi.fn();
    class MockPDF {
      text = textMock;
      save = saveMock;
    }
    await import('../utils/exportUtil').then(({ exportToPDF }) => {
      exportToPDF('test.pdf', createSampleRows(), 'Title', MockPDF);
    });
    expect(saveMock).toHaveBeenCalledWith('test.pdf');
  });
});
