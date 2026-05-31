function padNumber(value, length = 2) {
  return String(value).padStart(length, '0');
}

function formatIcsDateTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return (
    date.getUTCFullYear() +
    padNumber(date.getUTCMonth() + 1) +
    padNumber(date.getUTCDate()) +
    'T' +
    padNumber(date.getUTCHours()) +
    padNumber(date.getUTCMinutes()) +
    padNumber(date.getUTCSeconds()) +
    'Z'
  );
}

function formatGigTextEntry(gig) {
  const date = gig.date ? new Date(gig.date) : null;
  const dateLabel = date
    ? `📅 ${date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    : '📅 Tanggal tidak tersedia';
  const timeLabel = date
    ? `⏰ ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
    : '';
  const venueLabel = gig.venue ? `📍 ${gig.venue}${gig.city ? `, ${gig.city}` : ''}` : gig.city ? `📍 ${gig.city}` : '📍 Lokasi tidak tersedia';
  const feeLabel = gig.fee ? `💰 ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(gig.fee)}` : '';
  const setlistLabel = gig.setlistName ? `🎵 Setlist: ${gig.setlistName}` : '';
  const notesLabel = gig.notes ? `📝 ${gig.notes}` : '';

  return [
    `• ${gig.bandName || 'Band'} - ${dateLabel}${timeLabel ? ` ${timeLabel}` : ''}`,
    venueLabel,
    feeLabel,
    setlistLabel,
    notesLabel
  ]
    .filter(Boolean)
    .join('\n');
}

export function createGigScheduleText(title, gigs, shareUrl = '') {
  if (!Array.isArray(gigs) || gigs.length === 0) {
    return `${title}\n\nTidak ada jadwal konser saat ini.`;
  }

  const header = [`Jadwal Konser: ${title}`, `Jumlah pertunjukan: ${gigs.length}`];
  const entries = gigs.map(formatGigTextEntry);
  const footer = shareUrl ? [`\nLihat detail jadwal: ${shareUrl}`] : [];

  return [...header, '', ...entries, ...footer].join('\n\n');
}

export function createGigCalendar(title, gigs) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PerformerHub//Ruang Performer//EN',
    `X-WR-CALNAME:${title}`,
    `X-WR-TIMEZONE:UTC`
  ];

  const dtstamp = formatIcsDateTime(new Date().toISOString());

  gigs.forEach((gig) => {
    if (!gig.date) return;
    const start = formatIcsDateTime(gig.date);
    if (!start) return;

    const date = new Date(gig.date);
    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000);
    const end = formatIcsDateTime(endDate.toISOString());
    const titleLine = `SUMMARY:${gig.bandName || 'Gig'}${gig.venue ? ` @ ${gig.venue}` : ''}`;
    const descriptionParts = [];
    if (gig.setlistName) descriptionParts.push(`Setlist: ${gig.setlistName}`);
    if (gig.notes) descriptionParts.push(`Catatan: ${gig.notes}`);
    if (gig.city) descriptionParts.push(`Kota: ${gig.city}`);
    if (gig.fee) descriptionParts.push(`Fee: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(gig.fee)}`);
    const description = `DESCRIPTION:${descriptionParts.join(' | ')}`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${gig.id || `${Math.random().toString(36).slice(2)}@ruang-performer`}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(titleLine);
    if (gig.venue || gig.city) {
      const location = [gig.venue, gig.city].filter(Boolean).join(', ');
      lines.push(`LOCATION:${location}`);
    }
    if (descriptionParts.length > 0) {
      lines.push(description);
    }
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function downloadCalendarFile(filename, calendarContent) {
  const blob = new Blob([calendarContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
