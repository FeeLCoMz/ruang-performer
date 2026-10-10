import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
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
