// Frontend Types for WPS Ranking

export interface WPSProfile {
  wcaId: string;
  name: string;
  countryIso2?: string;
  countryName?: string;
  wpsScore: number;
  globalWpsRank?: number | null;
  totalRanked?: number;
  countryRank?: number | null;
  countryTotal?: number | null;
  lastUpdated?: string;
}

export interface SearchResult {
  wcaId: string;
  name: string;
  countryIso2?: string;
  wpsScore: number;
  wpsRank?: number | null;
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

/** Cached Top-100 leaderboard from GET /api/leaderboard */
export interface LeaderboardCacheItem {
  rank?: number;
  countryRank?: number;
  personId: string;
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
  wps: number;
  globalWpsRank?: number;
}

export interface LeaderboardCacheResponse {
  scope: 'global' | 'country';
  generatedAt: string;
  count: number;
  totalRanked?: number;
  countryIso2?: string;
  countryName?: string;
  source?: string;
  items: LeaderboardCacheItem[];
}

/** WPS breakdown per event (GET /api/cuber/:id/wps-breakdown). */
export interface WpsBreakdownEvent {
  eventId: string;
  eventName: string;
  weight: number;
  worldRank: number;
  eventScore: number;
}

export interface WpsBreakdownResponse {
  personId: string;
  events: WpsBreakdownEvent[];
  wps: number;
}

/** Profile history for WPS progress chart (GET /api/profile/:wcaId/history). */
export interface ProfileHistoryItem {
  date: string;
  wps: number;
  globalRank: number;
  countryRank: number | null;
}

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
