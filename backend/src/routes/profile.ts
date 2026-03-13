import { Router } from 'express';
import { findPersonById, toProfileResponse, isValidWCAId, getMetaValue } from '../services/personDb';
import { getCountryRank } from '../services/leaderboardCache';
import { getProfileHistory } from '../services/historySnapshot';
import type { ProfileResponse } from '../types';

const router = Router();

router.get('/:id/history', async (req, res) => {
  const id = (req.params.id ?? '').trim().toUpperCase();
  if (!id || !isValidWCAId(id)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const history = await getProfileHistory(id);
  res.json({ history });
});

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
  const response = await getProfileByWcaId(personId);
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
  const response = await getProfileByWcaId(wcaId);
  if (!response) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(response);
});

export async function getProfileByWcaId(wcaId: string): Promise<ProfileResponse | null> {
  const person = await findPersonById(wcaId);
  if (!person) return null;

  const [totalRankedRaw, generatedAt, countryRankData] = await Promise.all([
    getMetaValue('totalRanked'),
    getMetaValue('generatedAt'),
    person.countryIso2
      ? getCountryRank(person.id, person.countryIso2)
      : Promise.resolve(null),
  ]);

  const totalRanked = totalRankedRaw != null ? Math.max(0, Math.floor(Number(totalRankedRaw)) || 0) : 0;

  return toProfileResponse(person, {
    totalRanked,
    countryRank: countryRankData?.countryRank ?? null,
    countryTotal: countryRankData?.countryTotal ?? null,
    lastUpdated: generatedAt ?? new Date().toISOString(),
  });
}

export { router as profileRoutes };
