import { Router } from 'express';
import { getProfileByPersonId } from '../services/profileFromCache';

const router = Router();

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

/**
 * GET /api/search?wcaId=<WCA_ID>
 * GET /api/search?q=<WCA_ID>  (alias when q looks like WCA ID)
 * MVP: search by WCA ID only. Returns same shape as profile.
 * 404 if person not found.
 */
router.get('/', (req, res) => {
  const wcaId = ((req.query.wcaId as string) ?? (req.query.q as string))?.trim();
  if (!wcaId) {
    res.status(400).json({ error: 'wcaId or q query parameter is required' });
    return;
  }
  if (!isValidWCAId(wcaId)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const profile = getProfileByPersonId(wcaId);
  if (!profile) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json({
    totalRanked: profile.totalRanked,
    results: [{
      wcaId: profile.personId,
      name: profile.name,
      country: profile.countryName ?? profile.countryId ?? '',
      countryIso2: profile.countryIso2,
      countryName: profile.countryName,
      wpsScore: profile.wps,
      globalWpsRank: profile.globalWpsRank,
      globalRank: profile.globalWpsRank ?? 0,
      totalRanked: profile.totalRanked,
    }],
  });
});

export { router as searchRoutes };
