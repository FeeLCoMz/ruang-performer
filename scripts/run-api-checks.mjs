/**
 * run-api-checks.mjs
 *
 * Menjalankan semua pemeriksaan API yang TIDAK membutuhkan kredensial
 * (offline). Dipakai oleh `npm run check:api`, dan sengaja dijadikan satu
 * perintah supaya mudah dijalankan sebelum commit/deploy — bukan sekadar
 * script yang harus diingat satu per satu.
 *
 * Cakupan:
 *   - body parsing (string/objek/Buffer/rusak)        ← bug 400 "Title required"
 *   - routing /api/ai/*                                ← bug "prompt atau context"
 *   - cache tidak menyimpan hasil gagal                ← bug youtubeId kosong
 *   - kuota AI (SQLite in-memory)
 *   - tabel audit & penulisan audit
 *   - gate modul MIDI Cue
 *
 * Pemeriksaan yang butuh kredensial (check-ai-youtube, check-ai-autofill-live)
 * TIDAK dijalankan di sini; keduanya melewati diri sendiri bila env kosong.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const CHECKS = [
  { file: 'check-body-parsing.mjs', label: 'body parsing' },
  { file: 'check-ai-routing.mjs', label: 'routing /api/ai/*' },
  { file: 'check-youtube-picker.mjs', label: 'pencarian video YouTube' },
  { file: 'check-ai-quota.mjs', label: 'kuota AI' },
  { file: 'check-audit-sqlite.mjs', label: 'audit log (SQLite)' },
  { file: 'check-audit-writes.mjs', label: 'penulisan audit' },
  { file: 'check-audit-auth.mjs', label: 'audit auth & member' },
  { file: 'check-midi-cue.mjs', label: 'gate modul MIDI Cue' },
  {
    file: 'check-setlist-write-batch.mjs',
    label: 'penulisan setlist (batch, tanpa tulis ulang)',
    args: ['--import', pathToFileURL(join(HERE, 'check-setlist-write-batch-stub.mjs')).href],
  },
];

const results = [];

for (const check of CHECKS) {
  const filePath = join(HERE, check.file);
  if (!existsSync(filePath)) {
    results.push({ ...check, ok: false, reason: 'file tidak ditemukan' });
    continue;
  }

  // eslint-disable-next-line no-await-in-loop
  const run = spawnSync(process.execPath, [...(check.args || []), filePath], {
    cwd: join(HERE, '..'),
    encoding: 'utf8',
    timeout: 120_000,
  });

  const ok = run.status === 0;
  results.push({
    ...check,
    ok,
    reason: ok ? '' : (run.error?.message || (run.stderr || run.stdout || '').trim().split('\n').slice(-3).join(' | ')),
  });

  console.log(`${ok ? '✅' : '❌'} ${check.label} (${check.file})`);
  if (!ok && results[results.length - 1].reason) {
    console.log(`   → ${results[results.length - 1].reason}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lulus`);

if (failed.length > 0) {
  console.log(`\nAPI CHECKS FAILED: ${failed.map((r) => r.label).join(', ')}`);
  process.exit(1);
}
console.log('\nAPI CHECKS OK');
