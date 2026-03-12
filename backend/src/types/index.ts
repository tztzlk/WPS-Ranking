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
  '222': 0.8,
  '444': 0.9,
  '555': 0.9,
  '666': 0.7,
  '777': 0.7,
  '333bf': 0.6,
  '333fm': 0.5,
  '333oh': 0.8,
  'clock': 0.6,
  'minx': 0.7,
  'pyram': 0.7,
  'skewb': 0.7,
  'sq1': 0.6,
  '444bf': 0.4,
  '555bf': 0.3,
  '333mbf': 0.3,
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

/** MAX = sum(w_e * (1/ln(2)) * 10). Matches EventScore when R_e = 1 for all events. */
export const MAX_WPS_SCORE = Object.values(EVENT_WEIGHTS).reduce(
  (sum, w) => sum + w * (1 / Math.log(2)) * 10,
  0,
);
