/**
 * Memeriksa apakah endpoint AI benar-benar tersedia dari function tunggal.
 * Jalankan: node scripts/check-ai-route.mjs
 */
import { readFileSync } from 'fs';

const catchAll = readFileSync(new URL('../api/[...path].js', import.meta.url), 'utf8');
const indexPath = new URL('../api/index.js', import.meta.url);
const index = readFileSync(indexPath, 'utf8');

const catchAllImportsAi = /from '\.\/ai\.js'|from '\.\.\/api\/ai\.js'/.test(catchAll);
const catchAllHasAiRoute = /resource === 'ai'/.test(catchAll);
const indexImportsAi = /from '\.\/ai\.js'/.test(index);

console.log('api/[...path].js mengimpor ai.js     :', catchAllImportsAi);
console.log("api/[...path].js punya route 'ai'    :", catchAllHasAiRoute);
console.log('api/index.js (dev) mengimpor ai.js   :', indexImportsAi);

const aiDeployed = catchAllImportsAi && catchAllHasAiRoute;
console.log('\n=> Endpoint /api/ai* tersedia di Vercel:', aiDeployed ? 'YA' : 'TIDAK');
process.exit(aiDeployed ? 0 : 1);
