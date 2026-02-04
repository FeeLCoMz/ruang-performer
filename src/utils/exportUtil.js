// utils/exportUtil.js
// Utility for exporting data to PDF and CSV
import jsPDF from 'jspdf';

export function exportToCSV(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const header = Object.keys(rows[0]);
  const csv = [header.join(',')].concat(
    rows.map(row => header.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))
  ).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(filename, rows, title = '', jsPDFClass) {
  const PDFClass = jsPDFClass || jsPDF;
  const doc = new PDFClass();
  if (title) doc.text(title, 10, 10);
  if (!Array.isArray(rows) || rows.length === 0) {
    doc.text('No data available.', 10, 20);
  } else {
    const header = Object.keys(rows[0]);
    let y = title ? 20 : 10;
    doc.text(header.join(' | '), 10, y);
    y += 10;
    rows.forEach(row => {
      doc.text(header.map(h => String(row[h])).join(' | '), 10, y);
      y += 10;
    });
  }
  doc.save(filename);
}
