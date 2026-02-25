import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const LEADERBOARD_CACHE_PATH = path.resolve(__dirname, '../../cache/leaderboard.top100.json');

/**
 * GET /api/leaderboard
 * Returns the offline-computed Top-100 WPS leaderboard from cache.
 * If cache is missing, returns 503 with instructions to run npm run leaderboard:update.
 */
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(LEADERBOARD_CACHE_PATH)) {
      res.status(503).json({
        error: 'Leaderboard cache not generated. Run npm run leaderboard:update',
      });
      return;
    }
    const data = fs.readFileSync(LEADERBOARD_CACHE_PATH, 'utf8');
    const json = JSON.parse(data);
    res.json(json);
  } catch (error) {
    console.error('Error reading leaderboard cache:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRoutes };