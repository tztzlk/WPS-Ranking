import { prisma } from '../lib/prisma';
import type { SearchResultItem, ProfileResponse } from '../types';

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

function toPersonWithScoreRank(row: {
  id: string;
  name: string;
  countryId: string | null;
  countryName: string | null;
  countryIso2: string | null;
  wpsScore: { score: number } | null;
  wpsRank: { rank: number } | null;
}): PersonWithScoreRank {
  return {
    id: row.id,
    name: row.name,
    countryId: row.countryId,
    countryName: row.countryName,
    countryIso2: row.countryIso2,
    score: row.wpsScore?.score ?? 0,
    rank: row.wpsRank?.rank ?? null,
  };
}

export async function findPersonById(personId: string): Promise<PersonWithScoreRank | null> {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const person = await prisma.person.findUnique({
    where: { id: normalized },
    select: {
      id: true,
      name: true,
      countryId: true,
      countryName: true,
      countryIso2: true,
      wpsScore: { select: { score: true } },
      wpsRank: { select: { rank: true } },
    },
  });
  return person ? toPersonWithScoreRank(person) : null;
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

  const orConditions = [
    { nameLower: { contains: queryLower } },
    { id: { contains: queryUpper } },
    { countryName: { contains: q, mode: 'insensitive' as const } },
    ...(wcaIdExact ? [{ id: wcaIdExact }] : []),
  ];

  const persons = await prisma.person.findMany({
    where: { OR: orConditions },
    take,
    orderBy: [
      { wpsScore: { score: 'desc' } },
      { wpsRank: { rank: 'asc' } },
      { id: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      countryIso2: true,
      wpsScore: { select: { score: true } },
      wpsRank: { select: { rank: true } },
    },
  });

  return persons.map((p) => ({
    wcaId: p.id,
    name: p.name,
    countryIso2: p.countryIso2,
    wpsScore: p.wpsScore?.score ?? 0,
    wpsRank: p.wpsRank?.rank ?? null,
  }));
}

export async function getMetaValue(key: string): Promise<string | null> {
  const row = await prisma.meta.findUnique({ where: { key } });
  return row?.value ?? null;
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
