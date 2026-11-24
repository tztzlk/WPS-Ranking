// Copies the 4:3 flag SVGs from flag-icons into public/flags, so the site serves
// them from its own domain (no third-party CDN) and each page loads only the flags it shows.
import { cpSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve('flag-icons/package.json')), 'flags', '4x3');
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'flags');

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
