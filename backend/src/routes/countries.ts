import { Router, Request, Response } from 'express';
import { getCountriesList } from '../services/leaderboardCache';

const router = Router();

/**
 * GET /api/countries
 * Returns all countries present in the dataset (from persons table), sorted by name.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const list = await getCountriesList();
    if (!list.length) {
      res.status(503).json({
        error: 'Countries data not available',
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
