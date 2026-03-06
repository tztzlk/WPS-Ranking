import { Router } from 'express';
import { findPersonById, toProfileResponse, isValidWCAId } from '../services/personDb';
import type { ProfileResponse } from '../types';

const router = Router();

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
  return toProfileResponse(person);
}

export { router as profileRoutes };
