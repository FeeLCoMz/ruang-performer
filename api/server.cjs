// server.cjs - CommonJS loader for the ES module app (api/index.js).
//
// The project uses "type": "module", so api/index.js is an ES module that
// cannot be require()d from CommonJS. Jest also blocks require(esm), so the
// CommonJS tests load the app through dynamic import() instead.
//
// Usage in tests:
//   const loadApp = require('../server');
//   let app;
//   beforeAll(async () => { app = await loadApp(); });
function loadApp() {
  return import('./index.js').then((mod) => mod.default || mod);
}

module.exports = loadApp;
module.exports.loadApp = loadApp;
