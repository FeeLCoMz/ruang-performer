// Polyfill global Request for Jest API tests
if (typeof global.Request === 'undefined') {
  try {
    const { Request } = require('node-fetch');
    global.Request = Request;
  } catch (e) {
    try {
      require('whatwg-fetch');
    } catch (err) {
      console.warn('No fetch polyfill found for global.Request. Some API tests may fail.');
    }
  }
}
