import { Router } from 'express';
import {
  getProfileByPersonId,
  getProfileBreakdownByPersonId,
  ProfileCacheResult,
} from '../services/profileFromCache';
import { getCountryRank } from '../services/leaderboardCache';
import { LRUCache } from '../utils/lruCache';

const router = Router();

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

function includeBreakdown(req: { query: Record<string, unknown> }): boolean {
  const v = req.query.includeBreakdown;
  return v === '1' || v === 'true';
}

// Caches the full enriched response (person + WPS + country rank + optional breakdown).
const profileResponseCache = new LRUCache<string, object | null>(500);

router.get('/', async (req, res) => {
  const personId = (req.query.personId as string)?.trim();
  if (!personId) {
    res.status(400).json({ error: 'personId query parameter is required' });
    return;
  }
  if (!isValidWCAId(personId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const response = await buildProfileResponse(personId, includeBreakdown(req));
  if (!response) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(response);
});

router.get('/:wcaId', async (req, res) => {
  const wcaId = req.params.wcaId?.trim();
  if (!wcaId || !isValidWCAId(wcaId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const response = await buildProfileResponse(wcaId, includeBreakdown(req));
  if (!response) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(response);
});

/**
 * Build full profile response (with country rank). Used by profile and compare routes.
 */
export async function buildProfileResponse(
  personId: string,
  withBreakdown: boolean,
) {
  const cacheKey = `${personId}:${withBreakdown ? '1' : '0'}`;
  const cached = profileResponseCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const profile = await getProfileByPersonId(personId);
  if (!profile) {
    profileResponseCache.set(cacheKey, null);
    return null;
  }

  const result = await toProfileResponse(profile, withBreakdown);
  profileResponseCache.set(cacheKey, result);
  return result;
}

async function toProfileResponse(profile: ProfileCacheResult, withBreakdown: boolean) {
  const countryRankData =
    profile.countryIso2 != null
      ? await getCountryRank(profile.personId, profile.countryIso2)
      : null;

  const base = {
    personId: profile.personId,
    name: profile.name,
    countryId: profile.countryId,
    countryName: profile.countryName,
    countryIso2: profile.countryIso2,
    wps: profile.wps,
    globalWpsRank: profile.globalWpsRank,
    totalRanked: profile.totalRanked,
    countryRank: countryRankData?.countryRank ?? null,
    countryTotal: countryRankData?.countryTotal ?? null,
    generatedAt: profile.generatedAt,
    wcaId: profile.personId,
    country: profile.countryName ?? profile.countryId ?? '',
    wpsScore: profile.wps,
    globalRank: profile.globalWpsRank ?? 0,
    eventScores: {} as Record<string, number>,
    eventRanks: {} as Record<string, number>,
    totalEvents: 0,
    lastUpdated: profile.generatedAt,
  };

  if (!withBreakdown) return base;

  const breakdownData = await getProfileBreakdownByPersonId(profile.personId);
  if (!breakdownData) {
    return {
      ...base,
      calculation: null,
      breakdown: [],
    };
  }

  const { sumEventScores, maxPossible, eventsParticipated, breakdown } = breakdownData;
  const eventScores: Record<string, number> = {};
  const eventRanks: Record<string, number> = {};
  breakdown.forEach((b) => {
    eventScores[b.eventId] = b.eventScore;
    eventRanks[b.eventId] = b.worldRank;
  });

  return {
    ...base,
    totalEvents: eventsParticipated,
    eventScores,
    eventRanks,
    calculation: {
      sumEventScores,
      maxPossible,
      eventsParticipated,
    },
    breakdown,
  };
}

export { router as profileRoutes };
