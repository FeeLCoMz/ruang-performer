import './env.js';
import { parse } from 'url';
import passport from 'passport';
import { initializePassport } from './auth/passport-init.js';

initializePassport(passport);

export default async function handler(req, res) {
  const { pathname } = parse(req.url, true);

  // /api/auth/google
  if (pathname === '/api/auth/google') {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
    return;
  }

  // /api/auth/google/callback
  if (pathname === '/api/auth/google/callback') {
    passport.authenticate('google', {
      failureRedirect: '/?login=failed',
      session: true
    })(req, res, () => {
      res.redirect('/');
    });
    return;
  }

  // /api/auth/me
  if (pathname === '/api/auth/me') {
    if (req.isAuthenticated && req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ user: null });
    }
    return;
  }

  // /api/auth/logout
  if (pathname === '/api/auth/logout') {
    if (req.logout) {
      req.logout(() => {
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
    return;
  }

  // Not found
  res.statusCode = 404;
  res.end('Not found');
}
