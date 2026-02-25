import { Router } from 'express';
import { getProfileByPersonId, ProfileCacheResult } from '../services/profileFromCache';

const router = Router();

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

/**
 * GET /api/profile?personId=<WCA_ID>
 * GET /api/profile/:wcaId
 * Returns profile from cache: personId, name, countryId, wps, generatedAt.
 * 404 if person not found.
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
  const profile = getProfileByPersonId(personId);
  if (!profile) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(toProfileResponse(profile));
});

router.get('/:wcaId', (req, res) => {
  const wcaId = req.params.wcaId?.trim();
  if (!wcaId || !isValidWCAId(wcaId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const profile = getProfileByPersonId(wcaId);
  if (!profile) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(toProfileResponse(profile));
});

function toProfileResponse(profile: ProfileCacheResult) {
  return {
    ...profile,
    wcaId: profile.personId,
    country: profile.countryId,
    wpsScore: profile.wps,
    generatedAt: profile.generatedAt,
    globalRank: 0,
    eventScores: {},
    eventRanks: {},
    totalEvents: 0,
    lastUpdated: profile.generatedAt,
  };
}

export { router as profileRoutes };
