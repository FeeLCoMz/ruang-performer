// Menghitung file api/ yang benar-benar ter-deploy (mengikuti .vercelignore).
// Jalankan: node scripts/vercel-function-list.cjs
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ignoreFile = path.join(root, '.vercelignore');
const rules = fs
  .readFileSync(ignoreFile, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

function isIgnored(rel) {
  for (const rawRule of rules) {
    const rule = rawRule.replace(/^\//, '');
    if (rule.endsWith('/')) {
      const base = rule.slice(0, -1);
      if (rel === base || rel.startsWith(`${base}/`)) return rawRule;
      continue;
    }
    if (rule.includes('*')) {
      const pattern = rule
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*');
      if (new RegExp(`^${pattern}$`).test(path.posix.basename(rel))) return rawRule;
      continue;
    }
    if (rel === rule) return rawRule;
  }
  return null;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const files = walk('api').map((file) => file.replace(/\\/g, '/'));
const deployed = files.filter((file) => !isIgnored(file)).sort();

console.log(`File api/ ter-deploy (${deployed.length}):`);
deployed.forEach((file) => console.log(`  ${file}`));

const localIgnored = files.filter((file) => isIgnored(file)).sort();
console.log(`\nDi-ignore .vercelignore (${localIgnored.length}):`);
localIgnored.forEach((file) => console.log(`  ${file}`));
