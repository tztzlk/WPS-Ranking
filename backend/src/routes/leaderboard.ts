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
 * Query: country (optional, ISO2 e.g. KZ), limit (default 100).
 * - No country: returns global cached top-100 (from leaderboard.top100.json).
 * - With country: returns top N for that country from all ranked (persons + wps + wpsRank indexes).
 */
router.get('/', (req: Request, res: Response) => {
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
      data = getGlobalLeaderboard(validLimit);
      if (!data) {
        res.status(503).json({
          error: 'Leaderboard cache not generated. Run npm run leaderboard:update',
        });
        return;
      }
    } else {
      data = getCountryLeaderboard(country, validLimit);
      if (!data) {
        res.status(503).json({
          error: 'Leaderboard indexes not available. Run npm run leaderboard:update',
        });
        return;
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Error serving leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRoutes };
