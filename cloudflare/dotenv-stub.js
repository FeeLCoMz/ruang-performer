/**
 * `dotenv` replacement for the Cloudflare bundle.
 *
 * Workers have no filesystem and no `process.env`; configuration is injected by
 * the platform (`env` -> `req.rpEnv`). Calling `.config()` must simply be a
 * no-op instead of throwing.
 */

export function config() {
  return { parsed: {}, error: undefined };
}

export const loadEnv = () => ({});
export default { config, loadEnv };
