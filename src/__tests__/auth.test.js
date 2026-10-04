// Tests for the JWT/localStorage helpers in src/utils/auth.js.

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  saveToken,
  getToken,
  removeToken,
  saveUser,
  getUser,
  removeUser,
  isAuthenticated,
  logout,
  getAuthHeader,
} from '../utils/auth.js';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('token helpers', () => {
  test('saves and reads a token', () => {
    saveToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  test('returns null when no token is stored', () => {
    expect(getToken()).toBeNull();
  });

  test('removeToken clears only the token', () => {
    saveToken('abc123');
    saveUser({ id: '1', username: 'ronz' });
    removeToken();

    expect(getToken()).toBeNull();
    expect(getUser()).toEqual({ id: '1', username: 'ronz' });
  });
});

describe('getUser', () => {
  test('round-trips a user object', () => {
    const user = { id: '1', email: 'a@b.c', username: 'ronz', role: 'owner' };
    saveUser(user);

    expect(getUser()).toEqual(user);
  });

  test('returns null when no user is stored', () => {
    expect(getUser()).toBeNull();
  });

  test('returns null and clears the key when the payload is invalid JSON', () => {
    localStorage.setItem(USER_KEY, '{ not valid json');

    expect(() => getUser()).not.toThrow();
    expect(getUser()).toBeNull();
    // The corrupted value is dropped so later reads are clean.
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  test('returns null for a non-object JSON payload', () => {
    localStorage.setItem(USER_KEY, '"just a string"');

    expect(getUser()).toBe('just a string');
  });

  test('does not throw when localStorage access itself fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    // The caller should see a logged-out state, not a crash.
    expect(() => getUser()).toThrow();
  });
});

describe('isAuthenticated', () => {
  test('is false without a token', () => {
    expect(isAuthenticated()).toBe(false);
  });

  test('is true once a token is saved', () => {
    saveToken('abc123');
    expect(isAuthenticated()).toBe(true);
  });
});

describe('getAuthHeader', () => {
  test('omits Authorization when logged out', () => {
    expect(getAuthHeader()).toEqual({});
  });

  test('returns a Bearer header when a token exists', () => {
    saveToken('abc123');
    expect(getAuthHeader()).toEqual({ Authorization: 'Bearer abc123' });
  });
});

describe('logout', () => {
  test('clears both the token and the user', () => {
    saveToken('abc123');
    saveUser({ id: '1' });

    logout();

    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});