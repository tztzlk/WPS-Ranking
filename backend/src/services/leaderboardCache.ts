import {
  getWpsRankIndex,
  getCountriesIndex,
  getGlobalLeaderboardCache,
} from './indexStore';
import { getPersonsByCountry } from './personLookup';

export interface CountryItem {
  iso2: string;
  name: string;
}

let countriesListCache: CountryItem[] | null = null;

/**
 * Returns all countries from countries.index.json, sorted by name.
 */
export function getCountriesList(): CountryItem[] | null {
  if (countriesListCache) return countriesListCache;

  const ci = getCountriesIndex();
  if (!ci?.countries || Object.keys(ci.countries).length === 0) return null;

  const list: CountryItem[] = Object.values(ci.countries).map((c) => ({
    iso2: c.iso2,
    name: c.name,
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
 * Returns global top-N from in-memory leaderboard cache.
 */
export function getGlobalLeaderboard(limit: number = 100): GlobalLeaderboardResponse | null {
  const gl = getGlobalLeaderboardCache();
  if (!gl) return null;
  const items = gl.items.slice(0, limit);
  return {
    scope: 'global',
    generatedAt: gl.generatedAt,
    count: items.length,
    items,
    source: gl.source,
  };
}

/**
 * Returns country rank and total for a person. Scans Persons.tsv (cached per country).
 */
export async function getCountryRank(
  personId: string,
  countryIso2: string
): Promise<{ countryRank: number; countryTotal: number } | null> {
  const iso2Upper = countryIso2?.trim()?.toUpperCase();
  if (!iso2Upper) return null;

  const sorted = await getPersonsByCountry(iso2Upper);
  if (!sorted.length) return null;

  const index = sorted.findIndex((c) => c.personId === personId);
  if (index < 0) return null;
  return { countryRank: index + 1, countryTotal: sorted.length };
}

/**
 * Returns top N cubers for a country by WPS. Scans Persons.tsv (cached per country).
 */
export async function getCountryLeaderboard(
  countryIso2: string,
  limit: number = 100
): Promise<CountryLeaderboardResponse | null> {
  const wpsRankIndex = getWpsRankIndex();
  if (!wpsRankIndex) return null;

  const iso2Upper = countryIso2.trim().toUpperCase();
  if (!iso2Upper) return null;

  const sorted = await getPersonsByCountry(iso2Upper);
  if (!sorted.length) return null;

  const top = sorted.slice(0, limit);
  const ranks = wpsRankIndex.ranks ?? {};
  const countryName = top[0]?.countryName ?? iso2Upper;

  const items: CountryLeaderboardItem[] = top.map((entry, index) => ({
    countryRank: index + 1,
    personId: entry.personId,
    name: entry.name,
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
