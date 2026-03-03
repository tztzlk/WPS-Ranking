import fs from 'fs';
import path from 'path';

/**
 * Resolve cache directory with three strategies (first match wins):
 * 1. CACHE_DIR env variable (explicit override)
 * 2. process.cwd()/cache (works when cwd is backend/)
 * 3. __dirname/../../cache (works from dist/utils/ -> backend/cache)
 */
export function getCacheDir(): string {
  if (process.env.CACHE_DIR) {
    const envDir = path.resolve(process.env.CACHE_DIR);
    console.log(`[cachePath] CACHE_DIR env -> ${envDir} (exists: ${fs.existsSync(envDir)})`);
    return envDir;
  }

  const cwdCache = path.join(process.cwd(), 'cache');
  if (fs.existsSync(cwdCache)) {
    console.log(`[cachePath] cwd/cache -> ${cwdCache}`);
    return cwdCache;
  }

  const dirnameCache = path.resolve(__dirname, '../../cache');
  console.log(`[cachePath] __dirname fallback -> ${dirnameCache} (exists: ${fs.existsSync(dirnameCache)})`);
  return dirnameCache;
}
