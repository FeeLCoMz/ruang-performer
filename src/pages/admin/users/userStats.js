/**
 * userStats.js
 *
 * Perhitungan turunan untuk kartu statistik di tab Ringkasan Administrator.
 *
 * "Login terakhir" diturunkan dari audit log (action `USER_LOGIN`), bukan dari
 * tabel users — endpoint GET /api/users memang tidak menyimpan kolom itu.
 * Log audit diurutkan terbaru lebih dulu oleh server, tetapi fungsi di sini
 * tidak bergantung pada urutan tersebut: entri diambil dengan createdAt
 * terbesar per user.
 */

/** Ambil waktu login terbaru (ISO string) per userId dari daftar audit log. */
export function getLastLoginMap(logs) {
  const map = new Map();
  if (!Array.isArray(logs)) return map;

  for (const log of logs) {
    if (!log || log.action !== 'USER_LOGIN' || !log.userId) continue;
    const time = Date.parse(log.createdAt);
    if (Number.isNaN(time)) continue;

    const previous = map.get(log.userId);
    if (previous === undefined || time > previous.time) {
      map.set(log.userId, { time, iso: log.createdAt });
    }
  }

  return map;
}

/** Waktu login terakhir sebuah user sebagai ISO string, atau null. */
export function getLastLoginFor(userId, lastLoginMap) {
  const entry = lastLoginMap?.get?.(userId);
  return entry ? entry.iso : null;
}

/** Rentang waktu populer untuk perbandingan periode. */
export const STAT_PERIODS = [
  { id: 'all', label: 'Semua waktu', days: null },
  { id: '30d', label: '30 hari', days: 30 },
  { id: '7d', label: '7 hari', days: 7 },
];

/**
 * Hitung delta jumlah user baru pada periode yang dipilih dibanding periode
 * sebelumnya dengan panjang yang sama. Untuk `days: null` tidak ada pembanding.
 *
 * @returns {{ current: number, previous: number|null, delta: number|null }|null}
 */
export function getUserGrowth(users, days, now = Date.now()) {
  if (!days || !Array.isArray(users)) return null;

  const periodMs = days * 24 * 60 * 60 * 1000;
  const currentStart = now - periodMs;
  const previousStart = currentStart - periodMs;

  let current = 0;
  let previous = 0;

  for (const user of users) {
    if (!user?.createdAt) continue;
    const created = Date.parse(user.createdAt);
    if (Number.isNaN(created)) continue;
    if (created > currentStart) current += 1;
    else if (created > previousStart) previous += 1;
  }

  return { current, previous, delta: current - previous };
}

/** Konfigurasi kartu statistik; `tab` membuat kartu menavigasi ke tab terkait. */
export function buildUserStatCards(summary, { lastLoginMap, growth, days, now = Date.now() }) {
  const { total, active, inactive, byRole } = summary;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Berapa akun yang pernah login dalam 7 hari terakhir dan masih aktif.
  let recentlyActive = 0;
  if (lastLoginMap && lastLoginMap.size > 0) {
    for (const entry of lastLoginMap.values()) {
      if (entry.time > weekAgo) recentlyActive += 1;
    }
  }

  return [
    {
      id: 'total',
      label: 'Total user',
      value: total,
      icon: '👥',
      tab: 'users',
      hint: days ? `${growth?.current ?? 0} baru dalam ${days} hari` : null,
      delta: days && growth ? growth.delta : null,
    },
    {
      id: 'active',
      label: 'User aktif',
      value: active,
      icon: '✅',
      tab: 'users',
      hint: lastLoginMap ? `${recentlyActive} login 7 hari terakhir` : null,
      delta: null,
    },
    {
      id: 'inactive',
      label: 'User nonaktif',
      value: inactive,
      icon: '🚫',
      tab: 'users',
      hint: null,
      delta: null,
    },
    {
      id: 'admins',
      label: 'Admin & Owner',
      value: (byRole?.owner ?? 0) + (byRole?.admin ?? 0),
      icon: '🛡️',
      tab: null,
      hint: `${byRole?.owner ?? 0} owner · ${byRole?.admin ?? 0} admin`,
      delta: null,
    },
  ];
}
