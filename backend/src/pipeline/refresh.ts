/**
 * Daily data refresh. Runs in GitHub Actions (.github/workflows/refresh-data.yml), never in the API.
 *
 *   npm run refresh                 # skip if the WCA export has not changed since the last run
 *   npm run refresh -- --force      # re-publish the current export anyway
 *   npm run refresh -- --dir <path> # use an already extracted export (metadata.json + TSVs)
 *
 * Env: PIPELINE_DATABASE_URL (or DATABASE_URL) — session-level connection, see db.ts.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import 'dotenv/config';
import { connect } from './db';
import { loadStaging } from './load';
import { computeAndPublish } from './publish';
import { avatarsMissing, refreshAvatars } from './avatars';
import { downloadExport, extractExport, fetchExportInfo, readExportDate, tsvPath } from './wcaExport';

function parseArgs(argv: string[]): { force: boolean; dir?: string } {
  const force = argv.includes('--force');
  const dirIdx = argv.indexOf('--dir');
  const dir = dirIdx >= 0 ? argv[dirIdx + 1] : undefined;
  if (dirIdx >= 0 && !dir) throw new Error('--dir needs a path');
  return { force, dir };
}

/** Avatars are optional: a WCA API failure is logged and the refresh still succeeds. */
async function updateAvatars(client: Awaited<ReturnType<typeof connect>>): Promise<void> {
  const done = step('avatars (WCA API)');
  try {
    const result = await refreshAvatars(client);
    console.log('[refresh] avatars', result);
  } catch (error) {
    console.warn('[refresh] avatars skipped, keeping the previous ones:', error);
  }
  done();
}

function step(label: string): () => void {
  const startedAt = Date.now();
  console.log(`[refresh] ${label} ...`);
  return () => console.log(`[refresh] ${label}: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const client = await connect();
  let workDir: string | null = null;

  try {
    const { rows } = await client.query<{ value: string }>(`SELECT value FROM meta WHERE key = 'wcaExportDate'`);
    const lastPublished = rows[0]?.value ?? null;

    let dir = args.dir;
    if (!dir) {
      const info = await fetchExportInfo();
      const available = new Date(info.exportDate).toISOString();
      console.log(`[refresh] WCA export available: ${available}, last published: ${lastPublished ?? 'never'}`);
      if (available === lastPublished && !args.force) {
        console.log('[refresh] Export unchanged, nothing to do.');
        // First run after the avatars table was added: fill it without waiting for a new export.
        if (await avatarsMissing(client)) await updateAvatars(client);
        return;
      }

      workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wca-export-'));
      const zip = path.join(workDir, 'export.zip');
      let done = step('download');
      await downloadExport(info.tsvUrl, zip);
      done();
      done = step('extract');
      extractExport(zip, workDir);
      await fs.promises.rm(zip);
      done();
      dir = workDir;
    }

    const exportDate = readExportDate(dir);
    if (lastPublished && exportDate < lastPublished && !args.force) {
      throw new Error(`Export ${exportDate} is older than the published ${lastPublished}; use --force to override`);
    }
    if (exportDate === lastPublished && !args.force) {
      console.log(`[refresh] Export ${exportDate} is already published, nothing to do.`);
      return;
    }

    let done = step('load staging (COPY)');
    await loadStaging(client, {
      persons: tsvPath(dir, 'persons'),
      countries: tsvPath(dir, 'countries'),
      ranksAverage: tsvPath(dir, 'ranks_average'),
      ranksSingle: tsvPath(dir, 'ranks_single'),
    });
    done();

    done = step('compute + publish');
    const result = await computeAndPublish(client, exportDate, { force: args.force });
    done();

    console.log('[refresh] published', { exportDate, ...result });

    await updateAvatars(client);
  } finally {
    await client.end().catch(() => {});
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('[refresh] FAILED:', error);
  process.exit(1);
});
