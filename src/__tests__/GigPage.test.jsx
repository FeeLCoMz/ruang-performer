import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import GigPage, {
  toLocalIsoDateTime,
  splitIsoDateTime,
  buildYearOptions,
  resolveGigStatus,
} from '../pages/GigPage.jsx';
import { flushPromises } from './helpers/domTestUtils.js';

const apiMocks = vi.hoisted(() => ({
  fetchBands: vi.fn(),
  fetchGigs: vi.fn(),
  fetchSetLists: vi.fn(),
  createGig: vi.fn(),
  updateGig: vi.fn(),
  deleteGig: vi.fn(),
}));

vi.mock('../apiClient.js', () => apiMocks);

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'user-1', userId: 'user-1', username: 'Tester' } }),
}));

vi.mock('../styles/setlist-poster.css', () => ({}));

vi.mock('../components/LoadingSkeleton.jsx', () => ({
  ListSkeleton: () => null,
}));

vi.mock('../components/CalendarView.jsx', () => ({
  default: () => null,
}));

vi.mock('../modules/export-share/useExportShareEnabled.js', () => ({
  useExportShareEnabled: () => [true, vi.fn()],
}));

vi.mock('../modules/export-share/calendarDownloadUtil.js', () => ({
  downloadCalendarAsJPG: vi.fn(),
  downloadCalendarAsPDF: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../modules/stage-mode/useStageModeEnabled.js', () => ({
  useStageModeEnabled: () => [true, vi.fn()],
}));

const ISO = (year, month, day, hour = 20, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).toISOString();

const BANDS = [{ id: 'band-1', name: 'Aurora' }];
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const GIG_WITH_SETLIST = {
  id: 'gig-open',
  userId: 'user-1',
  bandId: 'band-1',
  bandName: 'Aurora',
  date: ISO(2024, 1, 10),
  venue: 'Venue Lama',
  city: 'Bandung',
  setlistId: 'setlist-9',
  setlistName: 'Set Malam',
};

function currentMonthGig() {
  const now = new Date();
  return {
    id: 'gig-now',
    userId: 'user-1',
    bandId: 'band-1',
    bandName: 'Aurora',
    date: ISO(now.getFullYear(), now.getMonth() + 1, 20, 21, 30),
    venue: 'Venue Bulan Ini',
    city: 'Jakarta',
  };
}

function fixtureGigs() {
  return [
    { ...GIG_WITH_SETLIST },
    {
      id: 'gig-feb',
      userId: 'user-1',
      bandId: 'band-1',
      bandName: 'Aurora',
      date: ISO(2024, 2, 14),
      venue: 'Venue Feb',
      city: 'Jakarta',
    },
    {
      id: 'gig-mar',
      userId: 'user-1',
      bandId: 'band-1',
      bandName: 'Aurora',
      date: ISO(2024, 3, 3),
      venue: 'Venue Mar',
      city: 'Surabaya',
      fee: 1500000,
    },
  ];
}

async function renderPage(container) {
  const root = createRoot(container);
  await act(async () => {
    root.render(<GigPage />);
    // Beberapa siklus: data gigs dipakai untuk turunan (filter, teks share, poster).
    for (let i = 0; i < 4; i += 1) await flushPromises();
  });
  return root;
}

async function click(element) {
  await act(async () => {
    element.click();
    await flushPromises();
  });
}

async function changeValue(element, value) {
  const proto =
    element.tagName === 'SELECT'
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const eventType = element.tagName === 'SELECT' ? 'change' : 'input';
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event(eventType, { bubbles: true }));
    await flushPromises();
  });
}

const byText = (node, selector, text) =>
  Array.from(node.querySelectorAll(selector)).find((el) => el.textContent.includes(text));

const labelledInput = (root, labelText) => {
  const label = Array.from(root.querySelectorAll('label')).find((el) =>
    el.textContent.includes(labelText),
  );
  if (!label) return null;
  return label.parentElement.querySelector('input, select, textarea');
};

const backdropOf = (element) => element.closest('.modal-overlay');

// Selector diambil dari document karena modal share dirender di dalam overlay.
const getRangeSelects = () =>
  Array.from(document.querySelectorAll('.gig-share-range-group select')).filter(
    (el) => el.isConnected && el.closest('.modal-overlay'),
  );

async function showShareDialog(container) {
  await click(byText(container, 'button', 'Bagikan Jadwal'));
}

function setupDom({ gigs = fixtureGigs(), setlists = [], bands = BANDS } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  apiMocks.fetchBands.mockResolvedValue(bands);
  apiMocks.fetchSetLists.mockResolvedValue(setlists);
  // Server memfilter per tahun, jadi mock meniru perilaku itu.
  apiMocks.fetchGigs.mockImplementation(async (_bandId, options = {}) => {
    const year = options?.year;
    if (!Number.isInteger(year)) return gigs;
    return gigs.filter((gig) => String(gig.date || '').slice(0, 4) === String(year));
  });
  return container;
}

describe('GigPage date helpers', () => {
  test('toLocalIsoDateTime keeps the picked wall-clock time without UTC shift', () => {
    expect(toLocalIsoDateTime('2024-03-03', '20:30')).toBe('2024-03-03T20:30:00');
    expect(toLocalIsoDateTime('2024-03-03', '')).toBe('2024-03-03T00:00:00');
  });

  test('toLocalIsoDateTime rejects invalid input instead of throwing', () => {
    expect(toLocalIsoDateTime('', '20:30')).toBeNull();
    expect(toLocalIsoDateTime('bukan-tanggal', '20:30')).toBeNull();
    expect(toLocalIsoDateTime(undefined, undefined)).toBeNull();
  });

  test('splitIsoDateTime round-trips through toLocalIsoDateTime', () => {
    const iso = '2024-03-03T20:30:00';
    const { date, time } = splitIsoDateTime(iso);
    expect(date).toBe('2024-03-03');
    expect(time).toBe('20:30');
    expect(toLocalIsoDateTime(date, time)).toBe(iso);
  });

  test('splitIsoDateTime handles empty and invalid values', () => {
    expect(splitIsoDateTime('')).toEqual({ date: '', time: '' });
    expect(splitIsoDateTime('rusak')).toEqual({ date: '', time: '' });
  });

  test('buildYearOptions keeps the selected year even outside the default window', () => {
    const options = buildYearOptions(2019, 2026);
    expect(options).toContain(2019);
    expect(options).toEqual([...options].sort((a, b) => a - b));
    expect(buildYearOptions(Number.NaN, 2026)).toEqual([2024, 2025, 2026, 2027, 2028]);
  });

  test('resolveGigStatus respects an explicit cancelled/done status over the date', () => {
    const NOW = new Date(2026, 9, 24, 12, 0).getTime();
    const past = '2026-10-20T20:00:00';
    const future = '2026-11-20T20:00:00';

    // Gig batal tetap batal walau tanggalnya sudah lewat.
    expect(resolveGigStatus({ date: past, status: 'cancelled' }, NOW)).toBe('cancelled');
    // Gig yang ditandai selesai lebih awal tidak berubah jadi 'upcoming'.
    expect(resolveGigStatus({ date: future, status: 'done' }, NOW)).toBe('done');
    expect(resolveGigStatus({ date: past, status: 'confirmed' }, NOW)).toBe('done');
    expect(resolveGigStatus({ date: future, status: 'confirmed' }, NOW)).toBe('confirmed');
    expect(resolveGigStatus({ date: future, status: 'planned' }, NOW)).toBe('upcoming');
    expect(resolveGigStatus({ date: future }, NOW)).toBe('upcoming');
    // Tanggal tidak valid tidak boleh menghasilkan badge palsu.
    expect(resolveGigStatus({ date: '', status: 'planned' }, NOW)).toBe('planned');
  });
});

describe('GigPage sharing scope', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = setupDom();
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  test('hiding a month in the list does not leak into the share dialog', async () => {
    root = await renderPage(container);

    // Filter daftar ke Januari 2024 lewat toolbar (bukan modal share).
    const toolbarYear = container.querySelector('.gig-toolbar .gig-year-filter');
    const monthSelect = container.querySelector('.gig-toolbar .gig-month-filter');
    await changeValue(toolbarYear, '2024');
    await changeValue(monthSelect, '0');
    expect(container.querySelectorAll('.song-item')).toHaveLength(1);
    expect(container.querySelector('.song-item').textContent).toContain('Venue Lama');

    await showShareDialog(container);

    // Share default = semua jadwal, jadi ketiga gig muncul di poster.
    expect(document.querySelectorAll('.schedule-poster-item')).toHaveLength(3);
    expect(document.querySelector('.gig-share-month-summary').textContent).toContain('3 gigs');
  });

  test('Gigs from an old year are still visible once that year is picked', async () => {
    root = await renderPage(container);

    const toolbarYear = container.querySelector('.gig-toolbar .gig-year-filter');
    const monthSelect = container.querySelector('.gig-toolbar .gig-month-filter');
    await changeValue(monthSelect, '');
    await changeValue(toolbarYear, '2024');

    expect(container.querySelectorAll('.song-item')).toHaveLength(3);
  });

  test('changing the year asks the server for that year, not a fixed page of gigs', async () => {
    root = await renderPage(container);

    const toolbarYear = container.querySelector('.gig-toolbar .gig-year-filter');
    await changeValue(toolbarYear, '2024');

    const calledYears = apiMocks.fetchGigs.mock.calls.map(([, options]) => options?.year);
    expect(calledYears).toContain(2024);
  });

  test('share dialog can still be scoped to a month explicitly', async () => {
    root = await renderPage(container);

    const toolbarYear = container.querySelector('.gig-toolbar .gig-year-filter');
    await changeValue(toolbarYear, '2024');
    await showShareDialog(container);

    await changeValue(getRangeSelects()[0], 'month');
    expect(getRangeSelects()).toHaveLength(3);

    // Bulan dulu, baru tahun: urutan ini tidak memicu NaN pada select tahun.
    await changeValue(getRangeSelects()[1], '1');
    await changeValue(getRangeSelects()[2], '2024');

    expect(document.querySelectorAll('.schedule-poster-item')).toHaveLength(1);
    expect(document.querySelector('.schedule-poster-item').textContent).toContain('Venue Feb');
  });

  test('toggling back to "all" restores every gig loaded for the year', async () => {
    root = await renderPage(container);

    const toolbarYear = container.querySelector('.gig-toolbar .gig-year-filter');
    await changeValue(toolbarYear, '2024');
    await showShareDialog(container);

    await changeValue(getRangeSelects()[0], 'month');
    await changeValue(getRangeSelects()[2], '2024');
    await changeValue(getRangeSelects()[1], '2');
    expect(document.querySelectorAll('.schedule-poster-item')).toHaveLength(1);
    expect(document.querySelector('.schedule-poster-item').textContent).toContain('Venue Mar');

    await changeValue(getRangeSelects()[0], 'all');
    expect(getRangeSelects()).toHaveLength(1);
    expect(document.querySelectorAll('.schedule-poster-item')).toHaveLength(3);
    expect(document.querySelector('.gig-share-month-summary').textContent).toContain('3 gigs');
  });
});

describe('GigPage create form', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    apiMocks.createGig.mockResolvedValue({ id: 'gig-new' });
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  test('a band member without write permission sees a locked edit button and no form opens', async () => {
    // Datang dengan "Semua Band" (tidak memilih band di toolbar) sebagai member.
    const gig = { ...currentMonthGig(), id: 'gig-teammate', userId: 'user-2' };
    container = setupDom({ gigs: [gig], bands: [{ id: 'band-1', name: 'Aurora', role: 'member' }] });
    root = await renderPage(container);

    const lockButton = Array.from(container.querySelectorAll('.song-actions button')).find(
      (button) => button.textContent.includes('🔒'),
    );
    expect(lockButton).toBeTruthy();

    await click(lockButton);
    expect(container.querySelector('.gig-submit-btn')).toBeFalsy();
  });

  test('an owner can edit a band gig even while viewing every band', async () => {
    const gig = { ...currentMonthGig(), id: 'gig-band', userId: 'user-2' };
    container = setupDom({ gigs: [gig], bands: [{ id: 'band-1', name: 'Aurora', role: 'owner' }] });
    root = await renderPage(container);

    const editButton = Array.from(container.querySelectorAll('.song-actions button')).find(
      (button) => button.textContent.includes('✎'),
    );
    expect(editButton).toBeTruthy();

    await click(editButton);
    expect(container.querySelector('.gig-submit-btn')).toBeTruthy();
  });

  test('the create form pre-fills date and time, and empty optional fields become null', async () => {
    container = setupDom({ gigs: [] });
    root = await renderPage(container);

    await click(byText(container, 'button', 'Buat Gigs'));
    const modal = backdropOf(container.querySelector('.gig-submit-btn'));

    const dateInput = labelledInput(modal, 'Tanggal');
    const timeInput = labelledInput(modal, 'Waktu');
    const venueInput = labelledInput(modal, 'Lokasi/Venue');

    // Jam tidak boleh kosong setelah form dibuka lewat tombol "Buat Gigs".
    expect(dateInput.value).not.toBe('');
    expect(timeInput.value).not.toBe('');

    await changeValue(dateInput, '2025-05-17');
    await changeValue(timeInput, '21:00');
    await changeValue(venueInput, 'Kafe Malam');

    await click(container.querySelector('.gig-submit-btn'));

    expect(apiMocks.createGig).toHaveBeenCalledTimes(1);
    const payload = apiMocks.createGig.mock.calls[0][0];
    expect(payload.date).toBe('2025-05-17T21:00:00');
    expect(payload.venue).toBe('Kafe Malam');
    expect(payload.bandId).toBeNull();
    expect(payload.setlistId).toBeNull();
    expect(payload.fee).toBeNull();
  });

  test('saving a gig in another year switches the loaded year', async () => {
    container = setupDom({ gigs: [] });
    root = await renderPage(container);

    await click(byText(container, 'button', 'Buat Gigs'));
    const modal = backdropOf(container.querySelector('.gig-submit-btn'));
    await changeValue(labelledInput(modal, 'Tanggal'), '2024-07-01');
    await changeValue(labelledInput(modal, 'Waktu'), '20:00');
    await click(container.querySelector('.gig-submit-btn'));

    const toolbarYear = container.querySelector('.gig-toolbar .gig-year-filter');
    expect(toolbarYear.value).toBe('2024');
  });

  test('editing an existing gig pre-fills the stored date and time', async () => {
    // Gig bulan berjalan tetap tampil dengan filter default, jadi tidak bergantung dropdown tahun.
    const gig = currentMonthGig();
    container = setupDom({ gigs: [gig] });
    root = await renderPage(container);

    const editButton = Array.from(container.querySelectorAll('.song-actions button')).find(
      (button) => button.textContent.includes('✎'),
    );
    expect(editButton).toBeTruthy();

    await click(editButton);
    const modal = backdropOf(container.querySelector('.gig-submit-btn'));

    const expected = splitIsoDateTime(gig.date);
    expect(expected.date).not.toBe('');
    expect(labelledInput(modal, 'Tanggal').value).toBe(expected.date);
    expect(labelledInput(modal, 'Waktu').value).toBe(expected.time);
  });

  test('editing can clear the setlist and fee instead of silently keeping them', async () => {
    const now = new Date();
    const gig = {
      ...currentMonthGig(),
      id: 'gig-owned',
      date: ISO(now.getFullYear(), now.getMonth() + 1, 21, 19, 0),
      setlistId: 'setlist-1',
      setlistName: 'Set A',
      fee: 2000000,
    };
    container = setupDom({
      gigs: [gig],
      setlists: [{ id: 'setlist-1', name: 'Set A', songs: [] }],
    });
    apiMocks.updateGig.mockResolvedValue({ id: gig.id });
    root = await renderPage(container);

    const editButton = Array.from(container.querySelectorAll('.song-actions button')).find(
      (button) => button.textContent.includes('✎'),
    );
    await click(editButton);

    const modal = backdropOf(container.querySelector('.gig-submit-btn'));
    await changeValue(labelledInput(modal, 'Setlist'), '');
    await changeValue(labelledInput(modal, 'Fee/Bayaran'), '');

    await click(container.querySelector('.gig-submit-btn'));

    expect(apiMocks.updateGig).toHaveBeenCalledTimes(1);
    const [id, payload] = apiMocks.updateGig.mock.calls[0];
    expect(id).toBe('gig-owned');
    expect(payload.setlistId).toBeNull();
    expect(payload.fee).toBeNull();
  });

  test('the form sends the selected status when creating a gig', async () => {
    container = setupDom({ gigs: [] });
    root = await renderPage(container);

    await click(byText(container, 'button', 'Buat Gigs'));
    const modal = backdropOf(container.querySelector('.gig-submit-btn'));
    await changeValue(labelledInput(modal, 'Tanggal'), '2025-05-17');
    await changeValue(labelledInput(modal, 'Status'), 'confirmed');
    await click(container.querySelector('.gig-submit-btn'));

    expect(apiMocks.createGig.mock.calls[0][0].status).toBe('confirmed');
  });

  test('editing pre-selects the stored status', async () => {
    const gig = { ...currentMonthGig(), status: 'confirmed' };
    container = setupDom({ gigs: [gig] });
    root = await renderPage(container);

    const editButton = Array.from(container.querySelectorAll('.song-actions button')).find(
      (button) => button.textContent.includes('✎'),
    );
    await click(editButton);

    const modal = backdropOf(container.querySelector('.gig-submit-btn'));
    expect(labelledInput(modal, 'Status').value).toBe('confirmed');
  });

  test('the empty state names the month currently being viewed and offers a create action', async () => {
    // Tahun berjalan tapi bulan ini kosong: data lain ada di tahun yang sama.
    const now = new Date();
    const otherMonth = now.getMonth() === 0 ? 2 : 1;
    const otherGig = {
      ...currentMonthGig(),
      id: 'gig-other-month',
      date: ISO(now.getFullYear(), otherMonth, 5, 20, 0),
    };
    container = setupDom({ gigs: [otherGig] });
    root = await renderPage(container);

    const emptyState = container.querySelector('.gig-empty-state');
    expect(emptyState.textContent).toContain(MONTH_NAMES[now.getMonth()]);
    expect(byText(emptyState, 'button', 'Buat Gigs')).toBeTruthy();
  });

  test('when the whole year is empty the empty state short-circuits to the year', async () => {
    container = setupDom({ gigs: [] });
    root = await renderPage(container);

    const emptyState = container.querySelector('.gig-empty-state');
    expect(emptyState.textContent).toContain(String(new Date().getFullYear()));
  });
});

describe('GigPage row actions', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = setupDom();
    mockNavigate.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  test('clicking a row does not open the edit form', async () => {
    root = await renderPage(container);
    const yearSelect = container.querySelector('.gig-toolbar .gig-year-filter');
    const monthSelect = container.querySelector('.gig-toolbar .gig-month-filter');
    await changeValue(yearSelect, '2024');
    await changeValue(monthSelect, '');

    await click(container.querySelector('.song-item'));

    expect(container.querySelector('.gig-submit-btn')).toBeFalsy();
  });

  test('a gig with a setlist exposes "Setlist" and "Stage" shortcuts', async () => {
    root = await renderPage(container);
    const yearSelect = container.querySelector('.gig-toolbar .gig-year-filter');
    const monthSelect = container.querySelector('.gig-toolbar .gig-month-filter');
    await changeValue(yearSelect, '2024');
    await changeValue(monthSelect, '');

    const setlistButton = byText(container, 'button', 'Setlist');
    const stageButton = byText(container, 'button', 'Stage');
    expect(setlistButton).toBeTruthy();
    expect(stageButton).toBeTruthy();

    await click(setlistButton);
    expect(mockNavigate).toHaveBeenCalledWith('/setlists/setlist-9');

    // Stage Mode adalah overlay global, bukan route /stage.
    mockNavigate.mockClear();
    await click(stageButton);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('the Stage button dispatches the global open-stage event with the setlist id', async () => {
    root = await renderPage(container);
    await changeValue(container.querySelector('.gig-toolbar .gig-year-filter'), '2024');
    await changeValue(container.querySelector('.gig-toolbar .gig-month-filter'), '');

    const events = [];
    const listener = (event) => events.push(event.detail);
    window.addEventListener('ruang-performer:open-stage', listener);
    try {
      await click(byText(container, 'button', 'Stage'));
    } finally {
      window.removeEventListener('ruang-performer:open-stage', listener);
    }

    expect(events).toEqual([{ setlistId: 'setlist-9' }]);
  });

  test('gigs without a setlist do not show the shortcuts', async () => {
    const now = new Date();
    const gig = { ...currentMonthGig(), id: 'gig-no-setlist', setlistId: null, setlistName: null, date: ISO(now.getFullYear(), now.getMonth() + 1, 12, 20, 0) };
    container = setupDom({ gigs: [gig] });
    root = await renderPage(container);

    expect(byText(container.querySelector('.song-actions'), 'button', 'Setlist')).toBeFalsy();
    expect(byText(container.querySelector('.song-actions'), 'button', 'Stage')).toBeFalsy();
  });

  test('a cancelled gig is badged as cancelled even when the date has passed', async () => {
    const gig = { ...currentMonthGig(), id: 'gig-cancelled', status: 'cancelled', date: ISO(2024, 2, 1, 20, 0) };
    container = setupDom({ gigs: [gig] });
    root = await renderPage(container);
    const yearSelect = container.querySelector('.gig-toolbar .gig-year-filter');
    const monthSelect = container.querySelector('.gig-toolbar .gig-month-filter');
    await changeValue(yearSelect, '2024');
    await changeValue(monthSelect, '');

    const item = container.querySelector('.song-item');
    expect(item.className).toContain('gig-item-cancelled');
    expect(item.textContent).toContain('Dibatalkan');
    expect(item.textContent).not.toContain('Selesai');
  });

  test('the form sends the chosen status', async () => {
    const gig = { ...currentMonthGig(), id: 'gig-owned', status: 'confirmed' };
    container = setupDom({ gigs: [gig] });
    root = await renderPage(container);

    const editButton = Array.from(container.querySelectorAll('.song-actions button')).find(
      (button) => button.textContent.includes('✎'),
    );
    await click(editButton);

    const modal = backdropOf(container.querySelector('.gig-submit-btn'));
    const statusSelect = labelledInput(modal, 'Status');
    expect(statusSelect.value).toBe('confirmed');

    await changeValue(statusSelect, 'cancelled');
    await click(container.querySelector('.gig-submit-btn'));

    expect(apiMocks.updateGig).toHaveBeenCalledTimes(1);
    expect(apiMocks.updateGig.mock.calls[0][1].status).toBe('cancelled');
  });
});
