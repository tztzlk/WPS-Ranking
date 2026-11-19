/** Search API: one item in the results array */
export interface SearchResultItem {
  wcaId: string;
  name: string;
  countryIso2: string | null;
  wpsScore: number;
  wpsRank: number | null;
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
};

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
 * WPS v2. The pipeline computes the same formula in SQL (pipeline/publish.ts).
 *
 *   eventScore(e) = w_e * (1 - ln(R_e) / ln(N_e + 1))
 *     R_e = world rank by average, N_e = people with an average in e.
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
