import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // The API tests under api/__tests__ belong to Jest, not Vitest: they
    // require('../server'), the CommonJS shim that loads the ESM app through
    // dynamic import(), which needs --experimental-vm-modules (see
    // jest.config.cjs and `npm run test:api`). Without this exclusion Vitest
    // still collected those .cjs files, failed to resolve the shim, and reported
    // them as four broken test files with "0 test" - noise that looked like
    // real breakage in every run of `npm run test:unit`.
    exclude: ['**/node_modules/**', '**/dist/**', 'api/__tests__/**'],
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
      },
    },
    setupFiles: ['./src/__tests__/setup/codemirrorEnv.js'],
    // Each jsdom environment is heavy to build (CodeMirror + fabric + jsPDF are
    // all in the graph), and the whole suite needs 70-85s of environment setup
    // on this machine. The default 10s teardown timeout expires mid-run and
    // vitest reports "Timeout terminating forks worker" for random files, which
    // looks like 3 broken test files but is purely teardown contention.
    teardownTimeout: 120000,
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
