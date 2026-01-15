import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export function initializePassport(passport) {
  if (passport._strategy('google')) return; // Prevent double init
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, {
      id: profile.id,
      displayName: profile.displayName,
      email: profile.emails?.[0]?.value,
      photo: profile.photos?.[0]?.value
    });
  }));
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}
