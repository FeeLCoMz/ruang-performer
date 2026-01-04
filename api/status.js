import { getTursoClient } from './_turso.js';

export default async function handler(req, res) {
  try {
    const client = getTursoClient();
    const result = await client.execute("SELECT datetime('now') as now");
    res.status(200).json({ ok: true, now: result.rows?.[0]?.now });
  } catch (err) {
    res.status(200).json({
      ok: false,
      error: err?.message || 'Unknown error',
      missingEnv: {
        TURSO_DATABASE_URL: !(process.env.TURSO_DATABASE_URL || process.env.rz_TURSO_DATABASE_URL || process.env.RZ_TURSO_DATABASE_URL),
        TURSO_AUTH_TOKEN: !(process.env.TURSO_AUTH_TOKEN || process.env.rz_TURSO_AUTH_TOKEN || process.env.RZ_TURSO_AUTH_TOKEN),
      },
    });
  }
}
