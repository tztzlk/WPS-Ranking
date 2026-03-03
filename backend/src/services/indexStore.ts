import fs from 'fs';
import path from 'path';
import { getCacheDir } from '../utils/cachePath';

export interface WpsEntry {
  wps: number;
}

export interface WpsRankIndex {
  generatedAt: string;
  totalRanked: number;
  ranks: Record<string, number>;
}

export interface CountriesIndex {
  countries: Record<string, { name: string; iso2: string }>;
}

export interface GlobalLeaderboard {
  source: string;
  generatedAt: string;
  count: number;
  items: Array<{
    rank: number;
    personId: string;
    name: string;
    countryId?: string;
    countryName?: string;
    countryIso2?: string;
    wps: number;
  }>;
}

export interface ProfileBreakdownEntry {
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
  breakdown: Array<{
    eventId: string;
    worldRank: number;
    weight: number;
    eventScore: number;
  }>;
}

// --------------- module-level caches (small files only) ---------------

let wpsIndex: Record<string, WpsEntry> = {};
let wpsRankIndex: WpsRankIndex | null = null;
let countriesIndex: CountriesIndex | null = null;
let globalLeaderboard: GlobalLeaderboard | null = null;

// --------------- helpers ---------------

function fileSizeMB(filePath: string): string {
  try {
    const { size } = fs.statSync(filePath);
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return 'missing';
  }
}

function loadJsonCache<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[indexStore] Missing cache file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

// --------------- eager loader (small files only) ---------------

export function initAllCaches(): void {
  const cacheDir = getCacheDir();
  const t0 = Date.now();

  const files: Record<string, string> = {
    wps: path.join(cacheDir, 'wps.index.json'),
    wpsRank: path.join(cacheDir, 'wpsRank.index.json'),
    countries: path.join(cacheDir, 'countries.index.json'),
    leaderboard: path.join(cacheDir, 'leaderboard.top100.json'),
  };

  const skipped: Record<string, string> = {
    persons: path.join(cacheDir, 'persons.index.json'),
    breakdown: path.join(cacheDir, 'wps.breakdown.json'),
  };

  console.log('[indexStore] File sizes:');
  for (const [name, fp] of Object.entries({ ...files, ...skipped })) {
    console.log(`  ${name}: ${fileSizeMB(fp)}`);
  }
  console.log('[indexStore] Skipping persons + breakdown (streamed on demand)');

  const warn = (name: string, e: unknown) =>
    console.warn(`[indexStore] WARN: ${name} unavailable — ${e instanceof Error ? e.message : String(e)}`);

  try { wpsIndex = loadJsonCache<Record<string, WpsEntry>>(files.wps); }
  catch (e) { warn('wps', e); wpsIndex = {}; }

  try { wpsRankIndex = loadJsonCache<WpsRankIndex>(files.wpsRank); }
  catch (e) { warn('wpsRank', e); wpsRankIndex = null; }

  try { countriesIndex = loadJsonCache<CountriesIndex>(files.countries); }
  catch (e) { warn('countries', e); countriesIndex = null; }

  try { globalLeaderboard = loadJsonCache<GlobalLeaderboard>(files.leaderboard); }
  catch (e) { warn('leaderboard', e); globalLeaderboard = null; }

  const rss = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
  console.log(`[indexStore] Cache init done in ${Date.now() - t0}ms | RSS ${rss} MB`);
}

// --------------- getters ---------------

export function getWpsIndex(): Record<string, WpsEntry> { return wpsIndex; }
export function getWpsRankIndex(): WpsRankIndex | null { return wpsRankIndex; }
export function getCountriesIndex(): CountriesIndex | null { return countriesIndex; }
export function getGlobalLeaderboardCache(): GlobalLeaderboard | null { return globalLeaderboard; }
