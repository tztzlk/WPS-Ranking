import fs from 'fs';
import path from 'path';
import { getCacheDir } from '../utils/cachePath';

const CACHE_DIR = getCacheDir();
const PERSONS_INDEX_PATH = path.join(CACHE_DIR, 'persons.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');
const WPS_RANK_INDEX_PATH = path.join(CACHE_DIR, 'wpsRank.index.json');
const COUNTRIES_INDEX_PATH = path.join(CACHE_DIR, 'countries.index.json');
const LEADERBOARD_TOP100_PATH = path.join(CACHE_DIR, 'leaderboard.top100.json');

interface PersonEntry {
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
}

interface WpsEntry {
  wps: number;
}

interface WpsRankIndex {
  generatedAt: string;
  totalRanked: number;
  ranks: Record<string, number>;
}

interface CountriesIndex {
  countries: Record<string, { name: string; iso2: string }>;
}

interface GlobalLeaderboard {
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

let personsIndex: Record<string, PersonEntry> | null = null;
let wpsIndex: Record<string, WpsEntry> | null = null;
let wpsRankIndex: WpsRankIndex | null = null;
let countriesIndex: CountriesIndex | null = null;
let globalLeaderboard: GlobalLeaderboard | null = null;

export interface CountryItem {
  iso2: string;
  name: string;
}

let countriesListCache: CountryItem[] | null = null;

function loadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    console.error(`[leaderboardCache] Missing cache file: ${filePath}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[leaderboardCache] Failed to read cache file: ${filePath}`, err);
    return null;
  }
}

/** Load all index files into memory. Reused across requests. */
function ensureIndexesLoaded(): void {
  if (personsIndex !== null && wpsIndex !== null && wpsRankIndex !== null) return;
  personsIndex = loadJson<Record<string, PersonEntry>>(PERSONS_INDEX_PATH) ?? {};
  wpsIndex = loadJson<Record<string, WpsEntry>>(WPS_INDEX_PATH) ?? {};
  wpsRankIndex = loadJson<WpsRankIndex>(WPS_RANK_INDEX_PATH);
  countriesIndex = loadJson<CountriesIndex>(COUNTRIES_INDEX_PATH);
}

function ensureGlobalLoaded(): void {
  if (globalLeaderboard !== null) return;
  globalLeaderboard = loadJson<GlobalLeaderboard>(LEADERBOARD_TOP100_PATH);
}

function getCountryNameByIso2(iso2: string): string | undefined {
  if (!countriesIndex?.countries) return undefined;
  const entry = Object.values(countriesIndex.countries).find(
    (c) => c.iso2?.toUpperCase() === iso2.toUpperCase()
  );
  return entry?.name;
}

/**
 * Returns all unique countries from persons index (iso2 + name), sorted by name.
 * In-memory cached after first call.
 */
export function getCountriesList(): CountryItem[] | null {
  ensureIndexesLoaded();
  if (!personsIndex) return null;
  if (countriesListCache !== null) return countriesListCache;

  const byIso2 = new Map<string, string>();
  for (const person of Object.values(personsIndex)) {
    const iso2 = person.countryIso2?.trim();
    if (!iso2) continue;
    const upper = iso2.toUpperCase();
    const name =
      person.countryName?.trim() ||
      getCountryNameByIso2(upper) ||
      upper;
    if (!byIso2.has(upper)) byIso2.set(upper, name);
  }

  const list: CountryItem[] = Array.from(byIso2.entries()).map(([iso2, name]) => ({
    iso2,
    name,
  }));
  list.sort((a, b) => a.name.localeCompare(b.name));
  countriesListCache = list;
  return countriesListCache;
}

export interface CountryLeaderboardItem {
  countryRank: number;
  personId: string;
  name: string;
  countryIso2: string;
  countryName: string;
  wps: number;
  globalWpsRank: number;
}

export interface CountryLeaderboardResponse {
  scope: 'country';
  countryIso2: string;
  countryName: string;
  generatedAt: string;
  totalRanked: number;
  count: number;
  items: CountryLeaderboardItem[];
}

export interface GlobalLeaderboardResponse {
  scope: 'global';
  generatedAt: string;
  totalRanked?: number;
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
  source?: string;
}

export type LeaderboardResponse = CountryLeaderboardResponse | GlobalLeaderboardResponse;

/**
 * Returns global top-100 from cached leaderboard.top100.json.
 */
export function getGlobalLeaderboard(limit: number = 100): GlobalLeaderboardResponse | null {
  ensureGlobalLoaded();
  if (!globalLeaderboard) return null;
  const items = globalLeaderboard.items.slice(0, limit);
  return {
    scope: 'global',
    generatedAt: globalLeaderboard.generatedAt,
    count: items.length,
    items,
    source: globalLeaderboard.source,
  };
}

/**
 * Returns country rank and total for a person in their country (by WPS).
 */
export function getCountryRank(
  personId: string,
  countryIso2: string
): { countryRank: number; countryTotal: number } | null {
  ensureIndexesLoaded();
  if (!personsIndex || !wpsRankIndex) return null;
  const iso2Upper = countryIso2?.trim()?.toUpperCase();
  if (!iso2Upper) return null;

  const candidates: Array<{ personId: string; wps: number }> = [];
  for (const [pid, person] of Object.entries(personsIndex)) {
    if (person.countryIso2?.toUpperCase() !== iso2Upper) continue;
    const wpsEntry = wpsIndex?.[pid];
    if (wpsEntry == null || typeof wpsEntry.wps !== 'number') continue;
    candidates.push({ personId: pid, wps: wpsEntry.wps });
  }
  candidates.sort((a, b) => {
    const diff = b.wps - a.wps;
    if (diff !== 0) return diff;
    return a.personId.localeCompare(b.personId);
  });
  const index = candidates.findIndex((c) => c.personId === personId);
  if (index < 0) return null;
  return { countryRank: index + 1, countryTotal: candidates.length };
}

/**
 * Returns top N cubers for a country by WPS (from all ranked), with countryRank and globalWpsRank.
 */
export function getCountryLeaderboard(
  countryIso2: string,
  limit: number = 100
): CountryLeaderboardResponse | null {
  ensureIndexesLoaded();
  if (!personsIndex || !wpsRankIndex) return null;

  const iso2Upper = countryIso2.trim().toUpperCase();
  if (!iso2Upper) return null;

  const candidates: Array<{ personId: string; person: PersonEntry; wps: number }> = [];
  for (const [personId, person] of Object.entries(personsIndex)) {
    const personIso2 = person.countryIso2?.toUpperCase();
    if (personIso2 !== iso2Upper) continue;
    const wpsEntry = wpsIndex?.[personId];
    if (wpsEntry == null || typeof wpsEntry.wps !== 'number') continue;
    candidates.push({ personId, person, wps: wpsEntry.wps });
  }

  candidates.sort((a, b) => {
    const diff = b.wps - a.wps;
    if (diff !== 0) return diff;
    return a.personId.localeCompare(b.personId);
  });

  const top = candidates.slice(0, limit);
  const ranks = wpsRankIndex.ranks ?? {};
  const countryName =
    getCountryNameByIso2(iso2Upper) ?? top[0]?.person.countryName ?? iso2Upper;

  const items: CountryLeaderboardItem[] = top.map((entry, index) => ({
    countryRank: index + 1,
    personId: entry.personId,
    name: entry.person.name,
    countryIso2: iso2Upper,
    countryName,
    wps: entry.wps,
    globalWpsRank: ranks[entry.personId] ?? 0,
  }));

  return {
    scope: 'country',
    countryIso2: iso2Upper,
    countryName,
    generatedAt: wpsRankIndex.generatedAt,
    totalRanked: wpsRankIndex.totalRanked ?? 0,
    count: items.length,
    items,
  };
}
