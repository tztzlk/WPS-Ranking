import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface ProfileHistoryItem {
  date: string;
  wps: number;
  globalRank: number;
  countryRank: number | null;
}

const DAYS_LIMIT = 180;

/**
 * One point per published export in the last DAYS_LIMIT days.
 * WPS comes from wps_history (change log); ranks are looked up in that day's
 * rank_distribution (people strictly above that WPS + 1), world and country.
 */
export async function getProfileHistory(personId: string): Promise<ProfileHistoryItem[]> {
  const rows = await prisma.$queryRaw<
    { date: string; wpsCenti: number; globalRank: number | null; countryRank: number | null }[]
  >(Prisma.sql`
    SELECT g.snapshot_date::text AS date,
           h.wps_centi AS "wpsCenti",
           g.above[array_position(g.wps_centi, h.wps_centi)] + 1 AS "globalRank",
           c.above[array_position(c.wps_centi, h.wps_centi)] + 1 AS "countryRank"
    FROM rank_distribution g
    CROSS JOIN LATERAL (
      SELECT wps_centi FROM wps_history
      WHERE person_id = ${personId} AND valid_from <= g.snapshot_date
      ORDER BY valid_from DESC LIMIT 1
    ) h
    LEFT JOIN persons p ON p.id = ${personId}
    LEFT JOIN rank_distribution c
      ON c.snapshot_date = g.snapshot_date AND c.scope = p.country_iso2
    WHERE g.scope = '*' AND g.snapshot_date >= current_date - ${DAYS_LIMIT}::int
    ORDER BY g.snapshot_date
  `);

  return rows
    .filter((r) => r.globalRank != null)
    .map((r) => ({
      date: r.date,
      wps: r.wpsCenti / 100,
      globalRank: r.globalRank as number,
      countryRank: r.countryRank,
    }));
}
