// Polyfill global Request for Jest API tests
if (typeof global.Request === 'undefined') {
  try {
    // node-fetch v3+ is ESM, so require may fail; fallback to whatwg-fetch if needed
    const { Request } = require('node-fetch');
    global.Request = Request;
  } catch (e) {
    try {
      require('whatwg-fetch'); // will set global.Request
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('No fetch polyfill found for global.Request. Some API tests may fail.');
    }
  }
}
