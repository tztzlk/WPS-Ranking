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

/**
 * Maps WCA v2 export filenames to legacy names expected by the rest of the codebase.
 * WCA v2 uses: WCA_export_<name>.tsv (snake_case)
 * Downstream expects: <PascalCase>.tsv
 * Only these 4 files are needed for the WPS pipeline.
 */
const V2_TO_LEGACY_TSV_MAP: Record<string, string> = {
  'WCA_export_countries.tsv': 'Countries.tsv',
  'WCA_export_events.tsv': 'Events.tsv',
  'WCA_export_persons.tsv': 'Persons.tsv',
  'WCA_export_ranks_average.tsv': 'RanksAverage.tsv',
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

/**
 * Extracts only the 4 required TSV files from the WCA v2 zip.
 * On Unix-like systems uses unzip for selective extraction.
 * On Windows falls back to Expand-Archive because unzip is usually unavailable.
 */
function extractTsvs(): void {
  fs.mkdirSync(WCA_EXPORT_DIR, { recursive: true });

  const tmpDir = path.join(CACHE_DIR, '_unzip_tmp');
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  if (process.platform === 'win32') {
    console.log('Extracting required TSVs from WCA export with PowerShell Expand-Archive ...');
    expandArchiveWithPowerShell(tmpDir);
  } else {
    const v2Filenames = Object.keys(V2_TO_LEGACY_TSV_MAP);
    const pathsInZip = getPathsInZip(v2Filenames);

    console.log('Extracting 4 required TSVs from WCA export (selective extraction) ...');
    for (const p of pathsInZip) {
      execSync(`unzip -o -j "${ZIP_PATH}" "${p}" -d "${tmpDir}"`, { stdio: 'pipe' });
    }
  }

  for (const [v2Filename, legacyFilename] of Object.entries(V2_TO_LEGACY_TSV_MAP)) {
    const found = findFile(tmpDir, v2Filename);
    if (!found) {
      throw new Error(
        `Required WCA v2 TSV not found after extraction: ${v2Filename}. ` +
          `Ensure the export contains WCA_export_countries.tsv, WCA_export_events.tsv, WCA_export_persons.tsv, WCA_export_ranks_average.tsv`
      );
    }
    const dest = path.join(WCA_EXPORT_DIR, legacyFilename);
    fs.copyFileSync(found, dest);
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
    console.log(`  Extracted & normalized: ${v2Filename} -> ${legacyFilename} (${sizeMB} MB)`);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('Extraction complete. 4 files ready for pipeline.');
}

function escapeForPowerShellLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function expandArchiveWithPowerShell(destinationDir: string): void {
  const zipPath = escapeForPowerShellLiteral(ZIP_PATH);
  const outputDir = escapeForPowerShellLiteral(destinationDir);
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${outputDir}' -Force"`,
    { stdio: 'pipe' },
  );
}

/**
 * Lists zip contents and returns the archive paths for the required v2 filenames.
 * Handles both flat and nested zip structures (e.g. WCA_export_v2_xxx/WCA_export_countries.tsv).
 */
function getPathsInZip(v2Filenames: string[]): string[] {
  const listOutput = execSync(`unzip -l "${ZIP_PATH}"`, { encoding: 'utf8' });
  const lines = listOutput.split('\n');
  const paths: string[] = [];

  for (const v2Filename of v2Filenames) {
    const line = lines.find((l) => l.trimEnd().endsWith(v2Filename));
    if (!line) {
      throw new Error(`Required file not found in WCA zip: ${v2Filename}`);
    }
    const pathInZip = parsePathFromUnzipList(line) ?? v2Filename;
    paths.push(pathInZip);
  }
  return paths;
}

/** Parse the file path from a line of "unzip -l" output. */
function parsePathFromUnzipList(line: string): string | null {
  const parts = line.split(/\s{2,}/);
  const pathInZip = parts[parts.length - 1]?.trim();
  return pathInZip || null;
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
