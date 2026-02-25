import { Router, Request, Response } from 'express';
import { getCountriesList } from '../services/leaderboardCache';

const router = Router();

/**
 * GET /api/countries
 * Returns all countries present in the dataset (from persons index), sorted by name.
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const list = getCountriesList();
    if (!list) {
      res.status(503).json({
        error: 'Persons index not available. Run npm run leaderboard:update',
      });
      return;
    }
    res.json(list);
  } catch (error) {
    console.error('Error serving countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

export { router as countriesRoutes };
