import '../../env.js';
import passport from 'passport';
import { initializePassport } from './passport-init.js';

initializePassport(passport);

export default function handler(req, res) {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
}
