const fs = require('fs');
const path = 'api/__tests__/api.songs.test.js';
const content = fs.readFileSync(path, 'utf8');
console.log(content);
console.log('--- EOF ---');
console.log('Length:', content.length);
console.log('Chars:', content.split('').map((c,i) => `${i}:${c.charCodeAt(0)}`).slice(-20).join(' '));
