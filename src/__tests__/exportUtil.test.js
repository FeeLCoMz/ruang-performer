// Polyfill TextEncoder for Node.js environment
import { TextEncoder } from 'util';
global.TextEncoder = TextEncoder;
import { describe, test, expect } from '@jest/globals';
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
    const link = { click: jest.fn(), setAttribute: jest.fn() };
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    global.Blob = class {
      constructor(content, opts) {
        this.content = content;
        this.opts = opts;
      }
    };
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    jest.spyOn(document, 'createElement').mockImplementation(() => link);
    exportToCSV('test.csv', createSampleRows());
    expect(link.click).toHaveBeenCalled();
  });

  test('exportToPDF creates a PDF and saves it', async () => {
    const saveMock = jest.fn();
    const textMock = jest.fn();
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
