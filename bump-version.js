import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

function bumpPatch(version) {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

pkg.version = bumpPatch(pkg.version);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Version bumped to', pkg.version);
