import { describe, test, expect } from 'vitest';
import {
  buildUserStatCards,
  formatLastLogin,
  getLastLoginFor,
  getLastLoginMap,
  getUserGrowth,
} from '../pages/admin/users/userStats.js';
import { summarizeUsers } from '../utils/adminAccess.js';

const NOW = Date.parse('2026-10-21T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const isoDaysAgo = (days) => new Date(NOW - days * DAY).toISOString();

/**
 * Statistik ringkasan admin: login terakhir diturunkan dari audit log
 * (USER_LOGIN), dan pertumbuhan user dihitung dari createdAt.
 */
describe('admin user stats', () => {
  test('getLastLoginMap memilih waktu login terbaru per user', () => {
    const map = getLastLoginMap([
      { action: 'USER_LOGIN', userId: 'u1', createdAt: isoDaysAgo(10) },
      { action: 'USER_LOGIN', userId: 'u1', createdAt: isoDaysAgo(2) },
      { action: 'USER_LOGIN', userId: 'u2', createdAt: isoDaysAgo(5) },
      // Bukan login — harus diabaikan.
      { action: 'USER_UPDATED', userId: 'u2', createdAt: isoDaysAgo(1) },
    ]);

    expect(getLastLoginFor('u1', map)).toBe(isoDaysAgo(2));
    expect(getLastLoginFor('u2', map)).toBe(isoDaysAgo(5));
    expect(getLastLoginFor('u3', map)).toBeNull();
  });

  test('getLastLoginMap aman untuk input kosong atau createdAt tidak valid', () => {
    expect(getLastLoginMap(null).size).toBe(0);
    const map = getLastLoginMap([
      { action: 'USER_LOGIN', userId: 'u1', createdAt: 'bukan-tanggal' },
      { action: 'USER_LOGIN', createdAt: isoDaysAgo(1) },
    ]);
    expect(map.size).toBe(0);
  });

  test('formatLastLogin menampilkan label ringkas yang bisa dibaca', () => {
    const minutesAgo = (m) => new Date(NOW - m * 60000).toISOString();

    expect(formatLastLogin(null, NOW)).toBe('Belum pernah');
    expect(formatLastLogin('bukan-tanggal', NOW)).toBe('Belum pernah');
    expect(formatLastLogin(minutesAgo(0.5), NOW)).toBe('Baru saja');
    expect(formatLastLogin(minutesAgo(5), NOW)).toBe('5 menit lalu');
    expect(formatLastLogin(minutesAgo(180), NOW)).toBe('3 jam lalu');
    expect(formatLastLogin(minutesAgo(24 * 60), NOW)).toBe('Kemarin');
    expect(formatLastLogin(isoDaysAgo(5), NOW)).toBe('5 hari lalu');
    // Lebih dari 30 hari memakai tanggal lengkap, bukan hitungan hari.
    expect(formatLastLogin(isoDaysAgo(90), NOW)).not.toContain('hari lalu');
  });

  test('getUserGrowth membandingkan periode berjalan dengan periode sebelumnya', () => {
    const users = [
      { id: 'a', createdAt: isoDaysAgo(5) },   // periode sekarang
      { id: 'b', createdAt: isoDaysAgo(20) },  // periode sekarang (30 hari)
      { id: 'c', createdAt: isoDaysAgo(40) },  // periode sebelumnya
      { id: 'd', createdAt: isoDaysAgo(200) }, // di luar keduanya
      { id: 'e' },                             // tanpa createdAt
    ];

    expect(getUserGrowth(users, 30, NOW)).toEqual({ current: 2, previous: 1, delta: 1 });
    expect(getUserGrowth(users, 7, NOW)).toEqual({ current: 1, previous: 0, delta: 1 });
    // Tanpa periode tidak ada pembanding.
    expect(getUserGrowth(users, null, NOW)).toBeNull();
  });

  test('buildUserStatCards menyusun nilai, hint, dan target tab', () => {
    // Tanggal relatif terhadap NOW, jadi hitungan juga memakai referensi NOW.
    const users = [
      { id: 'u1', role: 'owner', isActive: 1, createdAt: isoDaysAgo(3) },
      { id: 'u2', role: 'admin', isActive: 1, createdAt: isoDaysAgo(40) },
      { id: 'u3', role: 'member', isActive: 0, createdAt: isoDaysAgo(100) },
    ];
    const summary = summarizeUsers(users);
    const lastLoginMap = getLastLoginMap([
      { action: 'USER_LOGIN', userId: 'u1', createdAt: isoDaysAgo(1) },
      { action: 'USER_LOGIN', userId: 'u2', createdAt: isoDaysAgo(30) },
    ]);
    // Sama dengan pemakaian nyata: jam "sekarang" diberikan ke fungsi.
    const growth = getUserGrowth(users, 30, NOW);

    const cards = buildUserStatCards(summary, { lastLoginMap, growth, days: 30, now: NOW });
    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

    expect(byId.total.value).toBe(3);
    // 3 hari lalu = periode ini, 40 hari lalu = periode sebelumnya → delta 0.
    expect(byId.total.hint).toBe('1 baru dalam 30 hari');
    expect(byId.total.delta).toBe(0);
    expect(byId.total.tab).toBe('users');

    expect(byId.active.value).toBe(2);
    expect(byId.active.hint).toBe('1 login 7 hari terakhir');

    expect(byId.inactive.value).toBe(1);
    expect(byId.admins.value).toBe(2);
    expect(byId.admins.hint).toBe('1 owner · 1 admin');
    // Kartu admin tidak bernavigasi karena ringkasannya sudah terlihat.
    expect(byId.admins.tab).toBeNull();
  });
});
