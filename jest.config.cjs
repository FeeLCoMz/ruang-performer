// Jest is used for the API / server tests only (api/__tests__/**/*.cjs).
// React component & unit tests under src/__tests__ run with Vitest
// (`npm run test:unit`), so they are intentionally not matched here.
//
// Run with: npm run test:api
//   -> node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit
// The --experimental-vm-modules flag is required because api/server.cjs loads
// the ESM app (api/index.js) through dynamic import().
module.exports = {
  // API tests run in the Node environment so global fetch, Request and
  // Response (undici) remain available to @libsql/client. Under jsdom those
  // globals were removed, which caused "fetch is not defined".
  displayName: 'api',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/api/__tests__/**/*.cjs'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  // api/index.js is ESM under "type": "module"; transformIgnorePatterns must
  // not skip the project's own api/ files so babel-jest can compile them.
  transformIgnorePatterns: ['/node_modules/'],
  setupFiles: ['./api/test-helpers/jest.setup.api.js'],
  setupFilesAfterEnv: ['./jest.setup.cjs'],
};
