  import { Prisma } from '@prisma/client';
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

type SnapshotDatePair = {
  latestSnapshotDate: Date;
  comparisonSnapshotDate: Date;
};

type SnapshotDatePairCacheEntry = {
  value: SnapshotDatePair | null;
  expiresAt: number;
};

type WeeklyMoverRow = {
  personId: string;
  rank: number;
  wps: number;
  rankChange: number;
  name: string;
  countryIso2: string | null;
  countryName: string | null;
};

  let globalLeaderboardCache = new Map<number, CacheEntry<GlobalLeaderboardResponse>>();
  let countryLeaderboardCache = new Map<string, CacheEntry<CountryLeaderboardResponse>>();
  let dailySnapshotDatePairCache: SnapshotDatePairCacheEntry | null = null;
  let weeklySnapshotDatePairCache: SnapshotDatePairCacheEntry | null = null;

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
  rankChange: number | null;
}

export interface GlobalLeaderboardItem {
  rank: number;
  personId: string;
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
  wps: number;
  rankChange: number | null;
}

export interface CountryLeaderboardResponse {
  scope: 'country';
  countryIso2: string;
  countryName: string;
  generatedAt: string;
  totalRanked: number;
  count: number;
  items: CountryLeaderboardItem[];
  biggestMoversUp: CountryLeaderboardItem[];
  biggestMoversDown: CountryLeaderboardItem[];
  source: string;
}

export interface GlobalLeaderboardResponse {
  scope: 'global';
  generatedAt: string;
  totalRanked?: number;
  count: number;
  items: GlobalLeaderboardItem[];
  biggestMoversUp: GlobalLeaderboardItem[];
  biggestMoversDown: GlobalLeaderboardItem[];
  source: string;
}

export type LeaderboardResponse = CountryLeaderboardResponse | GlobalLeaderboardResponse;

function getBiggestMovers<T extends { rankChange: number | null }>(
  items: T[],
  limit: number = 10,
): { biggestMoversUp: T[]; biggestMoversDown: T[] } {
  const withRankChange = items.filter(
    (item): item is T & { rankChange: number } =>
      typeof item.rankChange === 'number' && !Number.isNaN(item.rankChange) && item.rankChange !== 0,
  );

  return {
    biggestMoversUp: [...withRankChange]
      .filter((item) => item.rankChange > 0)
      .sort((a, b) => b.rankChange - a.rankChange)
      .slice(0, limit),
    biggestMoversDown: [...withRankChange]
      .filter((item) => item.rankChange < 0)
      .sort((a, b) => a.rankChange - b.rankChange)
      .slice(0, limit),
  };
}

async function getLatestAndDailyComparisonDates(): Promise<SnapshotDatePair | null> {
  if (dailySnapshotDatePairCache && dailySnapshotDatePairCache.expiresAt > Date.now()) {
    return dailySnapshotDatePairCache.value;
  }

  const snapshotDates = await prisma.historySnapshot.findMany({
    distinct: ['snapshotDate'],
    select: {
      snapshotDate: true,
    },
    orderBy: {
      snapshotDate: 'desc',
    },
    take: 2,
  });

  const value =
    snapshotDates.length < 2
      ? null
      : {
      latestSnapshotDate: snapshotDates[0].snapshotDate,
      comparisonSnapshotDate: snapshotDates[1].snapshotDate,
        };

  dailySnapshotDatePairCache = {
    value,
    expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
  };

  return value;
}

async function getLatestAndWeeklyComparisonDates(): Promise<SnapshotDatePair | null> {
  if (weeklySnapshotDatePairCache && weeklySnapshotDatePairCache.expiresAt > Date.now()) {
    return weeklySnapshotDatePairCache.value;
  }

  const latestSnapshot = await prisma.historySnapshot.findFirst({
    select: {
      snapshotDate: true,
    },
    orderBy: {
      snapshotDate: 'desc',
    },
  });

  if (!latestSnapshot) {
    weeklySnapshotDatePairCache = {
      value: null,
      expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
    };
    return null;
  }

  const thresholdDate = new Date(latestSnapshot.snapshotDate);
  thresholdDate.setUTCDate(thresholdDate.getUTCDate() - 7);

  const comparisonSnapshot = await prisma.historySnapshot.findFirst({
    where: {
      snapshotDate: {
        lte: thresholdDate,
      },
    },
    select: {
      snapshotDate: true,
    },
    orderBy: {
      snapshotDate: 'desc',
    },
  });

  const value = !comparisonSnapshot
    ? null
    : {
      latestSnapshotDate: latestSnapshot.snapshotDate,
      comparisonSnapshotDate: comparisonSnapshot.snapshotDate,
      };

  weeklySnapshotDatePairCache = {
    value,
    expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
  };

  return value;
}

async function getRankChangeMapForDates(
  personIds: string[],
  datePair: SnapshotDatePair | null,
): Promise<Map<string, number | null>> {
  const rankChanges = new Map<string, number | null>();
  for (const personId of personIds) {
    rankChanges.set(personId, null);
  }

  if (personIds.length === 0) {
    return rankChanges;
  }

  if (!datePair) {
    return rankChanges;
  }

  const [currentRows, previousRows] = await Promise.all([
    prisma.historySnapshot.findMany({
      where: {
        snapshotDate: datePair.latestSnapshotDate,
        personId: {
          in: personIds,
        },
      },
      select: {
        personId: true,
        globalRank: true,
      },
    }),
    prisma.historySnapshot.findMany({
      where: {
        snapshotDate: datePair.comparisonSnapshotDate,
        personId: {
          in: personIds,
        },
      },
      select: {
        personId: true,
        globalRank: true,
      },
    }),
  ]);

  const currentRanks = new Map(currentRows.map((row) => [row.personId, row.globalRank]));
  const previousRanks = new Map(previousRows.map((row) => [row.personId, row.globalRank]));

  for (const personId of personIds) {
    const currentRank = currentRanks.get(personId);
    const previousRank = previousRanks.get(personId);
    rankChanges.set(
      personId,
      currentRank == null || previousRank == null ? null : previousRank - currentRank,
    );
  }

  return rankChanges;
}

async function getGlobalWeeklyMovers(): Promise<{
  biggestMoversUp: GlobalLeaderboardItem[];
  biggestMoversDown: GlobalLeaderboardItem[];
}> {
  const datePair = await getLatestAndWeeklyComparisonDates();
  if (!datePair) {
    return {
      biggestMoversUp: [],
      biggestMoversDown: [],
    };
  }

  const latestDate = datePair.latestSnapshotDate.toISOString().slice(0, 10);
  const comparisonDate = datePair.comparisonSnapshotDate.toISOString().slice(0, 10);
  const query = Prisma.sql`
    WITH movers AS (
      SELECT
        current.person_id AS "personId",
        current.global_rank AS rank,
        current.wps AS wps,
        previous.global_rank - current.global_rank AS "rankChange",
        entry.name AS name,
        entry.country_iso2 AS "countryIso2",
        entry.country_name AS "countryName"
      FROM history_snapshots current
      JOIN history_snapshots previous
        ON previous.person_id = current.person_id
       AND previous.snapshot_date = ${comparisonDate}::date
      JOIN leaderboard_entries entry
        ON entry.person_id = current.person_id
      WHERE current.snapshot_date = ${latestDate}::date
        AND previous.global_rank <> current.global_rank
    ),
    up_rows AS (
      SELECT * FROM movers
      WHERE "rankChange" > 0
      ORDER BY "rankChange" DESC, rank ASC
      LIMIT 5
    ),
    down_rows AS (
      SELECT * FROM movers
      WHERE "rankChange" < 0
      ORDER BY "rankChange" ASC, rank ASC
      LIMIT 5
    )
    SELECT 'up' AS direction, * FROM up_rows
    UNION ALL
    SELECT 'down' AS direction, * FROM down_rows
  `;

  const rows = await prisma.$queryRaw<(WeeklyMoverRow & { direction: 'up' | 'down' })[]>(query);
  if (!rows.length) {
    return {
      biggestMoversUp: [],
      biggestMoversDown: [],
    };
  }

  const biggestMoversUp: GlobalLeaderboardItem[] = [];
  const biggestMoversDown: GlobalLeaderboardItem[] = [];

  for (const row of rows) {
    const item: GlobalLeaderboardItem = {
      rank: row.rank,
      personId: row.personId,
      name: row.name,
      countryId: undefined,
      countryIso2: row.countryIso2 ?? undefined,
      countryName: row.countryName ?? undefined,
      wps: row.wps,
      rankChange: row.rankChange,
    };

    if (row.direction === 'up') {
      biggestMoversUp.push(item);
    } else {
      biggestMoversDown.push(item);
    }
  }

  return { biggestMoversUp, biggestMoversDown };
}

  /**
   * Rebuilds the leaderboard snapshot table using SQL window functions.
   * Heavy joins and ranking are moved out of the HTTP request path.
   * Uses separate direct calls (no interactive transaction) to avoid Prisma's
   * 5s transaction timeout on large datasets (~275k+ rows).
   */
  export async function rebuildLeaderboardSnapshot(): Promise<void> {
    const generatedAt = new Date().toISOString();

    await prisma.leaderboardEntry.deleteMany();

    await prisma.$executeRawUnsafe(
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

    const totalRanked = await prisma.leaderboardEntry.count();

    await prisma.meta.upsert({
      where: { key: 'generatedAt' },
      create: { key: 'generatedAt', value: generatedAt },
      update: { value: generatedAt },
    });
    await prisma.meta.upsert({
      where: { key: 'totalRanked' },
      create: { key: 'totalRanked', value: String(totalRanked) },
      update: { value: String(totalRanked) },
    });

    globalLeaderboardCache.clear();
    countryLeaderboardCache.clear();
    countriesListCache = null;
    dailySnapshotDatePairCache = null;
    weeklySnapshotDatePairCache = null;
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
    const [entries, totalRankedRaw, generatedAtMeta, dailyDatePair, weeklyMovers] = await Promise.all([
      prisma.leaderboardEntry.findMany({
        orderBy: { globalRank: 'asc' },
        take: effectiveLimit,
      }),
      getMetaValue('totalRanked'),
      getMetaValue('generatedAt'),
      getLatestAndDailyComparisonDates(),
      getGlobalWeeklyMovers(),
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
    const rankChangeByPerson = await getRankChangeMapForDates(
      entries.map((entry) => entry.personId),
      dailyDatePair,
    );

    const items: GlobalLeaderboardItem[] = entries.map((e) => ({
      rank: e.globalRank,
      personId: e.personId,
      name: e.name,
      countryId: undefined,
      countryName: e.countryName ?? undefined,
      countryIso2: e.countryIso2 ?? undefined,
      wps: e.wps,
      rankChange: rankChangeByPerson.get(e.personId) ?? null,
    }));
    const response: GlobalLeaderboardResponse = {
      scope: 'global',
      generatedAt: generatedAtMeta ?? new Date().toISOString(),
      totalRanked,
      count: items.length,
      items,
      biggestMoversUp: weeklyMovers.biggestMoversUp,
      biggestMoversDown: weeklyMovers.biggestMoversDown,
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
    const [entries, totalRankedRaw, generatedAtMeta, dailyDatePair] = await Promise.all([
      prisma.leaderboardEntry.findMany({
        where: { countryIso2: iso2Upper },
        orderBy: { countryRank: 'asc' },
        take: effectiveLimit,
      }),
      getMetaValue('totalRanked'),
      getMetaValue('generatedAt'),
      getLatestAndDailyComparisonDates(),
    ]);
    const durationMs = Date.now() - startedAt;

    if (!entries.length) return null;

    const totalRanked = parseTotalRanked(totalRankedRaw);
    const rankChangeByPerson = await getRankChangeMapForDates(
      entries.map((entry) => entry.personId),
      dailyDatePair,
    );

    const items: CountryLeaderboardItem[] = entries.map((e) => ({
      countryRank: e.countryRank ?? 0,
      personId: e.personId,
      name: e.name,
      countryIso2: iso2Upper,
      countryName: e.countryName ?? iso2Upper,
      wps: e.wps,
      globalWpsRank: e.globalRank,
      rankChange: rankChangeByPerson.get(e.personId) ?? null,
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
      biggestMoversUp: [],
      biggestMoversDown: [],
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
