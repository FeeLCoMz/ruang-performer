// JWT token management utilities

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    // Corrupted or non-JSON payload (e.g. written by an older version):
    // drop it so callers get a clean null instead of a thrown SyntaxError.
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function removeUser() {
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  removeToken();
  removeUser();
}

export function getAuthHeader() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
