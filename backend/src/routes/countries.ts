import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { getCountriesList } from '../services/leaderboardCache';

const router = Router();
const COUNTRIES_CACHE_CONTROL = 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400';

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

    const etag = `"${crypto
      .createHash('sha1')
      .update(JSON.stringify(list))
      .digest('hex')}"`;
    res.setHeader('Cache-Control', COUNTRIES_CACHE_CONTROL);
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding');

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

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
