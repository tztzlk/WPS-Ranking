import { Router, Request, Response } from 'express';
import { getCountriesList } from '../services/leaderboardCache';

const router = Router();

/**
 * GET /api/countries
 * Returns all countries present in the dataset (from persons table), sorted by name.
 */
router.get('/', async (req: Request, res: Response) => {
  const startedAt = Date.now();

  try {
    const list = await getCountriesList();
    const durationMs = Date.now() - startedAt;
    if (!list.length) {
      console.warn('[countries] no data available', {
        durationMs,
      });
      res.status(503).json({
        error: 'Countries data not available',
      });
      return;
    }

    console.log('[countries] completed', {
      count: list.length,
      durationMs,
    });
    res.json(list);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('[countries] error serving countries', {
      method: req.method,
      url: req.originalUrl,
      durationMs,
      error,
    });
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

export { router as countriesRoutes };
