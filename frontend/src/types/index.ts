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
  eventWeights: Record<string, number>;
  /** People in each event's ranking (size of the field). */
  eventParticipants: Record<string, number>;
  /** Events scored by the ranking by single; the rest use the ranking by average. */
  singleRankedEvents: string[];
  /** Country ranking: number of best cubers averaged. */
  countryTeamSize: number;
  maxScore: number;
  generatedAt: string | null;
}

/** Cached Top-100 leaderboard from GET /api/leaderboard */
export interface LeaderboardCacheItem {
  rank?: number;
  countryRank?: number;
  continentRank?: number;
  personId: string;
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
  wps: number;
  globalWpsRank?: number;
  rankChange: number | null;
}

export interface LeaderboardCacheResponse {
  scope: 'global' | 'country' | 'continent';
  generatedAt: string;
  count: number;
  totalRanked?: number;
  /** Global scope only. */
  totalCountries?: number;
  countryIso2?: string;
  countryName?: string;
  continent?: string;
  continentName?: string;
  source?: string;
  items: LeaderboardCacheItem[];
  biggestMoversUp: LeaderboardCacheItem[];
  biggestMoversDown: LeaderboardCacheItem[];
}

export interface CountryListItem {
  iso2: string;
  name: string;
}

/** WPS breakdown per event (GET /api/cuber/:id/wps-breakdown). */
export interface WpsBreakdownEvent {
  eventId: string;
  eventName: string;
  weight: number;
  rankType: RankType;
  worldRank: number;
  /** People in that ranking of the event. */
  participants: number;
  /** Contribution to WPS in points; all events sum to `wps`. */
  eventScore: number;
}

export type RankType = 'single' | 'average';

/** What WPS would gain if the cuber reached their typical level in an event. */
export interface WpsPotentialItem {
  eventId: string;
  eventName: string;
  rankType: RankType;
  /** null = no result in this event yet. */
  worldRank: number | null;
  targetRank: number;
  participants: number;
  gain: number;
}

export interface WpsBreakdownResponse {
  personId: string;
  events: WpsBreakdownEvent[];
  wps: number;
  /** Median rank / field size over the cuber's events, e.g. 0.05 = top 5%. */
  typicalShare?: number;
  potential?: WpsPotentialItem[];
}

export interface CountryRankingItem {
  rank: number;
  iso2: string;
  name: string;
  continent: string | null;
  teamScore: number;
  rankedCount: number;
  best: { personId: string; name: string; wps: number } | null;
}

export interface CountryRankingResponse {
  generatedAt: string;
  teamSize: number;
  items: CountryRankingItem[];
}

export const CONTINENTS: { code: string; name: string }[] = [
  { code: 'AF', name: 'Africa' },
  { code: 'AS', name: 'Asia' },
  { code: 'EU', name: 'Europe' },
  { code: 'NA', name: 'North America' },
  { code: 'OC', name: 'Oceania' },
  { code: 'SA', name: 'South America' },
];

/** Number of events in WPS. Keep in sync with EVENT_WEIGHTS in the backend. */
export const SCORED_EVENT_COUNT = 17;

/** Profile history for WPS progress chart (GET /api/profile/:wcaId/history). */
export interface ProfileHistoryItem {
  date: string;
  wps: number;
  globalRank: number;
  countryRank: number | null;
}

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
