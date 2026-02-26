import fs from 'fs';
import path from 'path';
import { getCacheDir } from '../utils/cachePath';

const CACHE_DIR = getCacheDir();
const PERSONS_INDEX_PATH = path.join(CACHE_DIR, 'persons.index.json');
const WPS_INDEX_PATH = path.join(CACHE_DIR, 'wps.index.json');
const WPS_RANK_INDEX_PATH = path.join(CACHE_DIR, 'wpsRank.index.json');
const WPS_BREAKDOWN_PATH = path.join(CACHE_DIR, 'wps.breakdown.json');
const LEADERBOARD_CACHE_PATH = path.join(CACHE_DIR, 'leaderboard.top100.json');

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
  try {
    if (fs.existsSync(LEADERBOARD_CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(LEADERBOARD_CACHE_PATH, 'utf8'));
      if (data.generatedAt) return data.generatedAt;
    }
  } catch {
    // ignore
  }
  return new Date().toISOString();
}

/**
 * Look up profile by WCA ID from cache files. Returns null if person not found.
 */
export function getProfileByPersonId(personId: string): ProfileCacheResult | null {
  const normalizedId = personId?.trim();
  if (!normalizedId) return null;

  if (!fs.existsSync(PERSONS_INDEX_PATH)) {
    console.error(`[profileFromCache] Missing cache file: ${PERSONS_INDEX_PATH}`);
    return null;
  }
  const personsIndex: Record<string, { name: string; countryId?: string; countryName?: string; countryIso2?: string }> = JSON.parse(
    fs.readFileSync(PERSONS_INDEX_PATH, 'utf8')
  );
  const person = personsIndex[normalizedId];
  if (!person) return null;

  let wps = 0;
  if (fs.existsSync(WPS_INDEX_PATH)) {
    const wpsIndex: Record<string, { wps: number }> = JSON.parse(
      fs.readFileSync(WPS_INDEX_PATH, 'utf8')
    );
    const wpsEntry = wpsIndex[normalizedId];
    if (wpsEntry != null && typeof wpsEntry.wps === 'number') wps = wpsEntry.wps;
  }

  let globalWpsRank: number | null = null;
  let totalRanked = 0;
  if (fs.existsSync(WPS_RANK_INDEX_PATH)) {
    try {
      const rankData: { ranks?: Record<string, number>; totalRanked?: number } = JSON.parse(
        fs.readFileSync(WPS_RANK_INDEX_PATH, 'utf8')
      );
      const rank = rankData.ranks?.[normalizedId];
      if (typeof rank === 'number' && rank >= 1) globalWpsRank = rank;
      if (typeof rankData.totalRanked === 'number' && rankData.totalRanked >= 0) {
        totalRanked = rankData.totalRanked;
      } else if (rankData.ranks && typeof rankData.ranks === 'object') {
        totalRanked = Object.keys(rankData.ranks).length;
      }
    } catch {
      // ignore
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

/** Load WPS breakdown for a person from cache. Returns null if not found or file missing. */
export function getProfileBreakdownByPersonId(personId: string): ProfileBreakdown | null {
  const normalizedId = personId?.trim();
  if (!normalizedId) return null;
  if (!fs.existsSync(WPS_BREAKDOWN_PATH)) {
    console.error(`[profileFromCache] Missing cache file: ${WPS_BREAKDOWN_PATH}`);
    return null;
  }
  try {
    const data: Record<string, ProfileBreakdown> = JSON.parse(
      fs.readFileSync(WPS_BREAKDOWN_PATH, 'utf8')
    );
    return data[normalizedId] ?? null;
  } catch {
    return null;
  }
}
