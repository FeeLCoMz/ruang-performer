module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: [
    './api/__tests__/jest.setup.api.js'
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
};
