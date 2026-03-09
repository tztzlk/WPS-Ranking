import { getMetaValue } from './personDb';
import { prisma } from '../lib/prisma';

export interface CountryItem {
  iso2: string;
  name: string;
}

const COUNTRIES_CACHE_TTL_MS = 10 * 60 * 1000;
const LEADERBOARD_CACHE_TTL_MS = 60 * 1000;

let countriesListCache: CountryItem[] | null = null;
let countriesCacheAt = 0;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

let globalLeaderboardCache = new Map<number, CacheEntry<GlobalLeaderboardResponse>>();
let countryLeaderboardCache = new Map<string, CacheEntry<CountryLeaderboardResponse>>();

function getCachedGlobalLeaderboard(limit: number): GlobalLeaderboardResponse | null {
  const entry = globalLeaderboardCache.get(limit);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    globalLeaderboardCache.delete(limit);
    return null;
  }
  return entry.value;
}

function setCachedGlobalLeaderboard(limit: number, value: GlobalLeaderboardResponse): void {
  globalLeaderboardCache.set(limit, {
    value,
    expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
  });
}

function getCachedCountryLeaderboard(key: string): CountryLeaderboardResponse | null {
  const entry = countryLeaderboardCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    countryLeaderboardCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedCountryLeaderboard(key: string, value: CountryLeaderboardResponse): void {
  countryLeaderboardCache.set(key, {
    value,
    expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
  });
}

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
    console.log('[db-countries] cache hit', {
      count: countriesListCache.length,
      ageMs: Date.now() - countriesCacheAt,
    });
    return countriesListCache;
  }

  const startedAt = Date.now();
  const groups = await prisma.person.groupBy({
    by: ['countryIso2', 'countryName'],
  });
  const durationMs = Date.now() - startedAt;
  console.log('[db-countries] query completed', {
    groups: groups.length,
    durationMs,
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
 * Returns global top-N, ordered by WPS score desc, rank asc, id asc.
 */
export async function getGlobalLeaderboard(limit: number = 100): Promise<GlobalLeaderboardResponse | null> {
  const effectiveLimit = Math.max(1, limit);
  const cached = getCachedGlobalLeaderboard(effectiveLimit);
  if (cached) {
    console.log('[db-leaderboard-global] cache hit', {
      limit: effectiveLimit,
      count: cached.count,
    });
    return cached;
  }

  const startedAt = Date.now();
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
  const durationMs = Date.now() - startedAt;

  if (!persons.length) {
    console.warn('[db-leaderboard-global] empty result', {
      limit: effectiveLimit,
      durationMs,
    });
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

  const response: GlobalLeaderboardResponse = {
    scope: 'global',
    generatedAt: generatedAtMeta ?? new Date().toISOString(),
    totalRanked,
    count: items.length,
    items,
    source: 'postgres',
  };

  console.log('[db-leaderboard-global] query completed', {
    limit: effectiveLimit,
    durationMs,
    count: response.count,
  });

  setCachedGlobalLeaderboard(effectiveLimit, response);

  return response;
}

/**
 * Returns country rank and total for a person.
 */
export async function getCountryRank(
  personId: string,
  countryIso2: string,
): Promise<{ countryRank: number; countryTotal: number } | null> {
  const iso2Upper = countryIso2?.trim()?.toUpperCase();
  if (!iso2Upper) return null;

  const id = personId.trim().toUpperCase();

  const startedAt = Date.now();
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
  const durationMs = Date.now() - startedAt;

  if (countryTotal === 0) return null;

  console.log('[db-country-rank] completed', {
    personId: id,
    countryIso2: iso2Upper,
    durationMs,
  });

  return { countryRank: countHigher + 1, countryTotal };
}

const countryOrderBy = [
  { wpsScore: { score: 'desc' as const } },
  { wpsRank: { rank: 'asc' as const } },
  { id: 'asc' as const },
];

/**
 * Returns top N cubers for a country by WPS.
 */
export async function getCountryLeaderboard(
  countryIso2: string,
  limit: number = 100,
): Promise<CountryLeaderboardResponse | null> {
  const iso2Upper = countryIso2.trim().toUpperCase();
  if (!iso2Upper) return null;

  const effectiveLimit = Math.max(1, limit);

  const cacheKey = `${iso2Upper}:${effectiveLimit}`;
  const cached = getCachedCountryLeaderboard(cacheKey);
  if (cached) {
    console.log('[db-leaderboard-country] cache hit', {
      countryIso2: iso2Upper,
      limit: effectiveLimit,
      count: cached.count,
    });
    return cached;
  }

  const startedAt = Date.now();
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
      take: effectiveLimit,
    }),
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
  ]);
  const durationMs = Date.now() - startedAt;

  if (!persons.length) return null;

  const totalRanked = parseTotalRanked(totalRankedRaw);

  const items: CountryLeaderboardItem[] = persons.map((p, index) => ({
    countryRank: index + 1,
    personId: p.id,
    name: p.name,
    countryIso2: iso2Upper,
    countryName: p.countryName ?? iso2Upper,
    wps: p.wpsScore?.score ?? 0,
    globalWpsRank: p.wpsRank?.rank ?? 0,
  }));

  const countryName = items[0].countryName;

  const response: CountryLeaderboardResponse = {
    scope: 'country',
    countryIso2: iso2Upper,
    countryName,
    generatedAt: generatedAtMeta ?? new Date().toISOString(),
    totalRanked,
    count: items.length,
    items,
    source: 'postgres',
  };

  console.log('[db-leaderboard-country] query completed', {
    countryIso2: iso2Upper,
    limit: effectiveLimit,
    durationMs,
    count: response.count,
  });

  setCachedCountryLeaderboard(cacheKey, response);

  return response;
}
