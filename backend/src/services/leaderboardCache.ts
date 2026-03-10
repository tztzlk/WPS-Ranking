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
    const rows = await prisma.leaderboardEntry.findMany({
      distinct: ['countryIso2'],
      where: {
        countryIso2: {
          not: null,
        },
      },
      select: {
        countryIso2: true,
        countryName: true,
      },
    });
    const durationMs = Date.now() - startedAt;
    console.log('[db-countries] query completed', {
      groups: rows.length,
      durationMs,
    });

    const list: CountryItem[] = [];
    for (const row of rows) {
      if (!row.countryIso2 || !row.countryName) continue;
      const iso2 = row.countryIso2.toUpperCase();
      list.push({ iso2, name: row.countryName });
    }

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

  /**
   * Rebuilds the leaderboard snapshot table using SQL window functions.
   * Heavy joins and ranking are moved out of the HTTP request path.
   */
  export async function rebuildLeaderboardSnapshot(): Promise<void> {
    const generatedAt = new Date().toISOString();

    await prisma.$transaction(async (tx) => {
      await tx.leaderboardEntry.deleteMany();

      await tx.$executeRawUnsafe(
        `
        INSERT INTO "leaderboard_entries" (
          "person_id",
          "name",
          "country_iso2",
          "country_name",
          "wps",
          "global_rank",
          "country_rank",
          "generated_at"
        )
        SELECT
          p.id,
          p.name,
          p.country_iso2,
          p.country_name,
          s.score,
          RANK() OVER (ORDER BY s.score DESC) AS global_rank,
          RANK() OVER (
            PARTITION BY p.country_iso2
            ORDER BY s.score DESC
          ) AS country_rank,
          $1::timestamptz AS generated_at
        FROM "persons" p
        JOIN "wps_scores" s ON s.person_id = p.id
        WHERE s.score IS NOT NULL
        `,
        generatedAt,
      );
    });
  }

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
    const [entries, totalRankedRaw, generatedAtMeta] = await Promise.all([
      prisma.leaderboardEntry.findMany({
        orderBy: { globalRank: 'asc' },
        take: effectiveLimit,
      }),
      getMetaValue('totalRanked'),
      getMetaValue('generatedAt'),
    ]);
    const durationMs = Date.now() - startedAt;

    if (!entries.length) {
      console.warn('[db-leaderboard-global] empty result', {
        limit: effectiveLimit,
        durationMs,
      });
      return null;
    }

    const totalRanked = parseTotalRanked(totalRankedRaw);

    const items = entries.map((e) => ({
      rank: e.globalRank,
      personId: e.personId,
      name: e.name,
      countryId: undefined,
      countryName: e.countryName ?? undefined,
      countryIso2: e.countryIso2 ?? undefined,
      wps: e.wps,
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

    const startedAt = Date.now();
    const [entry, countryTotal] = await Promise.all([
      prisma.leaderboardEntry.findUnique({
        where: { personId: personId.trim() },
      }),
      prisma.leaderboardEntry.count({
        where: { countryIso2: iso2Upper },
      }),
    ]);
    const durationMs = Date.now() - startedAt;

    if (!entry || !entry.countryIso2 || entry.countryIso2.toUpperCase() !== iso2Upper) {
      return null;
    }

    if (countryTotal === 0) return null;

    console.log('[db-country-rank] completed', {
      personId,
      countryIso2: iso2Upper,
      durationMs,
    });

    return { countryRank: entry.countryRank ?? 0, countryTotal };
  }

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
    const [entries, totalRankedRaw, generatedAtMeta] = await Promise.all([
      prisma.leaderboardEntry.findMany({
        where: { countryIso2: iso2Upper },
        orderBy: { countryRank: 'asc' },
        take: effectiveLimit,
      }),
      getMetaValue('totalRanked'),
      getMetaValue('generatedAt'),
    ]);
    const durationMs = Date.now() - startedAt;

    if (!entries.length) return null;

    const totalRanked = parseTotalRanked(totalRankedRaw);

    const items: CountryLeaderboardItem[] = entries.map((e) => ({
      countryRank: e.countryRank ?? 0,
      personId: e.personId,
      name: e.name,
      countryIso2: iso2Upper,
      countryName: e.countryName ?? iso2Upper,
      wps: e.wps,
      globalWpsRank: e.globalRank,
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
