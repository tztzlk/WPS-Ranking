import { Router } from 'express';
import {
  getProfileByPersonId,
  getProfileBreakdownByPersonId,
  ProfileCacheResult,
} from '../services/profileFromCache';
import { getCountryRank } from '../services/leaderboardCache';

const router = Router();

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

function includeBreakdown(req: { query: Record<string, unknown> }): boolean {
  const v = req.query.includeBreakdown;
  return v === '1' || v === 'true';
}

/**
 * GET /api/profile?personId=<WCA_ID>&includeBreakdown=1
 * GET /api/profile/:wcaId?includeBreakdown=1
 * Returns profile from cache. When includeBreakdown=1, adds calculation and breakdown.
 */
router.get('/', (req, res) => {
  const personId = (req.query.personId as string)?.trim();
  if (!personId) {
    res.status(400).json({ error: 'personId query parameter is required' });
    return;
  }
  if (!isValidWCAId(personId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const response = buildProfileResponse(personId, includeBreakdown(req));
  if (!response) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(response);
});

router.get('/:wcaId', (req, res) => {
  const wcaId = req.params.wcaId?.trim();
  if (!wcaId || !isValidWCAId(wcaId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const response = buildProfileResponse(wcaId, includeBreakdown(req));
  if (!response) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(response);
});

/**
 * Build full profile response (with country rank). Used by profile and compare routes.
 * Returns null if person not found.
 */
export function buildProfileResponse(
  personId: string,
  withBreakdown: boolean
): ReturnType<typeof toProfileResponse> | null {
  const profile = getProfileByPersonId(personId);
  if (!profile) return null;
  return toProfileResponse(profile, withBreakdown);
}

function toProfileResponse(profile: ProfileCacheResult, withBreakdown: boolean) {
  const countryRankData =
    profile.countryIso2 != null
      ? getCountryRank(profile.personId, profile.countryIso2)
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

  const breakdownData = getProfileBreakdownByPersonId(profile.personId);
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
