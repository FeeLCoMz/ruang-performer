const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('api/__tests__/api.songs.test.js', 'utf8');
try {
  parser.parse(code, { sourceType: 'script', plugins: ['jsx'] });
  console.log('script parse OK');
} catch (e) {
  console.error('script parse failed', e.message);
}
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('module parse OK');
} catch (e) {
  console.error('module parse failed', e.message);
}
