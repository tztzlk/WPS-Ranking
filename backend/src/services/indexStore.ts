import fs from 'fs';
import path from 'path';
import { getCacheDir } from '../utils/cachePath';

export interface PersonEntry {
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
}

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

// --------------- module-level caches ---------------

let personsIndex: Record<string, PersonEntry> = {};
let wpsIndex: Record<string, WpsEntry> = {};
let wpsRankIndex: WpsRankIndex | null = null;
let countriesIndex: CountriesIndex | null = null;
let globalLeaderboard: GlobalLeaderboard | null = null;
let breakdownIndex: Record<string, ProfileBreakdownEntry> = {};

// --------------- helper ---------------

export function loadJsonCache<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[indexStore] Missing cache file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

// --------------- eager loader ---------------

export function initAllCaches(): void {
  const cacheDir = getCacheDir();
  const t0 = Date.now();

  const files: Record<string, string> = {
    persons: path.join(cacheDir, 'persons.index.json'),
    wps: path.join(cacheDir, 'wps.index.json'),
    wpsRank: path.join(cacheDir, 'wpsRank.index.json'),
    countries: path.join(cacheDir, 'countries.index.json'),
    leaderboard: path.join(cacheDir, 'leaderboard.top100.json'),
    breakdown: path.join(cacheDir, 'wps.breakdown.json'),
  };

  try { personsIndex = loadJsonCache<Record<string, PersonEntry>>(files.persons); }
  catch (e) { console.error(String(e)); personsIndex = {}; }

  try { wpsIndex = loadJsonCache<Record<string, WpsEntry>>(files.wps); }
  catch (e) { console.error(String(e)); wpsIndex = {}; }

  try { wpsRankIndex = loadJsonCache<WpsRankIndex>(files.wpsRank); }
  catch (e) { console.error(String(e)); wpsRankIndex = null; }

  try { countriesIndex = loadJsonCache<CountriesIndex>(files.countries); }
  catch (e) { console.error(String(e)); countriesIndex = null; }

  try { globalLeaderboard = loadJsonCache<GlobalLeaderboard>(files.leaderboard); }
  catch (e) { console.error(String(e)); globalLeaderboard = null; }

  try { breakdownIndex = loadJsonCache<Record<string, ProfileBreakdownEntry>>(files.breakdown); }
  catch (e) { console.error(String(e)); breakdownIndex = {}; }

  console.log(`[indexStore] All caches loaded in ${Date.now() - t0}ms`);
}

// --------------- getters ---------------

export function getPersonsIndex(): Record<string, PersonEntry> { return personsIndex; }
export function getWpsIndex(): Record<string, WpsEntry> { return wpsIndex; }
export function getWpsRankIndex(): WpsRankIndex | null { return wpsRankIndex; }
export function getCountriesIndex(): CountriesIndex | null { return countriesIndex; }
export function getGlobalLeaderboardCache(): GlobalLeaderboard | null { return globalLeaderboard; }
export function getBreakdownIndex(): Record<string, ProfileBreakdownEntry> { return breakdownIndex; }
