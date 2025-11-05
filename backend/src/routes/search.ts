import { Router } from 'express';
import { getDb } from '../db';
import { SearchResult } from '../types';

const router = Router();

/**
 * GET /api/search
 * Search for cubers by name or wcaId, case-insensitive
 */
router.get('/', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const prisma = await getDb();
    const searchLimit = Math.min(parseInt(limit as string) || 10, 10); // Max 10 results

    // Search by WCA ID first (exact match, case-insensitive)
    let results = await prisma.persons.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { id: isNaN(parseInt(query)) ? undefined : parseInt(query) }
        ]
      },
      include: {
        ranksAverage: {
          include: {
            event: true
          }
        }
      },
      take: searchLimit,
      orderBy: {
        name: 'asc'
      }
    });

    // If no results and query looks like WCA ID format, try searching by ID
    if (results.length === 0 && /^\d{4}[A-Z]{4}\d{2}$/.test(query)) {
      const wcaIdMatch = await prisma.persons.findFirst({
        where: { id: parseInt(query.replace(/\D/g, '')) || 0 },
        include: {
          ranksAverage: {
            include: {
              event: true
            }
          }
        }
      });
      if (wcaIdMatch) {
        results = [wcaIdMatch];
      }
    }

    // Transform results to match expected format
    const searchResults: SearchResult[] = results.map((person: any) => {
      // Calculate a simple WPS-like score based on average ranks
      const avgRank = person.ranksAverage.length > 0 
        ? person.ranksAverage.reduce((sum: number, rank: any) => sum + rank.worldRank, 0) / person.ranksAverage.length
        : 1000;
      
      // Simple score calculation (lower is better)
      const wpsScore = Math.max(0, Math.round(100 - (avgRank / 10)));
      
      return {
        wcaId: person.id.toString(),
        name: person.name,
        country: person.countryId,
        wpsScore,
        globalRank: person.ranksAverage.length > 0 ? Math.min(...person.ranksAverage.map((r: any) => r.worldRank)) : 0
      };
    });

    res.json({
      query,
      results: searchResults,
      total: searchResults.length
    });
  } catch (error) {
    console.error('Error searching cubers:', error);
    res.status(500).json({ error: 'Failed to search cubers' });
  }
});

export { router as searchRoutes };
