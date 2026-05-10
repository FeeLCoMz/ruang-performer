module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/?(*.)+(test|spec).[jt]s?(x)',
    '<rootDir>/api/__tests__/**/*.cjs'
  ],
  setupFiles: [
    './api/test-helpers/jest.setup.api.js'
  ],
  setupFilesAfterEnv: ['./jest.setup.cjs'],
};
