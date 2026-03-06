/** Search API: one item in the results array */
export interface SearchResultItem {
  id: string;
  name: string;
  countryIso2: string | null;
  wpsScore: number;
  wpsRank: number | null;
}

/** Profile API response */
export interface ProfileResponse {
  id: string;
  name: string;
  countryName: string | null;
  countryIso2: string | null;
  wpsScore: number;
  wpsRank: number | null;
}

// WPS Event Weights (based on popularity and difficulty)
export const EVENT_WEIGHTS: Record<string, number> = {
  '333': 1.0,      // 3x3x3 Cube - baseline
  '222': 0.8,      // 2x2x2 Cube
  '444': 0.9,      // 4x4x4 Cube
  '555': 0.9,      // 5x5x5 Cube
  '666': 0.7,      // 6x6x6 Cube
  '777': 0.7,      // 7x7x7 Cube
  '333bf': 0.6,    // 3x3x3 Blindfolded
  '333fm': 0.5,    // 3x3x3 Fewest Moves
  '333oh': 0.8,    // 3x3x3 One-Handed
  'clock': 0.6,    // Clock
  'minx': 0.7,     // Megaminx
  'pyram': 0.7,    // Pyraminx
  'skewb': 0.7,    // Skewb
  'sq1': 0.6,      // Square-1
  '444bf': 0.4,    // 4x4x4 Blindfolded
  '555bf': 0.3,    // 5x5x5 Blindfolded
  '333mbf': 0.3,   // 3x3x3 Multi-Blind
};

/** MAX = Σ (w_e × (1/ln(2)) × 10). Matches EventScore when R_e = 1 for all events. */
export const MAX_WPS_SCORE = Object.values(EVENT_WEIGHTS).reduce(
  (sum, w) => sum + w * (1 / Math.log(2)) * 10,
  0,
);
