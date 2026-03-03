import fs from 'fs';
import path from 'path';

let resolved: string | null = null;

/**
 * Resolve cache directory with three strategies (first match wins):
 * 1. CACHE_DIR env variable (explicit override)
 * 2. process.cwd()/cache (works when cwd is backend/)
 * 3. __dirname/../../cache (works from dist/utils/ -> backend/cache)
 *
 * Result is memoized after first call.
 */
export function getCacheDir(): string {
  if (resolved) return resolved;

  if (process.env.CACHE_DIR) {
    resolved = path.resolve(process.env.CACHE_DIR);
    console.log(`[cachePath] CACHE_DIR env -> ${resolved} (exists: ${fs.existsSync(resolved)})`);
    return resolved;
  }

  const cwdCache = path.join(process.cwd(), 'cache');
  if (fs.existsSync(cwdCache)) {
    resolved = cwdCache;
    console.log(`[cachePath] cwd/cache -> ${resolved}`);
    return resolved;
  }

  resolved = path.resolve(__dirname, '../../cache');
  console.log(`[cachePath] __dirname fallback -> ${resolved} (exists: ${fs.existsSync(resolved)})`);
  return resolved;
}
