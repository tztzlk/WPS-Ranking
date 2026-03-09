import { Router, Request, Response } from 'express';
import {
  getGlobalLeaderboard,
  getCountryLeaderboard,
  LeaderboardResponse,
} from '../services/leaderboardCache';

const router = Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * GET /api/leaderboard
 * Query: country (optional, ISO2), limit (default 100).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const country = typeof req.query.country === 'string' ? req.query.country.trim() : undefined;
    const limitRaw = req.query.limit;
    const limit = Math.min(
      Math.max(1, typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const validLimit = Number.isFinite(limit) ? limit : DEFAULT_LIMIT;

    let data: LeaderboardResponse | null;

    if (!country) {
      data = await getGlobalLeaderboard(validLimit);
      if (!data) {
        res.status(503).json({
          error: 'Leaderboard data unavailable',
        });
        return;
      }
    } else {
      data = await getCountryLeaderboard(country, validLimit);
      if (!data) {
        res.status(503).json({
          error: 'Country leaderboard unavailable',
        });
        return;
      }
    }

    const countryLog = country && country.length > 0 ? country : 'GLOBAL';
    console.log(`[db-leaderboard] country=${countryLog} count=${data.count}`);
    res.json(data);
  } catch (error) {
    console.error('Error serving leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRoutes };
