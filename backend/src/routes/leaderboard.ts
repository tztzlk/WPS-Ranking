import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import {
  getGlobalLeaderboard,
  getCountryLeaderboard,
  getContinentLeaderboard,
  LeaderboardResponse,
} from '../services/leaderboard';

const router = Router();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const PAGE_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

function applyConditionalJsonCache(
  req: Request,
  res: Response,
  payload: LeaderboardResponse,
): boolean {
  const etag = `"${crypto
    .createHash('sha1')
    .update(JSON.stringify(payload))
    .digest('hex')}"`;

  res.setHeader('Cache-Control', PAGE_CACHE_CONTROL);
  res.setHeader('ETag', etag);
  res.setHeader('Vary', 'Accept-Encoding');

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return true;
  }

  return false;
}

function getLeaderboardParams(req: Request): { country?: string; continent?: string; limit: number } {
  const countryParam = typeof req.query.country === 'string' ? req.query.country.trim() : '';
  const country = countryParam.length > 0 ? countryParam : undefined;
  const continentParam = typeof req.query.continent === 'string' ? req.query.continent.trim() : '';
  const continent = continentParam.length > 0 ? continentParam : undefined;

  const limitRaw = req.query.limit;
  const parsedLimit =
    typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  const boundedLimit = Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, boundedLimit), MAX_LIMIT);

  return { country, continent, limit };
}

/**
 * GET /api/leaderboard
 * Query: country (ISO2) or continent (AF, AS, EU, NA, OC, SA), both optional; limit (default 100).
 */
router.get('/', async (req: Request, res: Response) => {
  const startedAt = Date.now();

  try {
    const { country, continent, limit } = getLeaderboardParams(req);

    let data: LeaderboardResponse | null = null;

    if (country) {
      data = await getCountryLeaderboard(country, limit);
    } else if (continent) {
      data = await getContinentLeaderboard(continent, limit);
    } else {
      data = await getGlobalLeaderboard(limit);
    }

    const countryLog = country ?? (continent ? `continent:${continent}` : 'GLOBAL');
    const durationMs = Date.now() - startedAt;

    if (res.headersSent) {
      console.warn(
        `[leaderboard] response already sent before handler completion (country=${countryLog}, durationMs=${durationMs})`
      );
      return;
    }

    if (!data) {
      console.warn(
        `[leaderboard] no data available (country=${countryLog}, limit=${limit}, durationMs=${durationMs})`
      );
      return res.status(503).json({
        error: country
          ? 'Country leaderboard unavailable'
          : continent
            ? 'Continent leaderboard unavailable'
            : 'Leaderboard data unavailable',
      });
    }

    console.log(
      `[leaderboard] completed (country=${countryLog}, limit=${limit}, count=${data.count}, durationMs=${durationMs})`
    );

    if (applyConditionalJsonCache(req, res, data)) {
      return;
    }
    return res.status(200).json(data);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('[leaderboard] error serving leaderboard', {
      country: typeof req.query.country === 'string' ? req.query.country : undefined,
      limit: req.query.limit,
      durationMs,
      headersSent: res.headersSent,
      error,
    });

    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    return;
  }
});

export { router as leaderboardRoutes };
