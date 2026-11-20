/**
 * WCA results export: metadata check, download and extraction of the TSVs the pipeline needs.
 * https://www.worldcubeassociation.org/export/results
 */
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { execFileSync } from 'child_process';

const EXPORT_INFO_URL =
  process.env.WCA_EXPORT_INFO_URL ?? 'https://www.worldcubeassociation.org/api/v0/export/public';

/** v2 export file names, without the WCA_export_ prefix. */
export const REQUIRED_TSVS = ['persons', 'countries', 'ranks_average', 'ranks_single'] as const;
export type TsvName = (typeof REQUIRED_TSVS)[number];

export interface ExportInfo {
  /** e.g. "2026-11-19T00:30:20Z" */
  exportDate: string;
  tsvUrl: string;
}

export async function fetchExportInfo(): Promise<ExportInfo> {
  const res = await fetch(EXPORT_INFO_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`WCA export info request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { export_date?: string; tsv_url?: string };
  if (!body.export_date || !body.tsv_url) {
    throw new Error(`Unexpected WCA export info payload: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return { exportDate: body.export_date, tsvUrl: body.tsv_url };
}

export async function downloadExport(url: string, zipPath: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`WCA export download failed: ${res.status} ${res.statusText}`);
  }
  await fs.promises.mkdir(path.dirname(zipPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body as never), fs.createWriteStream(zipPath));
}

/**
 * Extracts the required TSVs (and metadata.json) into `dir` using the system `unzip`
 * (present on GitHub runners and any Linux/macOS machine).
 */
export function extractExport(zipPath: string, dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const members = ['metadata.json', ...REQUIRED_TSVS.map((n) => `WCA_export_${n}.tsv`)];
  execFileSync('unzip', ['-o', '-j', '-q', zipPath, ...members.map((m) => `*${m}`), '-d', dir], {
    stdio: 'inherit',
  });
}

export function tsvPath(dir: string, name: TsvName): string {
  const file = path.join(dir, `WCA_export_${name}.tsv`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}`);
  }
  return file;
}

/** Reads export_date from metadata.json of an extracted export, as an ISO string. */
export function readExportDate(dir: string): string {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8')) as {
    export_date?: string;
  };
  if (!raw.export_date) {
    throw new Error('metadata.json has no export_date');
  }
  // "2026-11-19 00:30:20 UTC" -> "2026-11-19T00:30:20Z"
  const iso = new Date(raw.export_date.replace(' UTC', 'Z').replace(' ', 'T'));
  if (Number.isNaN(iso.getTime())) {
    throw new Error(`Cannot parse export_date "${raw.export_date}"`);
  }
  return iso.toISOString();
}
