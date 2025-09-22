// Runtime shim for bcryptjs used via webpack alias.
// Attempts to load the real bcryptjs from node_modules using an absolute path.
// Falls back to a minimal stub if unavailable, to keep builds working.

/* eslint-disable @typescript-eslint/no-var-requires */
let real: any;
try {
  const path = require('path');
  const fs = require('fs');
  const candidate = path.join(process.cwd(), 'node_modules', 'bcryptjs', 'index.js');
  if (fs.existsSync(candidate)) {
    // Load the actual library to preserve hash compatibility
    // Note: using absolute path avoids our own alias recursion
    // and keeps this server-only.
    // eslint-disable-next-line import/no-dynamic-require, global-require
    real = require(candidate);
  } else {
    real = null;
  }
} catch {
  real = null;
}

type HashFn = (data: string, saltOrRounds?: string | number) => Promise<string>;
type CompareFn = (data: string, encrypted: string) => Promise<boolean>;

const stub: { hash: HashFn; compare: CompareFn } = {
  async hash(_data: string, _saltOrRounds?: string | number): Promise<string> {
    throw new Error('bcryptjs not available in this environment');
  },
  async compare(_data: string, _encrypted: string): Promise<boolean> {
    // Conservative fallback
    return false;
  },
};

const api = (real && typeof real.hash === 'function' && typeof real.compare === 'function')
  ? real
  : stub;

export const hash: HashFn = api.hash.bind(api);
export const compare: CompareFn = api.compare.bind(api);
export default api;

