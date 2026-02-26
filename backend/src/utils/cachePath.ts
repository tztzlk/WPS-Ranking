import fs from 'fs';
import path from 'path';

/**
 * Resolve cache directory: prefer process.cwd()/cache (e.g. when run from backend/),
 * fallback to __dirname-based path so it works regardless of working directory.
 */
export function getCacheDir(): string {
  const cwdCache = path.join(process.cwd(), 'cache');
  if (fs.existsSync(cwdCache)) {
    return cwdCache;
  }
  return path.resolve(__dirname, '../../cache');
}
