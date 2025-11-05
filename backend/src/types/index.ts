// WPS Scoring System Types and Interfaces

export interface WCAEvent {
  id: string;
  name: string;
  rank: number;
  format: string;
  cellName: string;
}

export interface WCAPerson {
  id: string;
  subid: number;
  name: string;
  countryId: string;
  gender: string;
  competitionCount: number;
  personalRecords: Record<string, WCARecord>;
}

export interface WCARecord {
  single: number | null;
  average: number | null;
  best: number | null;
  worldRank: number | null;
  continentRank: number | null;
  countryRank: number | null;
  type: string;
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

export interface LeaderboardEntry {
  rank: number;
  wcaId: string;
  name: string;
  country: string;
  wpsScore: number;
  totalEvents: number;
}

export interface SearchResult {
  wcaId: string;
  name: string;
  country: string;
  wpsScore: number;
  globalRank: number;
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

// Maximum possible WPS score (sum of all weights)
export const MAX_WPS_SCORE = Object.values(EVENT_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
