/**
 * Read-only leaderboard queries. Everything heavy (ranks, rank changes) is
 * precomputed by the daily pipeline, so these are simple indexed reads.
 * Response caching is done by the CDN via Cache-Control (see routes).
 */
import type { LeaderboardEntry } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getMetaValues } from './personDb';

const MOVERS_LIMIT = 5;

export interface CountryItem {
  iso2: string;
  name: string;
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

export type LeaderboardResponse = CountryLeaderboardResponse | GlobalLeaderboardResponse;

async function getHeaderMeta(): Promise<{ generatedAt: string; totalRanked: number }> {
  const meta = await getMetaValues(['generatedAt', 'totalRanked']);
  const totalRanked = Number(meta.totalRanked);
  return {
    generatedAt: meta.generatedAt ?? new Date().toISOString(),
    totalRanked: Number.isFinite(totalRanked) && totalRanked > 0 ? Math.floor(totalRanked) : 0,
  };
}

function toGlobalItem(e: LeaderboardEntry, rankChange: number | null = e.rankChange1d): GlobalLeaderboardItem {
  return {
    rank: e.globalRank,
    personId: e.personId,
    name: e.name,
    countryName: e.countryName ?? undefined,
    countryIso2: e.countryIso2 ?? undefined,
    wps: e.wps,
    rankChange,
  };
}

export async function getCountriesList(): Promise<CountryItem[]> {
  return prisma.country.findMany({
    select: { iso2: true, name: true },
    orderBy: { name: 'asc' },
  });
}

/** Biggest global rank changes over ~7 days. */
async function getWeeklyMovers(): Promise<{
  biggestMoversUp: GlobalLeaderboardItem[];
  biggestMoversDown: GlobalLeaderboardItem[];
}> {
  const [up, down] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: { rankChange7d: { gt: 0 } },
      orderBy: [{ rankChange7d: 'desc' }, { globalRank: 'asc' }],
      take: MOVERS_LIMIT,
    }),
    prisma.leaderboardEntry.findMany({
      where: { rankChange7d: { lt: 0 } },
      orderBy: [{ rankChange7d: 'asc' }, { globalRank: 'asc' }],
      take: MOVERS_LIMIT,
    }),
  ]);
  return {
    biggestMoversUp: up.map((e) => toGlobalItem(e, e.rankChange7d)),
    biggestMoversDown: down.map((e) => toGlobalItem(e, e.rankChange7d)),
  };
}

export async function getGlobalLeaderboard(limit = 100): Promise<GlobalLeaderboardResponse | null> {
  const [entries, meta, movers] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      orderBy: [{ globalRank: 'asc' }, { personId: 'asc' }],
      take: Math.max(1, limit),
    }),
    getHeaderMeta(),
    getWeeklyMovers(),
  ]);
  if (!entries.length) return null;

  return {
    scope: 'global',
    generatedAt: meta.generatedAt,
    totalRanked: meta.totalRanked,
    count: entries.length,
    items: entries.map((e) => toGlobalItem(e)),
    ...movers,
    source: 'postgres',
  };
}

export async function getCountryLeaderboard(
  countryIso2: string,
  limit = 100,
): Promise<CountryLeaderboardResponse | null> {
  const iso2 = countryIso2.trim().toUpperCase();
  if (!iso2) return null;

  const [entries, meta] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: { countryIso2: iso2 },
      orderBy: [{ countryRank: 'asc' }, { personId: 'asc' }],
      take: Math.max(1, limit),
    }),
    getHeaderMeta(),
  ]);
  if (!entries.length) return null;

  const items: CountryLeaderboardItem[] = entries.map((e) => ({
    countryRank: e.countryRank ?? 0,
    personId: e.personId,
    name: e.name,
    countryIso2: iso2,
    countryName: e.countryName ?? iso2,
    wps: e.wps,
    globalWpsRank: e.globalRank,
    rankChange: e.rankChange1d,
  }));

  return {
    scope: 'country',
    countryIso2: iso2,
    countryName: items[0].countryName,
    generatedAt: meta.generatedAt,
    totalRanked: meta.totalRanked,
    count: items.length,
    items,
    biggestMoversUp: [],
    biggestMoversDown: [],
    source: 'postgres',
  };
}
