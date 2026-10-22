/**
 * Loader untuk check-setlist-write-batch.mjs: mengganti modul Turso & auth
 * dengan stub agar handler bisa diuji tanpa database sungguhan.
 *
 * Dipakai via: node --import ./scripts/check-setlist-write-batch-stub.mjs ...
 * (lihat scripts/run-api-checks.mjs)
 */
import { register } from 'node:module';

register('./check-setlist-write-batch-loader.mjs', import.meta.url);
