// Library berat (html-to-image, html2canvas, jspdf) di-load secara dinamis
// hanya saat fitur ekspor dipakai, agar bundle awal tetap ringan di mobile.

export async function downloadCalendarAsJPG(elementRef, filename = 'jadwal-gigs.jpg') {
  if (!elementRef) return;
  try {
    const { toJpeg } = await import('html-to-image');
    const dataUrl = await toJpeg(elementRef, {
      cacheBust: true,
      pixelRatio: 2,
      quality: 0.95,
      backgroundColor: '#0f172a'
    });
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Gagal membuat JPG kalender:', err);
    throw new Error('Gagal membuat JPG kalender');
  }
}

export async function downloadCalendarAsPDF(elementRef, title = 'Jadwal Gigs') {
  if (!elementRef) return;
  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    const canvas = await html2canvas(elementRef, {
      scale: 2,
      backgroundColor: '#0f172a',
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let heightLeft = imgHeight;
    let position = 0;

    // Add title
    pdf.setFontSize(16);
    pdf.text(title, pageWidth / 2, 15, { align: 'center' });
    position = 25;
    heightLeft -= 10;

    // Add image
    while (heightLeft >= 0) {
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      position += pageHeight;
      if (heightLeft > 0) {
        pdf.addPage();
      }
    }

    pdf.save(`${title}.pdf`);
  } catch (err) {
    console.error('Gagal membuat PDF kalender:', err);
    throw new Error('Gagal membuat PDF kalender');
  }
}

export async function downloadScheduleAsPDF(scheduleText, title = 'Jadwal Gigs') {
  try {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    pdf.setFontSize(16);
    pdf.text(title, 105, 15, { align: 'center' });

    // Add content
    pdf.setFontSize(11);
    const splitText = pdf.splitTextToSize(scheduleText, 190);
    pdf.text(splitText, 10, 30);

    pdf.save(`${title}.pdf`);
  } catch (err) {
    console.error('Gagal membuat PDF jadwal:', err);
    throw new Error('Gagal membuat PDF jadwal');
  }
}
