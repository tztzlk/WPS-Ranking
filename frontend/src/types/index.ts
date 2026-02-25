// Frontend Types for WPS Ranking

export interface LeaderboardEntry {
  rank: number;
  wcaId: string;
  name: string;
  country: string;
  wpsScore: number;
  totalEvents: number;
}

export interface WPSProfile {
  wcaId: string;
  name: string;
  country: string;
  wpsScore: number;
  globalRank: number;
  eventScores: Record<string, number>;
  eventRanks: Record<string, number>;
  totalEvents: number;
  lastUpdated: string;
}

export interface SearchResult {
  wcaId: string;
  name: string;
  country: string;
  wpsScore: number;
  globalRank: number;
}

export interface AboutData {
  title: string;
  description: string;
  formula: {
    description: string;
    calculation: string;
    normalization: string;
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

// Country flags mapping (simplified)
export const COUNTRY_FLAGS: Record<string, string> = {
  'USA': '🇺🇸',
  'CHN': '🇨🇳',
  'JPN': '🇯🇵',
  'KOR': '🇰🇷',
  'DEU': '🇩🇪',
  'FRA': '🇫🇷',
  'GBR': '🇬🇧',
  'CAN': '🇨🇦',
  'AUS': '🇦🇺',
  'BRA': '🇧🇷',
  'IND': '🇮🇳',
  'RUS': '🇷🇺',
  'POL': '🇵🇱',
  'NLD': '🇳🇱',
  'ITA': '🇮🇹',
  'ESP': '🇪🇸',
  'SWE': '🇸🇪',
  'NOR': '🇳🇴',
  'FIN': '🇫🇮',
  'DNK': '🇩🇰',
};
