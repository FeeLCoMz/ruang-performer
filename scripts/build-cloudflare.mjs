#!/usr/bin/env node
/**
 * Build the API bundle for Cloudflare Workers.
 *
 * Output: cloudflare/.build/worker.js  (referenced by wrangler.toml `main`)
 *
 * Why a separate bundle instead of wrangler's own esbuild?
 *  - `@libsql/client` must resolve to its `/web` entry on Workers (the default
 *    entry imports node:fs / node:os).
 *  - `nodemailer` (SMTP over TCP) cannot run on Workers; it is replaced by a
 *    stub and api/_mailer.js switches to an HTTP provider.
 *  - `dotenv` is a no-op there (bindings are injected by the platform).
 *
 * The React app itself is built by Vite (`npm run build` -> dist/) and served
 * as static assets by [assets] in wrangler.toml.
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(root, 'cloudflare/.build/worker.js');

const NODE_BUILTINS = new Set([
  'assert',
  'buffer',
  'crypto',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'stream',
  'tls',
  'url',
  'util',
  'zlib',
]);

const result = await build({
  entryPoints: [path.join(root, 'cloudflare/worker.js')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  conditions: ['workerd', 'worker', 'browser', 'import'],
  mainFields: ['module', 'main'],
  // Node built-ins stay external: `nodejs_compat` provides them at runtime.
  // Only the `node:` form works in an ESM bundle — leaving bare names
  // (`buffer`, `crypto`, ...) external makes esbuild emit `require("buffer")`
  // for CJS deps (jsonwebtoken -> jws -> safe-buffer), and the Workers
  // validator then rejects the script with
  // "Dynamic require of \"buffer\" is not supported" (code 10021).
  external: ['node:*'],
  // Rewrite bare built-in imports from CJS dependencies to `node:` form.
  plugins: [
    {
      name: 'node-builtin-imports',
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^[a-z]+$/ }, (args) => {
          if (!NODE_BUILTINS.has(args.path)) return undefined;
          return { path: `node:${args.path}`, external: true };
        });
      },
    },
  ],
  alias: {
    '@libsql/client': '@libsql/client/web',
    nodemailer: path.join(root, 'cloudflare/nodemailer-stub.js'),
    // Subpath first: esbuild appends `/config` to the alias target, so
    // `dotenv/config` must map to an exact file, not to a directory.
    'dotenv/config': path.join(root, 'cloudflare/dotenv-stub.js'),
    dotenv: path.join(root, 'cloudflare/dotenv-stub.js'),
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Keep stack traces readable in `wrangler tail`.
  minify: false,
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
  metafile: true,
});

// esbuild's ESM output keeps its CJS interop helper as
//   typeof require !== "undefined" ? require : throw "Dynamic require ..."
// Workers has no `require` for ESM scripts, so the helper throws as soon as a
// bundled CJS module (safe-buffer) runs. The imports are already rewritten to
// `node:*` above, so route the helper to `import { createRequire } from
// 'node:module'` instead of requiring the whole dependency tree be ESM.
const SHIM_END = '});';
const SHIM = `});
import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);`;
const bundle = await readFile(outfile, 'utf8');
if (!bundle.includes(SHIM_END)) throw new Error('esbuild ESM require shim not found; check esbuild version');
await writeFile(outfile, bundle.replace(SHIM_END, SHIM));

const outputs = Object.entries(result.metafile.outputs || {});
const size = outputs.reduce((total, [, meta]) => total + (meta.bytes || 0), 0);
console.log(`\nCloudflare bundle ready: cloudflare/.build/worker.js (${(size / 1024).toFixed(1)} kB)`);
