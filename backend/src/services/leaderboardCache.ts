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
 * Returns all distinct countries from cache, sorted by name.
 */
export async function getCountriesList(): Promise<CountryItem[]> {
  if (countriesListCache && Date.now() - countriesCacheAt < COUNTRIES_CACHE_TTL_MS) {
    return countriesListCache;
  }

  const groups = await prisma.person.groupBy({
    by: ['countryIso2', 'countryName'],
  });

  const map = new Map<string, CountryItem>();
  for (const g of groups) {
    if (!g.countryIso2 || !g.countryName) continue;
    const iso2 = g.countryIso2.toUpperCase();
    if (!map.has(iso2)) {
      map.set(iso2, { iso2, name: g.countryName });
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
   source: string;
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
  source: string;
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
  const effectiveLimit = Math.max(1, limit);

  const [persons, totalRankedRaw, generatedAtMeta] = await Promise.all([
    prisma.person.findMany({
      where: {
        wpsScore: {
          isNot: null,
        },
      },
      include: {
        wpsScore: true,
        wpsRank: true,
      },
      orderBy: globalOrderBy,
      take: effectiveLimit,
    }),
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
  ]);

  if (!persons.length) {
    return null;
  }

  const totalRanked = parseTotalRanked(totalRankedRaw);

  const items = persons.map((p) => ({
    rank: p.wpsRank?.rank ?? 0,
    personId: p.id,
    name: p.name,
    countryId: p.countryId ?? undefined,
    countryName: p.countryName ?? undefined,
    countryIso2: p.countryIso2 ?? undefined,
    wps: p.wpsScore?.score ?? 0,
  }));

  return {
    scope: 'global',
    generatedAt: generatedAtMeta ?? new Date().toISOString(),
    totalRanked,
    count: items.length,
    items,
    source: 'postgres',
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

  const id = personId.trim().toUpperCase();

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      wpsScore: true,
    },
  });

  if (
    !person ||
    !person.countryIso2 ||
    person.countryIso2.toUpperCase() !== iso2Upper ||
    !person.wpsScore
  ) {
    return null;
  }

  const score = person.wpsScore.score;

  const [countryTotal, countHigher] = await Promise.all([
    prisma.person.count({
      where: {
        countryIso2: iso2Upper,
        wpsScore: {
          isNot: null,
        },
      },
    }),
    prisma.person.count({
      where: {
        countryIso2: iso2Upper,
        wpsScore: {
          score: {
            gt: score,
          },
        },
      },
    }),
  ]);

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

  const [persons, totalRankedRaw, generatedAtMeta] = await Promise.all([
    prisma.person.findMany({
      where: {
        countryIso2: iso2Upper,
        wpsScore: {
          isNot: null,
        },
      },
      include: {
        wpsScore: true,
        wpsRank: true,
      },
      orderBy: countryOrderBy,
    }),
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
  ]);

  if (!persons.length) return null;

  const totalRanked = parseTotalRanked(totalRankedRaw);

  const effectiveLimit = Math.max(1, Math.min(limit, persons.length));
  const limited = persons.slice(0, effectiveLimit);

  const items: CountryLeaderboardItem[] = limited.map((p, index) => ({
    countryRank: index + 1,
    personId: p.id,
    name: p.name,
    countryIso2: iso2Upper,
    countryName: p.countryName ?? iso2Upper,
    wps: p.wpsScore?.score ?? 0,
    globalWpsRank: p.wpsRank?.rank ?? 0,
  }));

  const countryName = items[0].countryName;

  return {
    scope: 'country',
    countryIso2: iso2Upper,
    countryName,
    generatedAt: generatedAtMeta ?? new Date().toISOString(),
    totalRanked,
    count: items.length,
    items,
    source: 'postgres',
  };
}
