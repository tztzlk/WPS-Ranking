import type { SearchResultItem, ProfileResponse } from '../types';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getAvatarUrls } from './avatars';

export interface PersonWithScoreRank {
  id: string;
  name: string;
  countryId: string | null;
  countryName: string | null;
  countryIso2: string | null;
  score: number;
  rank: number | null;
  countryRank: number | null;
}

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

export function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

/**
 * A WCA ID from a route or query parameter, upper-cased ("2017garr05" → "2017GARR05").
 * Null when it is missing, repeated (`?id=a&id=b` gives an array) or not a WCA ID.
 */
export function parseWcaId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim().toUpperCase();
  return WCA_ID_REGEX.test(id) ? id : null;
}

export async function findPersonById(personId: string): Promise<PersonWithScoreRank | null> {
  const normalized = personId.trim().toUpperCase();
  if (!normalized) return null;

  const row = await prisma.person.findUnique({
    where: { id: normalized },
    include: { ranking: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    countryId: row.countryId,
    countryName: row.countryName,
    countryIso2: row.countryIso2,
    score: row.ranking?.wps ?? 0,
    rank: row.ranking?.globalRank ?? null,
    countryRank: row.ranking?.countryRank ?? null,
  };
}

const SEARCH_LIMIT = 50;

type SearchRow = {
  wcaId: string;
  name: string;
  countryIso2: string | null;
  wpsScore: number | null;
  wpsRank: number | null;
};

/**
 * Exact WCA ID, otherwise name prefix (and ISO2 country for 2-letter queries).
 * Ranked people first, by WPS.
 */
export async function searchPersons(query: string, limit: number = SEARCH_LIMIT): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];
  const take = Math.min(Math.max(1, limit), SEARCH_LIMIT);

  const wcaId = parseWcaId(q);
  if (wcaId) {
    const person = await findPersonById(wcaId);
    if (person) {
      const avatars = await getAvatarUrls([person.id]);
      return [
        {
          avatarUrl: avatars.get(person.id) ?? null,
          wcaId: person.id,
          name: person.name,
          countryIso2: person.countryIso2,
          wpsScore: person.score,
          wpsRank: person.rank,
        },
      ];
    }
  }

  // Matches the start of any word of the name ("garrett" finds "Luke Garrett").
  // LIKE wildcards in user input are escaped; idx_person_name_trgm serves '% q%'.
  const escaped = q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`);
  const prefix = `${escaped}%`;
  const wordPrefix = `% ${escaped}%`;
  const countryFilter =
    q.length === 2 ? Prisma.sql`OR p.country_iso2 = ${q.toUpperCase()}` : Prisma.empty;

  const rows = await prisma.$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT p.id AS "wcaId", p.name, p.country_iso2 AS "countryIso2",
           l.wps AS "wpsScore", l.global_rank AS "wpsRank"
    FROM persons p
    LEFT JOIN leaderboard_entries l ON l.person_id = p.id
    WHERE p.name_lower LIKE ${prefix} OR p.name_lower LIKE ${wordPrefix} ${countryFilter}
    ORDER BY l.wps DESC NULLS LAST, p.id
    LIMIT ${take}
  `);

  const avatars = await getAvatarUrls(rows.map((r) => r.wcaId));
  return rows.map((r) => ({
    avatarUrl: avatars.get(r.wcaId) ?? null,
    wcaId: r.wcaId,
    name: r.name,
    countryIso2: r.countryIso2,
    wpsScore: r.wpsScore ?? 0,
    wpsRank: r.wpsRank,
  }));
}

export async function getMetaValue(key: string): Promise<string | null> {
  const meta = await prisma.meta.findUnique({ where: { key } });
  return meta?.value ?? null;
}

export async function getMetaValues(keys: string[]): Promise<Record<string, string | undefined>> {
  const rows = await prisma.meta.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
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
