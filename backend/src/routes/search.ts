import { Router } from 'express';
import { getProfileByPersonId } from '../services/profileFromCache';
import { searchPersons } from '../services/personLookup';
import { getWpsIndex, getWpsRankIndex } from '../services/indexStore';

const router = Router();

const WCA_ID_REGEX = /^\d{4}[A-Z]{4}\d{2}$/;

function isValidWCAId(id: string): boolean {
  return typeof id === 'string' && WCA_ID_REGEX.test(id.trim());
}

/**
 * GET /api/search?q=<query>&limit=<n>
 * GET /api/search?wcaId=<WCA_ID>
 *
 * Exact WCA ID → profile lookup.
 * Otherwise → line-by-line TSV scan for name / partial-ID matches.
 */
router.get('/', async (req, res) => {
  const start = Date.now();
  try {
    const q = ((req.query.wcaId as string) ?? (req.query.q as string))?.trim();
    if (!q) {
      res.status(400).json({ error: 'wcaId or q query parameter is required' });
      return;
    }

    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === 'string' ? Math.min(Math.max(1, parseInt(limitRaw, 10) || 20), 100) : 20;

    if (isValidWCAId(q)) {
      const profile = await getProfileByPersonId(q);
      if (!profile) {
        res.status(404).json({ error: 'Person not found' });
        return;
      }
      res.json({
        totalRanked: profile.totalRanked,
        results: [{
          wcaId: profile.personId,
          name: profile.name,
          country: profile.countryName ?? profile.countryId ?? '',
          countryIso2: profile.countryIso2,
          countryName: profile.countryName,
          wpsScore: profile.wps,
          globalWpsRank: profile.globalWpsRank,
          globalRank: profile.globalWpsRank ?? 0,
          totalRanked: profile.totalRanked,
        }],
      });
      return;
    }

    const persons = await searchPersons(q, limit);
    const wpsIdx = getWpsIndex();
    const rankData = getWpsRankIndex();
    const totalRanked = rankData?.totalRanked ?? 0;

    const results = persons.map((p) => {
      const wps = wpsIdx[p.personId]?.wps ?? 0;
      const globalWpsRank = rankData?.ranks?.[p.personId] ?? null;
      return {
        wcaId: p.personId,
        name: p.name,
        country: p.countryName ?? p.countryId ?? '',
        countryIso2: p.countryIso2,
        countryName: p.countryName,
        wpsScore: wps,
        globalWpsRank,
        globalRank: globalWpsRank ?? 0,
        totalRanked,
      };
    });

    res.json({ totalRanked, results });
  } catch (err) {
    console.error('[search] error:', err);
    res.status(500).json({ error: 'Search failed' });
  } finally {
    console.log(`[search] ${Date.now() - start}ms`);
  }
});

export { router as searchRoutes };
