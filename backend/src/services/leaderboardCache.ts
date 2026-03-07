import { getMetaValue } from './personDb';
import { prisma } from '../lib/prisma';

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
 * Returns all distinct countries from persons table, sorted by name.
 */
export async function getCountriesList(): Promise<CountryItem[]> {
  if (countriesListCache && Date.now() - countriesCacheAt < COUNTRIES_CACHE_TTL_MS) {
    return countriesListCache;
  }

  const rows = await prisma.person.findMany({
    where: { countryIso2: { not: null }, countryName: { not: null } },
    select: { countryIso2: true, countryName: true },
    distinct: ['countryIso2'],
  });

  const list: CountryItem[] = rows
    .filter((r): r is typeof r & { countryIso2: string; countryName: string } => Boolean(r.countryIso2 && r.countryName))
    .map((r) => ({ iso2: r.countryIso2, name: r.countryName }));
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
 * Returns global top-N from PostgreSQL, ordered by WPS score desc, rank asc, id asc.
 */
export async function getGlobalLeaderboard(limit: number = 100): Promise<GlobalLeaderboardResponse | null> {
  const [persons, totalRankedRaw, generatedAt] = await Promise.all([
    prisma.person.findMany({
      where: { wpsScore: { isNot: null } },
      orderBy: globalOrderBy,
      take: limit,
      select: {
        id: true,
        name: true,
        countryId: true,
        countryName: true,
        countryIso2: true,
        wpsScore: { select: { score: true } },
        wpsRank: { select: { rank: true } },
      },
    }),
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
  ]);

  const totalRanked = parseTotalRanked(totalRankedRaw);
  const items = persons.map((p, index) => ({
    rank: p.wpsRank?.rank ?? index + 1,
    personId: p.id,
    name: p.name,
    countryId: p.countryId ?? undefined,
    countryName: p.countryName ?? undefined,
    countryIso2: p.countryIso2 ?? undefined,
    wps: p.wpsScore?.score ?? 0,
  }));

  return {
    scope: 'global',
    generatedAt: generatedAt ?? new Date().toISOString(),
    totalRanked,
    count: items.length,
    items,
  };
}

/**
 * Returns country rank and total for a person (from PostgreSQL).
 * Uses count queries instead of loading the full country list.
 */
export async function getCountryRank(
  personId: string,
  countryIso2: string,
): Promise<{ countryRank: number; countryTotal: number } | null> {
  const iso2Upper = countryIso2?.trim()?.toUpperCase();
  if (!iso2Upper) return null;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      countryIso2: true,
      wpsScore: { select: { score: true } },
    },
  });

  if (!person || person.countryIso2 !== iso2Upper || person.wpsScore == null) return null;

  const score = person.wpsScore.score;

  const [countHigher, countryTotal] = await Promise.all([
    prisma.person.count({
      where: {
        countryIso2: iso2Upper,
        wpsScore: { score: { gt: score } },
      },
    }),
    prisma.person.count({
      where: {
        countryIso2: iso2Upper,
        wpsScore: { isNot: null },
      },
    }),
  ]);

  return { countryRank: countHigher + 1, countryTotal };
}

const countryOrderBy = [
  { wpsScore: { score: 'desc' as const } },
  { wpsRank: { rank: 'asc' as const } },
  { id: 'asc' as const },
];

/**
 * Returns top N cubers for a country by WPS from PostgreSQL.
 */
export async function getCountryLeaderboard(
  countryIso2: string,
  limit: number = 100,
): Promise<CountryLeaderboardResponse | null> {
  const iso2Upper = countryIso2.trim().toUpperCase();
  if (!iso2Upper) return null;

  const [persons, totalRankedRaw, generatedAt] = await Promise.all([
    prisma.person.findMany({
      where: {
        countryIso2: iso2Upper,
        wpsScore: { isNot: null },
      },
      orderBy: countryOrderBy,
      take: limit,
      select: {
        id: true,
        name: true,
        countryName: true,
        wpsScore: { select: { score: true } },
        wpsRank: { select: { rank: true } },
      },
    }),
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
  ]);

  if (!persons.length) return null;

  const countryName = persons[0].countryName ?? iso2Upper;
  const totalRanked = parseTotalRanked(totalRankedRaw);

  const items: CountryLeaderboardItem[] = persons.map((entry, index) => ({
    countryRank: index + 1,
    personId: entry.id,
    name: entry.name,
    countryIso2: iso2Upper,
    countryName,
    wps: entry.wpsScore?.score ?? 0,
    globalWpsRank: entry.wpsRank?.rank ?? 0,
  }));

  return {
    scope: 'country',
    countryIso2: iso2Upper,
    countryName,
    generatedAt: generatedAt ?? new Date().toISOString(),
    totalRanked,
    count: items.length,
    items,
  };
}
