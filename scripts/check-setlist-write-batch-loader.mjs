/**
 * ESM loader hooks: arahkan `server/_turso.js` dan `server/_auth.js` ke versi
 * palsu sehingga check-setlist-write-batch.mjs bisa memanggil handler setlist
 * dengan client database yang merekam setiap query.
 */

const STUB_MODULES = {
  turso: new URL('./check-setlist-write-batch-turso-stub.mjs', import.meta.url).href,
  auth: new URL('./check-setlist-write-batch-auth-stub.mjs', import.meta.url).href,
};

export async function resolve(specifier, context, nextResolve) {
  const url = new URL(specifier, context.parentURL).href;
  if (url.endsWith('/server/_turso.js')) {
    return { url: STUB_MODULES.turso, shortCircuit: true };
  }
  if (url.endsWith('/server/_auth.js')) {
    return { url: STUB_MODULES.auth, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
