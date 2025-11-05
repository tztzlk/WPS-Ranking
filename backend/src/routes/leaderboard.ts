import { Router } from 'express';
import { getDb } from '../db';

const router = Router();

/**
 * GET /api/leaderboard
 * Get top 100 competitors for a given event (default "333") from RanksAverage
 */
router.get('/', async (req, res) => {
  try {
    const { event = '333', limit = 100 } = req.query;
    const prisma = await getDb();
    const maxLimit = Math.min(parseInt(limit as string) || 100, 100); // Max 100 results

    const rankings = await prisma.ranksAverage.findMany({
      where: {
        eventId: event as string
      },
      include: {
        person: true
      },
      orderBy: {
        worldRank: 'asc'
      },
      take: maxLimit
    });

    const leaderboard = rankings.map((rank: any, index: number) => ({
      rank: index + 1,
      name: rank.person.name,
      wcaId: rank.person.id.toString(),
      country: rank.person.countryId,
      best: rank.best / 100, // Convert centiseconds to seconds
      worldRank: rank.worldRank
    }));

    res.json({
      data: leaderboard,
      total: leaderboard.length,
      event: event,
      limit: maxLimit
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRoutes };