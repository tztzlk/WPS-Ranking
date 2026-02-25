// Frontend Types for WPS Ranking

export interface LeaderboardEntry {
  rank: number;
  wcaId: string;
  name: string;
  country: string;
  countryIso2?: string;
  countryName?: string;
  wpsScore: number;
  totalEvents: number;
}

export interface WPSProfileCalculation {
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
}

export interface WPSProfileBreakdownItem {
  eventId: string;
  worldRank: number;
  weight: number;
  eventScore: number;
}

export interface WPSProfile {
  wcaId: string;
  name: string;
  country: string;
  countryIso2?: string;
  countryName?: string;
  wpsScore: number;
  /** World position by WPS (1-based). Same as globalRank when present. */
  globalWpsRank?: number | null;
  globalRank: number;
  /** Total number of people in the global WPS ranking (M). */
  totalRanked?: number;
  eventScores: Record<string, number>;
  eventRanks: Record<string, number>;
  totalEvents: number;
  lastUpdated: string;
  /** Present when requested with includeBreakdown=1 */
  calculation?: WPSProfileCalculation | null;
  /** Present when requested with includeBreakdown=1 */
  breakdown?: WPSProfileBreakdownItem[];
}

export interface SearchResult {
  wcaId: string;
  name: string;
  country: string;
  countryIso2?: string;
  countryName?: string;
  wpsScore: number;
  /** World position by WPS (1-based). */
  globalWpsRank?: number | null;
  globalRank: number;
  /** Total number of people in the global WPS ranking (M). */
  totalRanked?: number;
}

export interface AboutData {
  title: string;
  description: string;
  formula: {
    description: string;
    calculation: string;
    normalization: string;
    intro?: string;
    steps?: string[];
    formulaBlock?: string;
    variables?: { label: string; meaning: string }[];
    credits?: string;
  };
  philosophy: {
    fairness: string;
    versatility: string;
    transparency: string;
  };
  eventWeights: Record<string, number>;
  maxScore: number;
  features: string[];
  benefits: string[];
}

export interface ApiResponse<T> {
  data?: T;
  results?: T[];
  total?: number;
  offset?: number;
  limit?: number;
  error?: string;
  query?: string;
}

/** Cached Top-100 leaderboard from GET /api/leaderboard */
export interface LeaderboardCacheItem {
  rank: number;
  personId: string;
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
  wps: number;
}

export interface LeaderboardCacheResponse {
  source: string;
  generatedAt: string;
  count: number;
  items: LeaderboardCacheItem[];
}

// Event names mapping
export const EVENT_NAMES: Record<string, string> = {
  '333': '3x3x3 Cube',
  '222': '2x2x2 Cube',
  '444': '4x4x4 Cube',
  '555': '5x5x5 Cube',
  '666': '6x6x6 Cube',
  '777': '7x7x7 Cube',
  '333bf': '3x3x3 Blindfolded',
  '333fm': '3x3x3 Fewest Moves',
  '333oh': '3x3x3 One-Handed',
  'clock': 'Clock',
  'minx': 'Megaminx',
  'pyram': 'Pyraminx',
  'skewb': 'Skewb',
  'sq1': 'Square-1',
  '444bf': '4x4x4 Blindfolded',
  '555bf': '5x5x5 Blindfolded',
  '333mbf': '3x3x3 Multi-Blind',
};

