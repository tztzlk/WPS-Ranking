import type { SearchResultItem, ProfileResponse } from '../types';
import { prisma } from '../lib/prisma';

export interface PersonWithScoreRank {
  id: string;
  name: string;
  countryId: string | null;
  countryName: string | null;
  countryIso2: string | null;
  score: number;
  rank: number | null;
}

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

export function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

export async function findPersonById(personId: string): Promise<PersonWithScoreRank | null> {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const row = await prisma.person.findUnique({
    where: { id: normalized },
    include: {
      wpsScore: true,
      wpsRank: true,
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    countryId: row.countryId ?? null,
    countryName: row.countryName ?? null,
    countryIso2: row.countryIso2 ?? null,
    score: row.wpsScore?.score ?? 0,
    rank: row.wpsRank?.rank ?? null,
  };
}

const SEARCH_LIMIT = 20;

export async function searchPersons(
  query: string,
  limit: number = SEARCH_LIMIT,
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  const queryLower = q.toLowerCase();
  const queryUpper = q.toUpperCase();
  const wcaIdExact = isValidWCAId(q) ? queryUpper : null;

  const take = Math.min(Math.max(1, limit), SEARCH_LIMIT);

  const results: SearchResultItem[] = [];

  // Prefer exact WCA ID match first, if applicable.
  const seenIds = new Set<string>();

  if (wcaIdExact) {
    const person = await findPersonById(wcaIdExact);
    if (person) {
      results.push({
        wcaId: person.id,
        name: person.name,
        countryIso2: person.countryIso2,
        wpsScore: person.score,
        wpsRank: person.rank,
      });
      seenIds.add(person.id);
    }
  }

  if (results.length >= take) {
    return results.slice(0, take);
  }

  const remaining = take - results.length;

  const baseWhere = {
    OR: [
      { nameLower: { contains: queryLower } },
      { id: { contains: queryUpper } },
      { countryName: { contains: q, mode: 'insensitive' as const } },
    ],
  } as const;

  const where =
    seenIds.size > 0
      ? {
          ...baseWhere,
          id: { notIn: Array.from(seenIds) },
        }
      : baseWhere;

  const persons = await prisma.person.findMany({
    where,
    include: {
      wpsScore: true,
      wpsRank: true,
    },
    orderBy: [
      { wpsScore: { score: 'desc' } },
      { wpsRank: { rank: 'asc' } },
      { id: 'asc' },
    ],
    take: remaining,
  });

  for (const p of persons) {
    results.push({
      wcaId: p.id,
      name: p.name,
      countryIso2: p.countryIso2 ?? null,
      wpsScore: p.wpsScore?.score ?? 0,
      wpsRank: p.wpsRank?.rank ?? null,
    });
  }

  return results.slice(0, take);
}

export async function getMetaValue(key: string): Promise<string | null> {
  const meta = await prisma.meta.findUnique({
    where: { key },
  });
  return meta?.value ?? null;
}

export function toProfileResponse(
  person: PersonWithScoreRank,
  extra: {
    totalRanked: number;
    countryRank: number | null;
    countryTotal: number | null;
    lastUpdated: string;
  },
): ProfileResponse {
  return {
    wcaId: person.id,
    name: person.name,
    countryName: person.countryName,
    countryIso2: person.countryIso2,
    wpsScore: person.score,
    globalWpsRank: person.rank,
    totalRanked: extra.totalRanked,
    countryRank: extra.countryRank,
    countryTotal: extra.countryTotal,
    lastUpdated: extra.lastUpdated,
  };
}
