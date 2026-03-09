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
    const countryParam =
      typeof req.query.country === 'string' ? req.query.country.trim() : '';
    const country = countryParam.length > 0 ? countryParam : undefined;

    const limitRaw = req.query.limit;
    const parsedLimit =
      typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
    const boundedLimit = Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, boundedLimit), MAX_LIMIT);

    let data: LeaderboardResponse | null = null;

    if (!country) {
      data = await getGlobalLeaderboard(limit);
    } else {
      data = await getCountryLeaderboard(country, limit);
    }

    if (res.headersSent) {
      const countryLog = country && country.length > 0 ? country : 'GLOBAL';
      console.warn(
        `[leaderboard] response already sent before handler completion (country=${countryLog})`
      );
      return;
    }

    if (!data) {
      return res.status(503).json({
        error: country ? 'Country leaderboard unavailable' : 'Leaderboard data unavailable',
      });
    }

    const countryLog = country && country.length > 0 ? country : 'GLOBAL';
    console.log(`[db-leaderboard] country=${countryLog} count=${data.count}`);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error serving leaderboard:', error);

    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    return;
  }
});

export { router as leaderboardRoutes };
