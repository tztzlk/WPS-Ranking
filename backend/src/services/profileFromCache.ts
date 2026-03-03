import {
  getWpsIndex,
  getWpsRankIndex,
  getGlobalLeaderboardCache,
} from './indexStore';
import { lookupPerson } from './personLookup';
import { lookupBreakdown } from './breakdownLookup';

export interface ProfileCacheResult {
  personId: string;
  name: string;
  countryId?: string;
  countryName?: string;
  countryIso2?: string;
  wps: number;
  globalWpsRank: number | null;
  totalRanked: number;
  generatedAt: string;
}

export interface ProfileBreakdownItem {
  eventId: string;
  worldRank: number;
  weight: number;
  eventScore: number;
}

export interface ProfileCalculation {
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
}

export interface ProfileBreakdown {
  sumEventScores: number;
  maxPossible: number;
  eventsParticipated: number;
  breakdown: ProfileBreakdownItem[];
}

function getGeneratedAt(): string {
  const lb = getGlobalLeaderboardCache();
  if (lb?.generatedAt) return lb.generatedAt;
  return new Date().toISOString();
}

/**
 * Look up profile by WCA ID. Streams from Persons.tsv + in-memory WPS/rank.
 */
export async function getProfileByPersonId(personId: string): Promise<ProfileCacheResult | null> {
  const normalizedId = personId?.trim().toUpperCase();
  if (!normalizedId) return null;

  const person = await lookupPerson(normalizedId);
  if (!person) return null;

  let wps = 0;
  const wpsIndex = getWpsIndex();
  const wpsEntry = wpsIndex[normalizedId];
  if (wpsEntry != null && typeof wpsEntry.wps === 'number') wps = wpsEntry.wps;

  let globalWpsRank: number | null = null;
  let totalRanked = 0;
  const rankData = getWpsRankIndex();
  if (rankData) {
    const rank = rankData.ranks?.[normalizedId];
    if (typeof rank === 'number' && rank >= 1) globalWpsRank = rank;
    if (typeof rankData.totalRanked === 'number' && rankData.totalRanked >= 0) {
      totalRanked = rankData.totalRanked;
    } else if (rankData.ranks && typeof rankData.ranks === 'object') {
      totalRanked = Object.keys(rankData.ranks).length;
    }
  }

  return {
    personId: normalizedId,
    name: person.name,
    countryId: person.countryId,
    countryName: person.countryName,
    countryIso2: person.countryIso2,
    wps,
    globalWpsRank,
    totalRanked,
    generatedAt: getGeneratedAt(),
  };
}

/** Load WPS breakdown for a person. Streams from wps.breakdown.json. */
export async function getProfileBreakdownByPersonId(personId: string): Promise<ProfileBreakdown | null> {
  const normalizedId = personId?.trim();
  if (!normalizedId) return null;
  return lookupBreakdown(normalizedId) as Promise<ProfileBreakdown | null>;
}
