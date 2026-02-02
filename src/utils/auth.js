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
  return user ? JSON.parse(user) : null;
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
