import { createClient } from '@libsql/client';

export function getTursoClient() {
  const url = process.env.rz_TURSO_DATABASE_URL ?? process.env.RZ_TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  const authToken = process.env.rz_TURSO_AUTH_TOKEN ?? process.env.RZ_TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('Missing TURSO_DATABASE_URL environment variable (or rz_TURSO_DATABASE_URL)');
  }
  if (!authToken) {
    throw new Error('Missing TURSO_AUTH_TOKEN environment variable (or rz_TURSO_AUTH_TOKEN)');
  }

  return createClient({ url, authToken });
}
