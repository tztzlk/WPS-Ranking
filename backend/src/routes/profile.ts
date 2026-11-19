import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { findPersonById, toProfileResponse, isValidWCAId, getMetaValues } from '../services/personDb';
import { getProfileHistory } from '../services/history';
import type { ProfileResponse } from '../types';
import { asyncRoute } from '../lib/asyncRoute';

const router = Router();

router.get('/:id/history', asyncRoute(async (req, res) => {
  const id = (req.params.id ?? '').trim().toUpperCase();
  if (!id || !isValidWCAId(id)) {
    res.status(400).json({ error: 'Invalid WCA ID format' });
    return;
  }
  const history = await getProfileHistory(id);
  res.json({ history });
}));

router.get('/', asyncRoute(async (req, res) => {
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
}));

router.get('/:wcaId', asyncRoute(async (req, res) => {
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
}));

export async function getProfileByWcaId(wcaId: string): Promise<ProfileResponse | null> {
  const person = await findPersonById(wcaId);
  if (!person) return null;

  const [meta, country] = await Promise.all([
    getMetaValues(['totalRanked', 'generatedAt']),
    person.countryIso2 && person.countryRank != null
      ? prisma.country.findUnique({ where: { iso2: person.countryIso2 } })
      : Promise.resolve(null),
  ]);

  const totalRanked = Math.max(0, Math.floor(Number(meta.totalRanked)) || 0);

  return toProfileResponse(person, {
    totalRanked,
    countryRank: country ? person.countryRank : null,
    countryTotal: country?.rankedCount ?? null,
    lastUpdated: meta.generatedAt ?? new Date().toISOString(),
  });
}

export { router as profileRoutes };
