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
  'https://www.worldcubeassociation.org/export/results/v2/tsv';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const WCA_EXPORT_DIR = path.join(CACHE_DIR, 'wca_export');
const ZIP_PATH = path.join(CACHE_DIR, 'wca_export.zip');
const HASH_PATH = path.join(CACHE_DIR, 'export.sha256');

/** v2 export uses snake_case filenames; we copy to PascalCase for downstream compatibility. */
const V2_TSV_MAP: Record<string, string> = {
  persons: 'Persons',
  countries: 'Countries',
  ranks_average: 'RanksAverage',
};

async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function downloadZip(): Promise<void> {
  console.log(`Downloading WCA export from ${WCA_EXPORT_URL} ...`);
  const response = await axios.get(WCA_EXPORT_URL, { responseType: 'stream', timeout: 300_000 });
  const writer = fs.createWriteStream(ZIP_PATH);
  response.data.pipe(writer);
  await new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });
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

  for (const [v2Name, destName] of Object.entries(V2_TSV_MAP)) {
    const pattern = `${v2Name}.tsv`;
    const found = findFile(tmpDir, pattern);
    if (!found) {
      throw new Error(`Required TSV not found in export: ${pattern}`);
    }
    const dest = path.join(WCA_EXPORT_DIR, `${destName}.tsv`);
    fs.copyFileSync(found, dest);
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
    console.log(`  ${destName}.tsv  ${sizeMB} MB`);
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

  const newHash = await sha256File(ZIP_PATH);
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
