import fs from 'fs';
import path from 'path';
import { getMetaValue } from './personDb';

const CACHE_DIR = process.env.CACHE_DIR
  ? path.resolve(process.env.CACHE_DIR)
  : path.join(process.cwd(), 'cache');

const LEADERBOARD_TOP100_PATH = path.join(CACHE_DIR, 'leaderboard.top100.json');
const PERSONS_INDEX_PATH = path.join(CACHE_DIR, 'persons.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');
const WPS_RANK_INDEX_PATH = path.join(CACHE_DIR, 'wpsRank.index.json');

interface PersonsIndexEntry {
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
}

type PersonsIndex = Record<string, PersonsIndexEntry>;

interface WpsIndexEntry {
  wps: number;
}

type WpsIndex = Record<string, WpsIndexEntry>;

interface WpsRankIndex {
  generatedAt: string;
  totalRanked: number;
  ranks: Record<string, number>;
}

interface LeaderboardItemCache {
  rank: number;
  personId: string;
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
  wps: number;
}

interface LeaderboardResultCache {
  source: string;
  generatedAt: string;
  count: number;
  items: LeaderboardItemCache[];
}

let personsIndexCache: PersonsIndex | null = null;
let wpsIndexCache: WpsIndex | null = null;
let wpsRankIndexCache: WpsRankIndex | null = null;
let leaderboardTop100Cache: LeaderboardResultCache | null = null;

async function loadJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to load JSON cache at ${filePath}:`, error);
    return null;
  }
}

async function getPersonsIndex(): Promise<PersonsIndex | null> {
  if (!personsIndexCache) {
    personsIndexCache = (await loadJsonIfExists<PersonsIndex>(PERSONS_INDEX_PATH)) ?? null;
  }
  return personsIndexCache;
}

async function getWpsIndex(): Promise<WpsIndex | null> {
  if (!wpsIndexCache) {
    wpsIndexCache = (await loadJsonIfExists<WpsIndex>(WPS_INDEX_PATH)) ?? null;
  }
  return wpsIndexCache;
}

async function getWpsRankIndex(): Promise<WpsRankIndex | null> {
  if (!wpsRankIndexCache) {
    wpsRankIndexCache = (await loadJsonIfExists<WpsRankIndex>(WPS_RANK_INDEX_PATH)) ?? null;
  }
  return wpsRankIndexCache;
}

async function getLeaderboardTop100(): Promise<LeaderboardResultCache | null> {
  if (!leaderboardTop100Cache) {
    leaderboardTop100Cache =
      (await loadJsonIfExists<LeaderboardResultCache>(LEADERBOARD_TOP100_PATH)) ?? null;
  }
  return leaderboardTop100Cache;
}

export interface CountryItem {
  iso2: string;
  name: string;
}

const COUNTRIES_CACHE_TTL_MS = 10 * 60 * 1000;
let countriesListCache: CountryItem[] | null = null;
let countriesCacheAt = 0;

function parseTotalRanked(value: string | null): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/**
 * Returns all distinct countries from cache, sorted by name.
 */
export async function getCountriesList(): Promise<CountryItem[]> {
  if (countriesListCache && Date.now() - countriesCacheAt < COUNTRIES_CACHE_TTL_MS) {
    return countriesListCache;
  }

  const personsIndex = await getPersonsIndex();
  if (!personsIndex) {
    countriesListCache = [];
    countriesCacheAt = Date.now();
    return countriesListCache;
  }

  const map = new Map<string, CountryItem>();
  for (const entry of Object.values(personsIndex)) {
    if (!entry.countryIso2 || !entry.countryName) continue;
    const iso2 = entry.countryIso2.toUpperCase();
    if (!map.has(iso2)) {
      map.set(iso2, { iso2, name: entry.countryName });
    }
  }

  const list = Array.from(map.values());
  list.sort((a, b) => a.name.localeCompare(b.name));

  countriesListCache = list;
  countriesCacheAt = Date.now();
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

const globalOrderBy = [
  { wpsScore: { score: 'desc' as const } },
  { wpsRank: { rank: 'asc' as const } },
  { id: 'asc' as const },
];

/**
 * Returns global top-N from cache, ordered by WPS score desc, rank asc, id asc.
 */
export async function getGlobalLeaderboard(limit: number = 100): Promise<GlobalLeaderboardResponse | null> {
  const [leaderboard, totalRankedRaw, generatedAtMeta] = await Promise.all([
    getLeaderboardTop100(),
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
  ]);

  if (!leaderboard || !leaderboard.items.length) {
    return null;
  }

  const totalRanked = parseTotalRanked(totalRankedRaw);
  const effectiveLimit = Math.max(1, Math.min(limit, leaderboard.items.length));

  const items = leaderboard.items.slice(0, effectiveLimit).map((p) => ({
    rank: p.rank,
    personId: p.personId,
    name: p.name,
    countryId: p.countryId ?? undefined,
    countryName: p.countryName ?? undefined,
    countryIso2: p.countryIso2 ?? undefined,
    wps: p.wps,
  }));

  return {
    scope: 'global',
    generatedAt: generatedAtMeta ?? leaderboard.generatedAt ?? new Date().toISOString(),
    totalRanked,
    count: items.length,
    items,
    source: leaderboard.source,
  };
}

/**
 * Returns country rank and total for a person from cache.
 */
export async function getCountryRank(
  personId: string,
  countryIso2: string,
): Promise<{ countryRank: number; countryTotal: number } | null> {
  const iso2Upper = countryIso2?.trim()?.toUpperCase();
  if (!iso2Upper) return null;

  const [personsIndex, wpsIndex] = await Promise.all([getPersonsIndex(), getWpsIndex()]);
  if (!personsIndex || !wpsIndex) return null;

  const id = personId.trim().toUpperCase();
  const person = personsIndex[id];
  if (!person || !person.countryIso2 || person.countryIso2.toUpperCase() !== iso2Upper) {
    return null;
  }

  const score = wpsIndex[id]?.wps;
  if (score == null) return null;

  let countryTotal = 0;
  let countHigher = 0;

  for (const [otherId, info] of Object.entries(personsIndex)) {
    if (!info.countryIso2 || info.countryIso2.toUpperCase() !== iso2Upper) continue;
    const otherScore = wpsIndex[otherId]?.wps;
    if (otherScore == null) continue;
    countryTotal += 1;
    if (otherScore > score) countHigher += 1;
  }

  if (countryTotal === 0) return null;

  return { countryRank: countHigher + 1, countryTotal };
}

const countryOrderBy = [
  { wpsScore: { score: 'desc' as const } },
  { wpsRank: { rank: 'asc' as const } },
  { id: 'asc' as const },
];

/**
 * Returns top N cubers for a country by WPS from cache.
 */
export async function getCountryLeaderboard(
  countryIso2: string,
  limit: number = 100,
): Promise<CountryLeaderboardResponse | null> {
  const iso2Upper = countryIso2.trim().toUpperCase();
  if (!iso2Upper) return null;

  const [personsIndex, wpsIndex, wpsRankIndex, totalRankedRaw, generatedAtMeta] = await Promise.all([
    getPersonsIndex(),
    getWpsIndex(),
    getWpsRankIndex(),
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
  ]);

  if (!personsIndex || !wpsIndex || !wpsRankIndex) return null;

  const entries: CountryLeaderboardItem[] = [];

  for (const [id, info] of Object.entries(personsIndex)) {
    if (!info.countryIso2 || info.countryIso2.toUpperCase() !== iso2Upper) continue;
    const wpsScore = wpsIndex[id]?.wps;
    if (wpsScore == null) continue;
    const globalRank = wpsRankIndex.ranks[id] ?? 0;

    entries.push({
      countryRank: 0,
      personId: id,
      name: info.name,
      countryIso2: iso2Upper,
      countryName: info.countryName ?? iso2Upper,
      wps: wpsScore,
      globalWpsRank: globalRank,
    });
  }

  if (!entries.length) return null;

  entries.sort((a, b) => {
    const scoreDiff = b.wps - a.wps;
    if (scoreDiff !== 0) return scoreDiff;

    const rankA = a.globalWpsRank || Number.POSITIVE_INFINITY;
    const rankB = b.globalWpsRank || Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;

    return a.personId.localeCompare(b.personId);
  });

  const effectiveLimit = Math.max(1, Math.min(limit, entries.length));
  const limited = entries.slice(0, effectiveLimit);

  limited.forEach((entry, index) => {
    entry.countryRank = index + 1;
  });

  const countryName = limited[0].countryName;
  const totalRanked = parseTotalRanked(totalRankedRaw);

  return {
    scope: 'country',
    countryIso2: iso2Upper,
    countryName,
    generatedAt: generatedAtMeta ?? new Date().toISOString(),
    totalRanked,
    count: limited.length,
    items: limited,
  };
}
