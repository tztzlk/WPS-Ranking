/**
 * Offline script only. Not used by runtime API.
 * Pipeline: downloads WCA export, extracts TSVs, runs leaderboardTop100 to rebuild JSON indexes.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import axios from 'axios';
import dotenv from 'dotenv';
import { generateTop100Leaderboard } from './leaderboardTop100';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const WCA_EXPORT_URL =
  process.env.WCA_EXPORT_URL ??
  'https://www.worldcubeassociation.org/export/results/WCA_export.tsv.zip';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const WCA_EXPORT_DIR = path.join(CACHE_DIR, 'wca_export');
const ZIP_PATH = path.join(CACHE_DIR, 'wca_export.zip');
const HASH_PATH = path.join(CACHE_DIR, 'export.sha256');

const NEEDED_TSVS = ['Persons', 'Countries', 'RanksAverage'];

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function downloadZip(): Promise<void> {
  console.log(`Downloading WCA export from ${WCA_EXPORT_URL} ...`);
  const response = await axios.get(WCA_EXPORT_URL, { responseType: 'arraybuffer', timeout: 300_000 });
  fs.writeFileSync(ZIP_PATH, Buffer.from(response.data));
  const sizeMB = (fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Downloaded ${sizeMB} MB -> ${ZIP_PATH}`);
}

function extractTsvs(): void {
  fs.mkdirSync(WCA_EXPORT_DIR, { recursive: true });

  const tmpDir = path.join(CACHE_DIR, '_unzip_tmp');
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log('Extracting ZIP ...');
  execSync(`unzip -o "${ZIP_PATH}" -d "${tmpDir}"`, { stdio: 'pipe' });

  for (const name of NEEDED_TSVS) {
    const pattern = `WCA_export_${name}.tsv`;
    const found = findFile(tmpDir, pattern);
    if (!found) {
      throw new Error(`Required TSV not found in export: ${pattern}`);
    }
    const dest = path.join(WCA_EXPORT_DIR, `${name}.tsv`);
    fs.copyFileSync(found, dest);
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
    console.log(`  ${name}.tsv  ${sizeMB} MB`);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('Extraction complete.');
}

function findFile(dir: string, target: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, target);
      if (found) return found;
    } else if (entry.name === target) {
      return full;
    }
  }
  return null;
}

export async function runUpdateRawData(): Promise<{ changed: boolean }> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log('[updateData] Downloading latest WCA export ...');
  await downloadZip();

  const newHash = sha256File(ZIP_PATH);
  const oldHash = fs.existsSync(HASH_PATH) ? fs.readFileSync(HASH_PATH, 'utf8').trim() : '';

  if (newHash === oldHash) {
    console.log('[updateData] WCA export unchanged — skipping recompute.');
    return { changed: false };
  }

  fs.writeFileSync(HASH_PATH, newHash);

  console.log('[updateData] Export changed. Extracting TSVs ...');
  extractTsvs();

  console.log('[updateData] Rebuilding JSON caches ...');
  await generateTop100Leaderboard({
    onRanksLineProgress: (count) => {
      if (count % 500_000 === 0) {
        console.log(`  RanksAverage: ${count.toLocaleString()} lines`);
      }
    },
  });

  console.log('[updateData] Raw data update complete.');
  return { changed: true };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[updateData] Starting raw data update ...');
  const result = await runUpdateRawData();
  console.log('[updateData] Finished. changed=%s durationMs=%d', result.changed, Date.now() - startedAt);
}

main().catch((err) => {
  console.error('[updateData] Failed:', err);
  process.exit(1);
});
