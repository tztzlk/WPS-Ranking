/** Search API: one item in the results array */
export interface SearchResultItem {
  wcaId: string;
  name: string;
  countryIso2: string | null;
  wpsScore: number;
  wpsRank: number | null;
  avatarUrl?: string | null;
}

/** Profile API response */
export interface ProfileResponse {
  wcaId: string;
  name: string;
  countryName: string | null;
  countryIso2: string | null;
  wpsScore: number;
  globalWpsRank: number | null;
  totalRanked: number;
  countryRank: number | null;
  countryTotal: number | null;
  lastUpdated: string;
}

export const EVENT_WEIGHTS: Record<string, number> = {
  '333': 1.0,
  '222': 0.85,
  '444': 0.6,
  '555': 0.5,
  '666': 0.35,
  '777': 0.3,
  '333bf': 0.2,
  '333fm': 0.2,
  '333oh': 0.6,
  'clock': 0.45,
  'minx': 0.45,
  'pyram': 0.75,
  'skewb': 0.65,
  'sq1': 0.4,
  '444bf': 0.12,
  '555bf': 0.1,
  '333mbf': 0.15,
};

/**
 * Events scored by the WCA ranking by single instead of by average. In these
 * events most people never get an average (3 successful blindfolded attempts
 * in one round, or 3 FMC attempts), and Multi-Blind has no average at all.
 */
export const SINGLE_RANKED_EVENTS: readonly string[] = ['333bf', '444bf', '555bf', '333mbf', '333fm'];

export type RankType = 'single' | 'average';

export function rankTypeOf(eventId: string): RankType {
  return SINGLE_RANKED_EVENTS.includes(eventId) ? 'single' : 'average';
}

/** WCA continent id (countries export) -> short code and display name. */
export const CONTINENTS: Record<string, { code: string; name: string }> = {
  _Africa: { code: 'AF', name: 'Africa' },
  _Asia: { code: 'AS', name: 'Asia' },
  _Europe: { code: 'EU', name: 'Europe' },
  '_North America': { code: 'NA', name: 'North America' },
  _Oceania: { code: 'OC', name: 'Oceania' },
  '_South America': { code: 'SA', name: 'South America' },
};

export function continentByCode(code: string): { code: string; name: string } | undefined {
  const upper = code.trim().toUpperCase();
  return Object.values(CONTINENTS).find((c) => c.code === upper);
}

/** Country ranking: average WPS of the country's best N cubers; empty places count as 0. */
export const COUNTRY_TEAM_SIZE = 10;

/** Display names for WCA events (for WPS breakdown API). */
export const EVENT_NAMES: Record<string, string> = {
  '333': '3x3 Cube',
  '222': '2x2 Cube',
  '444': '4x4 Cube',
  '555': '5x5 Cube',
  '666': '6x6 Cube',
  '777': '7x7 Cube',
  '333bf': '3x3 Blindfolded',
  '333fm': '3x3 Fewest Moves',
  '333oh': '3x3 One-Handed',
  'clock': 'Clock',
  'minx': 'Megaminx',
  'pyram': 'Pyraminx',
  'skewb': 'Skewb',
  'sq1': 'Square-1',
  '444bf': '4x4 Blindfolded',
  '555bf': '5x5 Blindfolded',
  '333mbf': '3x3 Multi-Blind',
};

/**
 * WPS v3 (v2 formula; BLD/FMC by single, MBLD added). The pipeline computes the same formula in SQL (pipeline/publish.ts).
 *
 *   eventScore(e) = w_e * (1 - ln(R_e) / ln(N_e + 1))
 *     R_e = world rank in e (by average, or by single for SINGLE_RANKED_EVENTS),
 *     N_e = people in that ranking of e.
 *     Rank 1 -> w_e, last place -> ~0: a rank counts relative to the size of the field,
 *     and merely having a result is worth nothing.
 *   WPS = 100 * (sum of all event scores) / MAX_WPS_SCORE
 *     An all-around score: every event adds to it, but only by how well you rank in it.
 */

/** World rank 1 in every event. Fixed, so scores stay comparable over time. */
export const MAX_WPS_SCORE = Object.values(EVENT_WEIGHTS).reduce((sum, w) => sum + w, 0);

export function eventScore(weight: number, worldRank: number, participants: number): number {
  if (participants < 1 || worldRank < 1) return 0;
  return Math.max(0, weight * (1 - Math.log(worldRank) / Math.log(participants + 1)));
}
