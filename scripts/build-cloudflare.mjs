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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [path.join(root, 'cloudflare/worker.js')],
  outfile: path.join(root, 'cloudflare/.build/worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  conditions: ['workerd', 'worker', 'browser', 'import'],
  mainFields: ['module', 'main'],
  // Node built-ins stay external: `nodejs_compat` provides them at runtime.
  // (Bare specifiers are needed too — bcryptjs/jsonwebtoken/busboy require
  // 'crypto' and 'stream' without the node: prefix.)
  external: [
    'node:*',
    'crypto',
    'stream',
    'buffer',
    'util',
    'events',
    'path',
    'fs',
    'os',
    'zlib',
    'http',
    'https',
    'net',
    'tls',
    'url',
    'assert',
  ],
  alias: {
    '@libsql/client': '@libsql/client/web',
    nodemailer: path.join(root, 'cloudflare/nodemailer-stub.js'),
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

const outputs = Object.entries(result.metafile.outputs || {});
const size = outputs.reduce((total, [, meta]) => total + (meta.bytes || 0), 0);
console.log(`\nCloudflare bundle ready: cloudflare/.build/worker.js (${(size / 1024).toFixed(1)} kB)`);
