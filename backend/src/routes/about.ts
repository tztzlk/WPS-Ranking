import { Router } from 'express';
import { COUNTRY_TEAM_SIZE, EVENT_WEIGHTS, MAX_WPS_SCORE, SINGLE_RANKED_EVENTS } from '../types';
import { getMetaValues } from '../services/personDb';
import { asyncRoute } from '../lib/asyncRoute';

const router = Router();

/**
 * GET /api/about
 * Formula constants for the About page. The copy itself lives in the frontend.
 */
router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const meta = await getMetaValues(['eventParticipants', 'generatedAt']);
    let eventParticipants: Record<string, number> = {};
    try {
      eventParticipants = meta.eventParticipants ? JSON.parse(meta.eventParticipants) : {};
    } catch {
      eventParticipants = {};
    }

    res.json({
      eventWeights: EVENT_WEIGHTS,
      eventParticipants,
      singleRankedEvents: SINGLE_RANKED_EVENTS,
      countryTeamSize: COUNTRY_TEAM_SIZE,
      maxScore: Math.round(MAX_WPS_SCORE * 100) / 100,
      generatedAt: meta.generatedAt ?? null,
    });
  }),
);

export { router as aboutRoutes };
